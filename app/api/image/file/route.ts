import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";
import { unauthorizedResponse, notFoundResponse, createErrorResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

/**
 * 提供生成的图片文件访问
 * 图片保存在 uploads/generated-images/ 目录下，通过此 API 访问
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 鉴权
    const session = await auth();
    if (!session || !session.user?.id) {
      return unauthorizedResponse();
    }

    const userId = session.user.id;
    
    // 2. 获取文件路径参数
    const searchParams = req.nextUrl.searchParams;
    const filePath = searchParams.get('path');
    
    if (!filePath) {
      return createErrorResponse("Missing file path", 400, "MISSING_PATH");
    }
    
    // 3. 安全检查：防止路径遍历攻击
    // 只允许访问 uploads/generated-images/ 目录下的文件
    const normalizedPath = path.normalize(filePath);
    
    // 确保路径以 generated-images/ 开头
    if (!normalizedPath.startsWith('generated-images/')) {
      return createErrorResponse("Invalid file path", 400, "INVALID_PATH");
    }
    
    // 确保路径中包含当前用户ID（用户只能访问自己的图片）
    if (!normalizedPath.includes(`/${userId}/`)) {
      return unauthorizedResponse();
    }
    
    // 4. 构建完整的文件路径
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const absolutePath = path.resolve(uploadDir, normalizedPath);
    
    // 5. 安全检查：确保文件路径在允许的目录内
    if (!absolutePath.startsWith(uploadDir + path.sep)) {
      return createErrorResponse("Invalid file path", 400, "INVALID_PATH");
    }
    
    // 6. 检查文件是否存在
    if (!existsSync(absolutePath)) {
      logger.warn('Generated image not found', { path: absolutePath, userId });
      return notFoundResponse("图片未找到");
    }
    
    // 7. 读取文件
    const fileBuffer = await readFile(absolutePath);
    
    // 8. 确定 Content-Type
    const ext = path.extname(absolutePath).toLowerCase();
    let contentType = 'image/png';
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    // 9. 返回图片
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 缓存24小时
      },
    });
    
  } catch (error: unknown) {
    logger.error('Failed to serve generated image', error);
    return createErrorResponse("图片访问失败", 500, "IMAGE_ACCESS_ERROR", error);
  }
}
