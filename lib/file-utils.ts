import path from "path";
import { readdir } from "fs/promises";
import { existsSync } from "fs";

/**
 * 根据文件URL获取实际的文件路径
 * 支持旧格式 /uploads/xxx 和新格式 /api/files/{id}
 */
export async function getFilePathFromUrl(url: string, fileId?: string): Promise<string | null> {
  const uploadDir = path.resolve(process.cwd(), "uploads");
  const publicUploadDir = path.resolve(process.cwd(), "public", "uploads");

  // 兼容旧格式：/uploads/xxx
  if (url.startsWith("/uploads/")) {
    const relativePath = decodeURIComponent(url.substring("/uploads/".length));
    const filePath = path.resolve(publicUploadDir, relativePath);
    
    // 安全检查
    if (filePath.startsWith(publicUploadDir + path.sep) || filePath === publicUploadDir) {
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    
    // 如果public目录下不存在，尝试新的uploads目录
    const newFilePath = path.resolve(uploadDir, relativePath);
    if (newFilePath.startsWith(uploadDir + path.sep) || newFilePath === uploadDir) {
      if (existsSync(newFilePath)) {
        return newFilePath;
      }
    }
  }
  
  // 新格式：/api/files/{id}
  if (url.startsWith("/api/files/") && fileId) {
    try {
      const uploadFiles = await readdir(uploadDir);
      const matchingFile = uploadFiles.find(f => f.startsWith(`${fileId}-`));
      
      if (matchingFile) {
        const filePath = path.resolve(uploadDir, matchingFile);
        // 安全检查
        if (filePath.startsWith(uploadDir + path.sep) || filePath === uploadDir) {
          return filePath;
        }
      }
    } catch {
      // 目录不存在或无法读取
      return null;
    }
  }
  
  return null;
}





