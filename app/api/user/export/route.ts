import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorizedResponse, createErrorResponse } from "@/lib/api-error";
import { readFile, readdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import JSZip from "jszip";
import { logger } from "@/lib/logger";

/**
 * 导出用户所有数据
 * 包括：用户信息、设置、聊天记录、项目、文件、附件、记忆、提示词、MCP插件、技能
 * 返回 ZIP 文件，包含：
 * - manifest.json: 元数据和版本信息
 * - data.json: 所有数据库记录
 * - files/: 所有文件
 * - attachments/: 所有附件文件
 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;

  try {
    // 1. 获取用户基本信息（不包括密码）
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return createErrorResponse("User not found", 404, "NOT_FOUND");
    }

    // 2. 获取用户设置
    const userSetting = await db.userSetting.findUnique({
      where: { userId },
    });

    // 3. 获取所有项目
    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 4. 获取所有会话（包括项目内和项目外的）
    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 5. 获取所有消息（按会话分组）
    const messages = await db.message.findMany({
      where: {
        session: {
          userId,
        },
      },
      include: {
        attachments: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // 6. 获取所有文件
    const files = await db.file.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 7. 获取所有附件（通过消息关联）
    const attachments = await db.attachment.findMany({
      where: {
        message: {
          session: {
            userId,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 8. 获取所有记忆
    const memories = await db.memory.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 9. 获取所有提示词
    const prompts = await db.prompt.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 10. 获取所有 MCP 插件
    const mcpPlugins = await db.mcpPlugin.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 11. 获取所有会话与 MCP 插件关联
    const sessionMcpPlugins = await db.sessionMcpPlugin.findMany({
      where: {
        session: {
          userId,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 12. 获取所有技能
    const skills = await db.skill.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    // 13. 获取所有会话与技能关联
    const sessionSkills = await db.sessionSkill.findMany({
      where: {
        session: {
          userId,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 14. 获取所有文档切片（用于 RAG）
    const documentChunks = await db.documentChunk.findMany({
      where: {
        file: {
          userId,
        },
      },
    });

    // 15. 创建 ZIP 文件
    const zip = new JSZip();

    // 16. 创建 manifest.json
    const manifest = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      userId: user.id,
      username: user.username,
      dataVersion: "1.1.0", // 数据格式版本，用于兼容性检查（1.1.0 新增 MCP 插件和技能）
      includes: {
        user: true,
        settings: !!userSetting,
        projects: projects.length,
        sessions: sessions.length,
        messages: messages.length,
        files: files.length,
        attachments: attachments.length,
        memories: memories.length,
        prompts: prompts.length,
        mcpPlugins: mcpPlugins.length,
        sessionMcpPlugins: sessionMcpPlugins.length,
        skills: skills.length,
        sessionSkills: sessionSkills.length,
        documentChunks: documentChunks.length,
      },
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 17. 创建 data.json（所有数据库记录）
    const exportData = {
      user,
      userSetting: userSetting || null,
      projects,
      sessions,
      messages,
      files,
      attachments,
      memories,
      prompts,
      mcpPlugins,
      sessionMcpPlugins,
      skills,
      sessionSkills,
      documentChunks,
    };

    zip.file("data.json", JSON.stringify(exportData, null, 2));

    // 18. 处理文件：读取并添加到 ZIP
    const uploadDir = path.join(process.cwd(), "uploads");
    const publicUploadDir = path.join(process.cwd(), "public", "uploads");

    for (const file of files) {
      try {
        let filePath: string | null = null;

        // 尝试从 uploads 目录读取
        if (file.url.startsWith("/api/files/")) {
          const fileId = file.id;
          if (existsSync(uploadDir)) {
            const uploadFiles = await readdir(uploadDir);
            const matchingFile = uploadFiles.find((f) => f.startsWith(`${fileId}-`));
            if (matchingFile) {
              const resolvedPath = path.resolve(uploadDir, matchingFile);
              if (resolvedPath.startsWith(uploadDir + path.sep) || resolvedPath === uploadDir) {
                filePath = resolvedPath;
              }
            }
          }
        } else if (file.url.startsWith("/uploads/")) {
          const relativePath = decodeURIComponent(file.url.substring("/uploads/".length));
          const resolvedPath = path.resolve(publicUploadDir, relativePath);
          if (resolvedPath.startsWith(publicUploadDir + path.sep) || resolvedPath === publicUploadDir) {
            if (existsSync(resolvedPath)) {
              filePath = resolvedPath;
            }
          }
          // 如果 public 目录不存在，尝试 uploads 目录
          if (!filePath && existsSync(uploadDir)) {
            const newPath = path.resolve(uploadDir, relativePath);
            if (newPath.startsWith(uploadDir + path.sep) || newPath === uploadDir) {
              if (existsSync(newPath)) {
                filePath = newPath;
              }
            }
          }
        }

        if (filePath && existsSync(filePath)) {
          const fileBuffer = await readFile(filePath);
          zip.file(`files/${file.id}-${file.name}`, fileBuffer);
        } else {
          // 文件不存在，记录警告但不中断导出
          logger.warn("File not found during export", { 
            fileId: file.id, 
            fileUrl: file.url,
            userId 
          });
        }
      } catch (error: unknown) {
        logger.error(`Error reading file ${file.id} during export`, error, { 
          fileId: file.id,
          userId 
        });
        // 继续处理其他文件
      }
    }

    // 19. 处理附件文件（图片等）
    for (const attachment of attachments) {
      try {
        let filePath: string | null = null;

        // 附件可能使用 /api/files/{id} 格式
        if (attachment.url.startsWith("/api/files/")) {
          const fileId = attachment.url.replace("/api/files/", "");
          if (existsSync(uploadDir)) {
            const uploadFiles = await readdir(uploadDir);
            const matchingFile = uploadFiles.find((f) => f.startsWith(`${fileId}-`));
            if (matchingFile) {
              const resolvedPath = path.resolve(uploadDir, matchingFile);
              if (resolvedPath.startsWith(uploadDir + path.sep) || resolvedPath === uploadDir) {
                filePath = resolvedPath;
              }
            }
          }
        } else if (attachment.url.startsWith("/uploads/")) {
          const relativePath = decodeURIComponent(attachment.url.substring("/uploads/".length));
          const resolvedPath = path.resolve(publicUploadDir, relativePath);
          if (resolvedPath.startsWith(publicUploadDir + path.sep) || resolvedPath === publicUploadDir) {
            if (existsSync(resolvedPath)) {
              filePath = resolvedPath;
            }
          }
          // 如果 public 目录不存在，尝试 uploads 目录
          if (!filePath && existsSync(uploadDir)) {
            const newPath = path.resolve(uploadDir, relativePath);
            if (newPath.startsWith(uploadDir + path.sep) || newPath === uploadDir) {
              if (existsSync(newPath)) {
                filePath = newPath;
              }
            }
          }
        }

        if (filePath && existsSync(filePath)) {
          const fileBuffer = await readFile(filePath);
          zip.file(`attachments/${attachment.id}-${attachment.name}`, fileBuffer);
        } else {
          // 文件不存在，记录警告但不中断导出
          logger.warn("Attachment file not found during export", { 
            attachmentId: attachment.id, 
            attachmentUrl: attachment.url,
            userId 
          });
        }
      } catch (error: unknown) {
        logger.error(`Error reading attachment ${attachment.id} during export`, error, { 
          attachmentId: attachment.id,
          userId 
        });
        // 继续处理其他附件
      }
    }

    // 20. 生成 ZIP 文件
    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    // 21. 返回 ZIP 文件
    const filename = `rille-chat-export-${user.username}-${new Date().toISOString().split("T")[0]}.zip`;

    // @ts-ignore - Buffer is compatible with BodyInit in Node environment
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    logger.error("Export failed", error, { userId });
    return createErrorResponse("导出失败", 500, "EXPORT_FAILED", error);
  }
}

