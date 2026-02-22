import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-helper";
import { badRequestResponse, createErrorResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-error";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const project = await db.project.findFirst({
        where: { id, userId },
      });
      if (!project) {
        return notFoundResponse("项目未找到", { translationKey: "projectApi.projectNotFound" });
      }
      return NextResponse.json({ project });
    }

    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects });
  } catch (_error: any) {
    return createErrorResponse("加载项目时出错", 500, "LOAD_PROJECTS_ERROR", _error, { translationKey: "projectApi.loadProjectsError" });
  }
}

const createProjectSchema = z.object({
  name: z.string().min(1, "名称不能为空"),
  icon: z.string().optional(),
  description: z.string().optional(),
  isMemoryGlobal: z.boolean().optional(),
  embeddingEnabled: z.boolean().optional(),
  embeddingModelId: z.string().optional(),
  embeddingDimensions: z.number().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { name, icon, description, isMemoryGlobal, embeddingEnabled, embeddingModelId, embeddingDimensions } = result.data;

    const project = await db.project.create({
      data: {
        name,
        icon,
        description,
        memoryIsolated: isMemoryGlobal !== undefined ? !isMemoryGlobal : false,
        embeddingEnabled: embeddingEnabled || false,
        embeddingModelId: embeddingEnabled && embeddingModelId ? embeddingModelId : null,
        embeddingDimensions: embeddingEnabled && embeddingDimensions ? embeddingDimensions : null,
        userId,
      },
    });

    return NextResponse.json({ project });
  } catch (_error: any) {
    return createErrorResponse("创建项目时出错", 500, "CREATE_PROJECT_ERROR", _error, { translationKey: "projectApi.createProjectError" });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequestResponse("缺少 id 参数", { translationKey: "projectApi.missingId" });
    }

    // 先查询项目关联的文件，以便删除物理文件
    const projectFiles = await db.file.findMany({
      where: {
        projectId: id,
        userId: userId,
      },
      select: {
        id: true,
        url: true,
      },
    });

    // 删除物理文件 - 使用 Promise.allSettled 并行处理
    const { unlink } = await import("fs/promises");
    const path = await import("path");
    const { existsSync } = await import("fs");
    const uploadDir = path.resolve(process.cwd(), "uploads");

    // 并行删除所有物理文件
    await Promise.allSettled(
      projectFiles.map(async (file) => {
        try {
          // 根据文件URL查找物理文件路径
          let filePath: string | null = null;
          
          if (file.url.startsWith("/uploads/")) {
            const relativePath = decodeURIComponent(file.url.substring("/uploads/".length));
            filePath = path.resolve(uploadDir, relativePath);
          } else if (file.url.startsWith("/api/files/")) {
            // 查找以文件ID开头的文件
            try {
              const fs = await import("fs/promises");
              const uploadFiles = await fs.readdir(uploadDir);
              const matchingFile = uploadFiles.find(f => f?.startsWith(`${file.id}-`));
              if (matchingFile) {
                filePath = path.resolve(uploadDir, matchingFile);
              }
            } catch {
              // 目录不存在或无法读取，跳过
            }
          } else {
            const fileName = path.basename(file.url);
            if (fileName && fileName !== '.' && fileName !== '..') {
              filePath = path.resolve(uploadDir, fileName);
            }
          }

          // 安全检查：确保文件路径在允许的目录内
          if (filePath) {
            const resolvedPath = path.resolve(filePath);
            const resolvedUploadDir = path.resolve(uploadDir);
            if (resolvedPath.startsWith(resolvedUploadDir + path.sep) || resolvedPath === resolvedUploadDir) {
              if (existsSync(filePath)) {
                await unlink(filePath);
              }
            }
          }
        } catch (err) {
          // 物理文件删除失败不影响数据库删除
          console.error(`Failed to delete physical file for file ${file.id}:`, err);
        }
      })
    );

    // 使用 delete 的 where 条件同时验证权限，避免竞态条件
    // Prisma的级联删除会自动删除关联的sessions、files、memories等
    try {
      await db.project.delete({
        where: { 
          id,
          userId // 在 where 中同时验证 userId，确保原子性
        }
      });
    } catch (_error) {
      // Prisma 在记录不存在时会抛出 P2025 错误
      if (_error && typeof _error === 'object' && 'code' in _error && _error.code === 'P2025') {
        return notFoundResponse("项目未找到或无权操作", { translationKey: "projectApi.projectNotFoundOrNoPermission" });
      }
      throw _error;
    }

    return NextResponse.json({ success: true });
  } catch (_error: any) {
    return createErrorResponse("删除项目时出错", 500, "DELETE_PROJECT_ERROR", _error, { translationKey: "projectApi.deleteProjectError" });
  }
}

const updateProjectSchema = z.object({
  id: z.string().min(1, "缺少 id 参数"),
  name: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  isMemoryGlobal: z.boolean().optional(),
  embeddingEnabled: z.boolean().optional(),
  embeddingModelId: z.string().optional(),
  embeddingDimensions: z.number().optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = updateProjectSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { id, name, icon, description, isMemoryGlobal, embeddingEnabled, embeddingModelId, embeddingDimensions } = result.data;

    // 使用事务和条件更新来避免竞态条件
    const updateData: Prisma.ProjectUpdateInput = {};
    
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (description !== undefined) updateData.description = description;
    if (isMemoryGlobal !== undefined) updateData.memoryIsolated = !isMemoryGlobal;

    if (embeddingEnabled !== undefined) {
      updateData.embeddingEnabled = embeddingEnabled;
      updateData.embeddingModelId = embeddingEnabled && embeddingModelId ? embeddingModelId : null;
      updateData.embeddingDimensions = embeddingEnabled && embeddingDimensions ? embeddingDimensions : null;
    } else if (embeddingModelId !== undefined) {
      updateData.embeddingModelId = embeddingModelId || null;
    }
    
    if (embeddingDimensions !== undefined) {
      updateData.embeddingDimensions = embeddingDimensions || null;
    }

    // 使用 update 的 where 条件同时验证权限，避免竞态条件
    const updatedProject = await db.project.update({
      where: { 
        id,
        userId // 在 where 中同时验证 userId，确保原子性
      },
      data: updateData,
    });

    return NextResponse.json({ project: updatedProject });
  } catch (_error: any) {
    return createErrorResponse("更新项目时出错", 500, "UPDATE_PROJECT_ERROR", _error, { translationKey: "projectApi.updateProjectError" });
  }
}
