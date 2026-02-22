import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorizedResponse, notFoundResponse, createErrorResponse, badRequestResponse } from "@/lib/api-error";
import { checkFileAccess } from "@/lib/auth/file-access";
import { logger } from "@/lib/logger";

/**
 * 安全的文件访问API
 * 验证用户权限后提供文件下载
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 鉴权
    const session = await auth();
    if (!session || !session.user?.id) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    
    // 验证 id 不为空
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return badRequestResponse("Invalid file ID");
    }
    
    const userId = session?.user?.id;
    if (!userId) {
      return unauthorizedResponse();
    }

    // 2. 从数据库查找文件记录
    const file = await db.file.findFirst({
      where: {
        id: id.trim(),
      },
    });

    if (!file) {
      return notFoundResponse("文件未找到");
    }

    // 3. 验证文件访问权限（使用统一的权限检查服务）
    const hasAccess = await checkFileAccess({ userId, fileId: id });
    if (!hasAccess) {
      return unauthorizedResponse();
    }

    // 4. 构建文件路径
    // 文件存储在 uploads 目录（不在 public 下）
    const uploadDir = path.resolve(process.cwd(), "uploads");
    let filePath: string | null = null;

    // 验证 file.url 不为空
    if (!file.url || typeof file.url !== 'string') {
      return createErrorResponse("Invalid file URL in database", 500, "INVALID_FILE_URL");
    }

    // 兼容旧的文件URL格式（/uploads/xxx）
    if (file.url.startsWith("/uploads/")) {
      const relativePath = decodeURIComponent(file.url.substring("/uploads/".length));
      if (!relativePath || relativePath.includes('..')) {
        return createErrorResponse("Invalid relative path", 400, "INVALID_PATH");
      }
      filePath = path.resolve(uploadDir, relativePath);
    } else if (file.url.startsWith("/api/files/")) {
      // 新的API格式：文件名格式为 {fileId}-{timestamp}-{originalName}
      // 查找uploads目录下以文件ID开头的文件
      const fs = await import("fs/promises");
      try {
        const uploadFiles = await fs.readdir(uploadDir);
        const matchingFile = uploadFiles.find(f => f?.startsWith(`${id}-`));
        
        if (!matchingFile) {
          return notFoundResponse("文件物理存储未找到");
        }
        filePath = path.resolve(uploadDir, matchingFile);
      } catch (err) {
        logger.error("Failed to read upload directory", err, { uploadDir, fileId: id });
        return notFoundResponse("无法访问上传目录");
      }
    } else if (file.url === "/temp" || !file.url || file.url.trim() === "") {
      // 处理临时URL或空URL的情况：直接查找以文件ID开头的文件
      const fs = await import("fs/promises");
      try {
        const uploadFiles = await fs.readdir(uploadDir);
        const matchingFile = uploadFiles.find(f => f?.startsWith(`${id}-`));
        
        if (!matchingFile) {
          return notFoundResponse("文件物理存储未找到");
        }
        filePath = path.resolve(uploadDir, matchingFile);
      } catch (err) {
        logger.error("Failed to read upload directory", err, { uploadDir, fileId: id });
        return notFoundResponse("无法访问上传目录");
      }
    } else {
      // 其他格式，尝试直接解析
      const fileName = path.basename(file.url);
      if (!fileName || fileName === '.' || fileName === '..') {
        // 如果解析失败，尝试使用文件ID查找
        const fs = await import("fs/promises");
        try {
          const uploadFiles = await fs.readdir(uploadDir);
          const matchingFile = uploadFiles.find(f => f?.startsWith(`${id}-`));
          
          if (!matchingFile) {
            return createErrorResponse("Invalid file name", 500, "INVALID_FILE_NAME");
          }
          filePath = path.resolve(uploadDir, matchingFile);
        } catch (err) {
          logger.error("Failed to read upload directory", err, { uploadDir, fileId: id });
          return createErrorResponse("Invalid file name", 500, "INVALID_FILE_NAME");
        }
      } else {
        filePath = path.resolve(uploadDir, fileName);
      }
    }

    // 验证 filePath 不为空
    if (!filePath) {
      return createErrorResponse("Failed to determine file path", 500, "FILE_PATH_ERROR");
    }

    // 5. 安全检查：确保文件路径在允许的目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
      return createErrorResponse("Invalid file path", 400, "INVALID_FILE_PATH");
    }

    // 6. 检查文件是否存在
    if (!existsSync(filePath)) {
      return notFoundResponse("文件不存在");
    }

    // 7. 读取文件并返回
    const fileBuffer = await readFile(filePath);
    const contentType = file.type || "application/octet-stream";

    // 定义危险的文件类型（可能包含可执行内容）
    const DANGEROUS_TYPES = [
      'text/html',
      'application/xhtml+xml',
      'image/svg+xml',
      'application/xml',
      'text/xml'
    ];

    const isDangerousType = DANGEROUS_TYPES.some(dangerous => 
      contentType.toLowerCase().includes(dangerous)
    );

    // 对于危险类型，使用 attachment 而不是 inline
    const contentDisposition = isDangerousType 
      ? `attachment; filename="${encodeURIComponent(file.name)}"`
      : `inline; filename="${encodeURIComponent(file.name)}"`;

    // 设置安全响应头
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });

    // 对于HTML/SVG等类型，添加CSP头
    if (isDangerousType) {
      headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
      headers.set("X-Frame-Options", "DENY");
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error: unknown) {
    return createErrorResponse("文件访问失败", 500, "FILE_ACCESS_ERROR", error);
  }
}

/**
 * 删除文件API
 * 删除文件本身、对应向量、与项目关联关系
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 鉴权
    const session = await auth();
    if (!session || !session.user?.id) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const userId = session.user.id;

    // 2. 从数据库查找文件记录
    const file = await db.file.findFirst({
      where: {
        id: id,
        userId: userId, // 确保只能删除自己的文件
      },
    });

    if (!file) {
      return notFoundResponse("文件未找到");
    }

    // 3. 构建文件路径
    const uploadDir = path.resolve(process.cwd(), "uploads");
    let filePath: string | null = null;

    // 兼容旧的文件URL格式（/uploads/xxx）
    if (file.url.startsWith("/uploads/")) {
      const relativePath = decodeURIComponent(file.url.substring("/uploads/".length));
      filePath = path.resolve(uploadDir, relativePath);
    } else if (file.url.startsWith("/api/files/")) {
      // 新的API格式：文件名格式为 {fileId}-{timestamp}-{originalName}
      const fs = await import("fs/promises");
      try {
        const uploadFiles = await fs.readdir(uploadDir);
        const matchingFile = uploadFiles.find(f => f.startsWith(`${id}-`));
        
        if (matchingFile) {
          filePath = path.resolve(uploadDir, matchingFile);
        }
      } catch {
        // 目录不存在或无法读取，继续删除数据库记录
      }
    } else {
      // 其他格式，尝试直接解析
      const fileName = path.basename(file.url);
      filePath = path.resolve(uploadDir, fileName);
    }

    // 4. 安全检查：确保文件路径在允许的目录内
    if (filePath) {
      const resolvedPath = path.resolve(filePath);
      const resolvedUploadDir = path.resolve(uploadDir);
      if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
        filePath = null; // 路径不安全，不删除物理文件
      }
    }

    // 5. 使用事务删除文件记录（会自动级联删除DocumentChunk）
    await db.file.delete({
      where: {
        id: id,
      },
    });

    // 6. 删除物理文件（如果存在且路径安全）
    if (filePath && existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (err) {
        // 物理文件删除失败不影响数据库删除
        logger.error("Failed to delete physical file", err, { fileId: id, filePath });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return createErrorResponse("删除文件失败", 500, "DELETE_FILE_ERROR", error);
  }
}

