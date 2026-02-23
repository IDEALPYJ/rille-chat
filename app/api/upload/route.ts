import { NextRequest, NextResponse } from "next/server";
import { mkdir, lstat, unlink } from "fs/promises";
import { createWriteStream } from "fs";
import path, { join } from "path";
import { existsSync } from "fs";
import { fileTypeFromBuffer } from "file-type";
import { createHash } from "crypto";
import { pipeline } from "stream/promises";
import { Readable, Transform } from "stream";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { rateLimit, rateLimiters } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isTextFileForEmbedding, extractTextFromFile } from "@/lib/embedding/text-extractor";
import { chunkText } from "@/lib/embedding/text-chunker";
import { getEmbeddingsBatch, getEmbeddingConfigFromProject } from "@/lib/embedding/embedding-helper";

import { FILE_PROCESSING } from "@/lib/constants";

export async function POST(req: NextRequest) {
  // Rate limiting for file uploads
  const rateLimitResponse = await rateLimit(req, rateLimiters.upload);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }
  
  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return badRequestResponse("No file uploaded");
    }

    // 限制文件大小
    const { FILE_UPLOAD } = await import("@/lib/constants");
    if (file.size > FILE_UPLOAD.MAX_SIZE) {
      return badRequestResponse(`File size exceeds ${FILE_UPLOAD.MAX_SIZE_MB}MB limit`);
    }

    // 不再限制文件类型，允许所有文件类型上传
    const ext = path.extname(file.name).toLowerCase();

    // 检查文件类型（在流式处理之前）
    const isTextFile = isTextFileForEmbedding(file.name, file.type);
    const isImageFile = file.type.startsWith('image/');
    const isVideoFile = file.type.startsWith('video/');
    
    // 如果项目启用了embedding，检查文件大小限制
    const EMBEDDING_MAX_SIZE = FILE_PROCESSING.EMBEDDING_MAX_SIZE;
    let shouldProcessEmbedding = false;
    let fileType: 'text' | 'image' | 'video' | null = null;
    
    if (projectId) {
      // 使用模型配置服务检查模型特性（避免硬编码）
      const { getProjectEmbeddingModelConfig } = await import("@/lib/embedding/model-config-service");
      const modelConfig = await getProjectEmbeddingModelConfig(projectId, userId);
      
      if (modelConfig?.embeddingEnabled && modelConfig.supportsMultimodal !== undefined) {
        // 文本文件：总是处理
        if (isTextFile) {
          if (file.size > EMBEDDING_MAX_SIZE) {
            logger.warn("File too large for embedding", { fileName: file.name, size: file.size });
          } else {
            shouldProcessEmbedding = true;
            fileType = 'text';
          }
        }
        // 图像/视频文件：只有多模态模型才处理
        else if ((isImageFile || isVideoFile) && modelConfig.supportsMultimodal) {
          if (file.size > EMBEDDING_MAX_SIZE) {
            logger.warn("File too large for embedding", { fileName: file.name, size: file.size });
          } else {
            shouldProcessEmbedding = true;
            fileType = isImageFile ? 'image' : 'video';
          }
        }
      }
    }

    // 确保存储目录存在（移到 public 目录外以提高安全性）
    const uploadDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 先创建数据库记录以获取ID（使用临时URL）
    const dbFile = await db.file.create({
      data: {
        name: file.name,
        url: "/temp", // 临时URL，稍后更新
        type: file.type || "application/octet-stream",
        size: file.size,
        userId: userId,
        projectId: projectId || undefined,
        status: shouldProcessEmbedding ? "processing" : "processing",
        md5: "", // 稍后更新
      }
    });

    // 使用文件ID作为文件名的一部分，便于查找
    // 限制文件名长度：Linux 通常限制 255 字节，我们限制为常量定义的长度以留出安全余量
    const MAX_FILENAME_LENGTH = FILE_PROCESSING.MAX_FILENAME_LENGTH;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    // 截断过长的文件名（保留扩展名）
    const nameWithoutExt = cleanFileName.slice(0, cleanFileName.length - ext.length);
    const truncatedName = nameWithoutExt.slice(0, MAX_FILENAME_LENGTH - ext.length - 50) + ext; // 50 字节留给前缀和时间戳
    const fileName = `${dbFile.id}-${Date.now()}-${truncatedName}`;
    
    // 最终检查：确保总长度不超过限制
    const finalFileName = fileName.length > MAX_FILENAME_LENGTH 
      ? fileName.slice(0, MAX_FILENAME_LENGTH)
      : fileName;
    const filePath = join(uploadDir, finalFileName);
    
    // 防止路径遍历攻击：确保最终路径在允许的目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    
    // 检查解析后的路径是否在上传目录内
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
      // 如果路径无效，删除已创建的数据库记录
      await db.file.delete({ where: { id: dbFile.id } });
      return badRequestResponse("Invalid file path");
    }

    // 额外安全检查：确保路径中不包含符号链接跳出目录
    try {
      // 逐级检查路径中的每一部分是否包含非预期的符号链接
      let currentPath = resolvedUploadDir;
      const relativeParts = path.relative(resolvedUploadDir, resolvedPath).split(path.sep);
      
      for (const part of relativeParts) {
        if (!part || part === '.') continue;
        currentPath = path.join(currentPath, part);
        if (existsSync(currentPath)) {
          const stats = await lstat(currentPath);
          if (stats.isSymbolicLink()) {
            // 如果在上传目录下发现了符号链接，出于安全考虑拒绝处理（除非系统逻辑确实需要它）
            await db.file.delete({ where: { id: dbFile.id } });
            return badRequestResponse("Symbolic links are not allowed in upload path");
          }
        }
      }
    } catch (err) {
      logger.error("Path validation error", err);
    }
    
    // 使用流式处理写入文件并计算MD5，避免将整个文件加载到内存
    const writeStream = createWriteStream(filePath);
    const hash = createHash('md5');
    const fileStream = file.stream();
    
    // 将 Web ReadableStream 转换为 Node.js Stream
    // Readable.fromWeb 是 Node.js 18+ 的标准方法，类型定义在 @types/node 中
    const nodeStream = Readable.fromWeb(fileStream as any);
    
    // 创建转换流来计算MD5并同时写入文件
    const hashTransform = new Transform({
      transform(chunk: Buffer, encoding, callback) {
        hash.update(chunk);
        this.push(chunk);
        callback();
      }
    });
    
    // 使用 pipeline 处理流：读取 -> 计算MD5 -> 写入文件
    await pipeline(nodeStream, hashTransform, writeStream);
    
    const md5Hash = hash.digest('hex');
    
    // 更新数据库记录中的MD5
    await db.file.update({
      where: { id: dbFile.id },
      data: { md5: md5Hash }
    });
    
    // 检查是否已存在相同MD5的文件（在同一项目中）
    if (projectId) {
      const existingFile = await db.file.findFirst({
        where: {
          md5: md5Hash,
          projectId: projectId,
          userId: userId,
          id: { not: dbFile.id } // 排除当前文件
        }
      });
      
      if (existingFile) {
        // 删除刚上传的文件和数据库记录
        try {
          await unlink(filePath);
        } catch (err) {
          logger.error("Failed to delete duplicate file", err);
        }
        await db.file.delete({ where: { id: dbFile.id } });
        // 返回成功但标记为重复，让前端显示提示而不报错
        return NextResponse.json({
          success: true,
          duplicate: true,
          error: "duplicate",
          message: "该文件已存在，请勿重复上传"
        });
      }
    }

    // 增强验证：通过文件魔数检测真实文件类型（只读取文件头部，避免加载整个文件）
    // 对于已经在前面判断为文本/图片/视频的文件，这里主要用于验证，而不是否决前面的判断
    // 因为fileTypeFromBuffer可能检测不到某些文本文件（如.py文件），但我们仍然应该处理它们
    const fileHandle = await import("fs/promises").then(m => m.open(filePath, 'r'));
    const headerBuffer = Buffer.alloc(4100);
    await fileHandle.read(headerBuffer, 0, 4100, 0);
    await fileHandle.close();
    
    const detectedType = await fileTypeFromBuffer(headerBuffer);
    
    // 如果前面已经判断为文本/图片/视频文件，fileTypeFromBuffer主要用于验证，而不是否决
    // 只有当检测到的类型明确与预期不符且不是文本文件时才需要调整
    if (shouldProcessEmbedding && fileType) {
      if (detectedType) {
        // 如果检测到了类型，验证是否与预期一致
        const detectedMime = detectedType.mime;
        const isTextMime = detectedMime.startsWith('text/') || detectedMime.includes('json') || detectedMime.includes('xml');
        const isImageMime = detectedMime.startsWith('image/');
        const isVideoMime = detectedMime.startsWith('video/');
        
        // 如果检测到的类型与预期不符，记录警告但不阻止处理（因为fileTypeFromBuffer可能不准确）
        if (fileType === 'text' && !isTextMime && !isImageMime && !isVideoMime) {
          logger.warn("File type detected doesn't match expected text type, but proceeding", { 
            fileName: file.name, 
            detectedMime,
            expectedType: fileType
          });
        } else if (fileType === 'image' && !isImageMime) {
          logger.warn("File type detected doesn't match expected image type, but proceeding", { 
            fileName: file.name, 
            detectedMime,
            expectedType: fileType
          });
        } else if (fileType === 'video' && !isVideoMime) {
          logger.warn("File type detected doesn't match expected video type, but proceeding", { 
            fileName: file.name, 
            detectedMime,
            expectedType: fileType
          });
        }
      } else {
        // fileTypeFromBuffer检测不到类型是正常的（特别是对于文本文件），不应该阻止处理
        logger.info("Could not detect file type via magic numbers, but proceeding with embedding based on filename/extension", { 
          fileName: file.name,
          fileType,
          extension: ext
        });
      }
    }

    // 使用API路由提供文件访问，而不是直接暴露在public目录
    const fileUrl = `/api/files/${dbFile.id}`;
    
    // 更新文件URL到数据库（无论是否需要处理embedding都需要更新）
    await db.file.update({
      where: { id: dbFile.id },
      data: { 
        url: fileUrl,
        status: shouldProcessEmbedding ? "processing" : "completed"
      }
    });
    
    // 如果不需要处理embedding，直接完成
    if (!shouldProcessEmbedding) {
      return NextResponse.json({
        success: true,
        id: dbFile.id,
        url: fileUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        embeddingProcessed: false
      });
    }
    
    // 处理embedding（异步，不阻塞响应）
    // 确保所有 Promise 都有错误处理
    if (shouldProcessEmbedding && fileType && projectId) {
      processEmbedding(dbFile.id, filePath, file.name, file.type, fileType, projectId, userId)
        .catch((err: unknown) => {
          logger.error("Embedding processing failed", err, { 
            fileId: dbFile.id,
            fileName: file.name,
            fileType,
            projectId 
          });
          // 更新文件状态为完成，但不影响文件上传（URL已经正确设置）
          db.file.update({
            where: { id: dbFile.id },
            data: { status: "completed" } // 即使embedding失败，文件本身已上传成功
          }).catch((updateErr: unknown) => {
            logger.error("Failed to update file status after embedding error", updateErr, { 
              fileId: dbFile.id 
            });
          });
        });
    }
    
    // 立即返回响应，embedding在后台处理
    return NextResponse.json({
      success: true,
      id: dbFile.id,
      url: fileUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      embeddingProcessed: false, // 正在处理中
      embeddingProcessing: true
    });
  } catch (error: unknown) {
    logger.error("File upload failed", error, { userId });
    return createErrorResponse("Upload failed", 500, "UPLOAD_FAILED", error);
  }
}

/**
 * 处理embedding的异步函数
 */
async function processEmbedding(
  fileId: string,
  filePath: string,
  fileName: string,
  mimeType: string,
  fileType: 'text' | 'image' | 'video',
  projectId: string,
  userId: string
): Promise<void> {
  const errorSteps = {
    config: "获取embedding配置",
    extraction: "提取文件内容",
    chunking: "文本分块",
    embedding: "生成向量",
    storage: "存储向量数据"
  };
  
  try {
    logger.info("Starting embedding processing", { fileId, fileName });
    
    // 1. 获取embedding配置和服务
    let embeddingConfig;
    try {
      embeddingConfig = await getEmbeddingConfigFromProject(projectId, userId);
      if (!embeddingConfig) {
        const errorMsg = "未找到embedding配置，请检查项目设置";
        logger.warn("Embedding config not found", { fileId, projectId });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.config}失败: ${errorMsg}]`
          }
        });
        return;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      const errorMsg = `获取embedding配置失败: ${errorMessage}`;
      logger.error("Failed to get embedding config", error, { fileId });
      await db.file.update({
        where: { id: fileId },
        data: { 
          status: "failed",
          name: `${fileName} [${errorSteps.config}失败: ${errorMsg}]`
        }
      });
      return;
    }
    
    const { createEmbeddingService } = await import("@/lib/embedding/embedding-service");
    const embeddingService = createEmbeddingService(embeddingConfig);
    const supportsMultimodal = embeddingService.supportsMultimodal();
    
    // 2. 根据文件类型处理
    if (fileType === 'text') {
      // 文本文件：提取文本、切块、embedding
      let extractionResult;
      try {
        extractionResult = await extractTextFromFile(filePath, fileName, mimeType);
        if (!extractionResult.success || !extractionResult.text) {
          const errorMsg = extractionResult.error || "无法提取文本内容";
          logger.error("Text extraction failed", { fileId, error: errorMsg });
          // 删除文件和数据库记录，取消项目关联
          try {
            await unlink(filePath);
          } catch (err) {
            logger.error("Failed to delete file after extraction failure", err);
          }
          await db.file.delete({ where: { id: fileId } });
          // 触发通知事件（前端可以通过轮询或事件监听来处理）
          return;
        }
      } catch (error: unknown) {
        logger.error("Text extraction error", error, { fileId });
        // 删除文件和数据库记录
        try {
          await unlink(filePath);
        } catch (err) {
          logger.error("Failed to delete file after extraction error", err);
        }
        await db.file.delete({ where: { id: fileId } });
        return;
      }
      
      const text = extractionResult.text;
      if (text.trim().length === 0) {
        logger.warn("Extracted text is empty", { fileId });
        // 删除文件和数据库记录
        try {
          await unlink(filePath);
        } catch (err) {
          logger.error("Failed to delete file after empty extraction", err);
        }
        await db.file.delete({ where: { id: fileId } });
        return;
      }
      
      // 文本分块
      let chunks;
      try {
        chunks = chunkText(text, { 
          chunkSize: FILE_PROCESSING.TEXT_CHUNK_SIZE, 
          overlap: FILE_PROCESSING.TEXT_CHUNK_OVERLAP 
        });
        if (chunks.length === 0) {
          const errorMsg = "文本分块后没有生成任何块";
          logger.warn("No chunks created", { fileId });
          await db.file.update({
            where: { id: fileId },
            data: { 
              status: "failed",
              name: `${fileName} [${errorSteps.chunking}失败: ${errorMsg}]`
            }
          });
          return;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        const errorMsg = `文本分块失败: ${errorMessage}`;
        logger.error("Text chunking error", error, { fileId });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.chunking}失败: ${errorMsg}]`
          }
        });
        return;
      }
      
      logger.info("Text chunked", { fileId, chunkCount: chunks.length });
      
      // 批量获取embeddings（在事务外执行，避免长时间占用数据库连接）
      let embeddings;
      try {
        const chunkTexts = chunks.map(chunk => chunk.content);
        embeddings = await getEmbeddingsBatch(chunkTexts, embeddingConfig, 10);
        
        if (embeddings.length !== chunks.length) {
          throw new Error(`向量数量不匹配: 期望 ${chunks.length} 个，实际得到 ${embeddings.length} 个`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        const errorMsg = `生成向量失败: ${errorMessage}`;
        logger.error("Embedding generation error", error, { fileId });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.embedding}失败: ${errorMsg}]`
          }
        });
        return;
      }
      
      logger.info("Embeddings generated", { fileId, embeddingCount: embeddings.length });
      
      // 存储到数据库
      const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
      
      // 获取向量维度
      const vectorDimensions = embeddingConfig.dimensions || embeddings[0]?.length || 1536;
      
      // 准备所有需要插入的数据（在事务外）
      const chunksToInsert = chunks.map((chunk, i) => {
        const floatArray = new Float32Array(embeddings[i]);
        const embeddingBuffer = Buffer.from(floatArray.buffer);
        
        return {
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          embedding: embeddingBuffer,
          embeddingVector: embeddings[i],
          vectorDimensions: vectorDimensions,
          fileId: fileId,
          chunkIndex: i,
        };
      });
      
      // 使用最小化的事务（只包含数据库操作，设置超时时间）
      try {
        await db.$transaction(async (tx) => {
          // 删除旧数据
          await tx.documentChunk.deleteMany({ where: { fileId } });
          
          // 批量创建chunks
          const createdChunks = await Promise.all(
            chunksToInsert.map(chunk => 
              tx.documentChunk.create({
                data: {
                  content: chunk.content,
                  tokenCount: chunk.tokenCount,
                  embedding: chunk.embedding,
                  fileId: chunk.fileId,
                  chunkIndex: chunk.chunkIndex,
                }
              })
            )
          );
          
          // 批量更新向量（在事务中使用验证逻辑以确保安全性）
          // 使用embedding模型的维度，而不是硬编码的维度
          const actualVectorDimensions = vectorDimensions;
          
          // 验证和格式化所有向量数据
          const vectorUpdates = createdChunks.map((createdChunk, i) => {
            const embedding = chunksToInsert[i].embeddingVector;
            const actualDimensions = embedding.length;
            
            // 验证维度匹配（pgvector 要求维度完全匹配）
            if (actualDimensions !== actualVectorDimensions) {
              throw new Error(
                `向量维度不匹配: 期望 ${actualVectorDimensions} 维（模型: ${embeddingConfig.model}），实际 ${actualDimensions} 维。`
              );
            }
            
            // 验证所有元素都是有效的数字（防止注入）
            for (let j = 0; j < embedding.length; j++) {
              const value = embedding[j];
              if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
                throw new Error(`向量第 ${j} 个元素无效: 必须是有限数字，得到 ${value}`);
              }
            }
            
            // 格式化向量字符串（确保安全）
            const cleanedValues = embedding.map(val => {
              const num = Number(val);
              if (!isFinite(num) || isNaN(num)) {
                throw new Error(`无效的向量值: ${val}`);
              }
              return num.toString();
            });
            const vectorStr = `[${cleanedValues.join(',')}]`;
            
            return { chunkId: createdChunk.id, vectorStr, dimensions: actualVectorDimensions };
          });
          
          // 在事务中批量更新向量
          // 使用 real[] 数组存储，支持任意维度（无 2000 维限制）
          await Promise.all(
            vectorUpdates.map(({ chunkId, vectorStr, dimensions }) => {
              // 将 pgvector 格式 [1,2,3] 转换为 PostgreSQL 数组格式 {1,2,3}
              const arrayStr = vectorStr.replace(/\[/g, '{').replace(/\]/g, '}');
              return tx.$executeRawUnsafe(
                `UPDATE "DocumentChunk" SET "embedding_vector" = $1::real[], "embedding_dimensions" = $2 WHERE id = $3`,
                arrayStr,
                dimensions,
                chunkId
              );
            })
          );
          
          // 更新文件状态
          await tx.file.update({
            where: { id: fileId },
            data: {
              status: "completed",
              tokens: totalTokens
            }
          });
        }, {
          timeout: 30000, // 设置事务超时时间为30秒
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        let errorMsg = `存储向量数据失败: ${errorMessage}`;
        // 检查是否是 pgvector 扩展未安装的错误
        if (error instanceof Error && error.message.includes('type "vector" does not exist')) {
          errorMsg = `存储向量数据失败: pgvector 扩展未安装。请参考 docs/PGVECTOR_SETUP.md 安装 pgvector 扩展`;
        }
        logger.error("Vector storage error", error, { fileId });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.storage}失败: ${errorMsg}]`
          }
        });
        return;
      }
      
      logger.info("Text embedding processing completed", { fileId, chunkCount: chunks.length, totalTokens });
    } else if ((fileType === 'image' || fileType === 'video') && supportsMultimodal) {
      // 图像/视频文件：使用多模态embedding
      let embedding: number[];
      
      try {
        if (fileType === 'image') {
          // 对于图片，读取文件并转换为 base64 Data URI
          // 阿里云 API 支持 base64 格式：data:image/{format};base64,{data}
          try {
            const { readFile } = await import('fs/promises');
            const fileBuffer = await readFile(filePath);
            const base64 = fileBuffer.toString('base64');
            
            // 根据文件扩展名确定图片格式
            const ext = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
            const imageFormat = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : ext === 'webp' ? 'webp' : 'jpeg';
            const dataUri = `data:image/${imageFormat};base64,${base64}`;
            
            embedding = await embeddingService.getMultimodalEmbedding({ image: dataUri });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "未知错误";
            const errorMsg = `读取图片文件失败: ${errorMessage}`;
            logger.error("Image file read error", error, { fileId });
            await db.file.update({
              where: { id: fileId },
              data: { 
                status: "failed",
                name: `${fileName} [${errorSteps.extraction}失败: ${errorMsg}]`
              }
            });
            return;
          }
        } else {
          // 对于视频，需要完整的公开 URL
          // 尝试构建完整的公开 URL
          const { env: serverEnv } = await import("@/lib/env");
          let fullUrl: string;
          if (serverEnv.NEXT_PUBLIC_APP_URL) {
            fullUrl = `${serverEnv.NEXT_PUBLIC_APP_URL}/api/files/${fileId}`;
          } else {
            // 如果没有配置，尝试从请求头获取
            // 注意：这可能在服务器端无法获取，需要确保配置了 NEXT_PUBLIC_APP_URL
            logger.warn("NEXT_PUBLIC_APP_URL not configured, video embedding may fail", { fileId });
            fullUrl = `https://localhost:3000/api/files/${fileId}`;
          }
          
          try {
            embedding = await embeddingService.getMultimodalEmbedding({ video: fullUrl });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "未知错误";
            const errorMsg = `生成视频向量失败: ${errorMessage}`;
            logger.error("Video embedding error", error, { fileId });
            await db.file.update({
              where: { id: fileId },
              data: { 
                status: "failed",
                name: `${fileName} [${errorSteps.embedding}失败: ${errorMsg}]`
              }
            });
            return;
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        const errorMsg = `生成${fileType === 'image' ? '图片' : '视频'}向量失败: ${errorMessage}`;
        logger.error("Multimodal embedding failed", error, { fileId, fileType });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.embedding}失败: ${errorMsg}]`
          }
        });
        return;
      }
      
      // 准备数据（在事务外）
      const floatArray = new Float32Array(embedding);
      const embeddingBuffer = Buffer.from(floatArray.buffer);
      const vectorDimensions = embeddingConfig.dimensions || embedding.length || 1536;
      
      // 使用最小化的事务（只包含数据库操作）
      try {
        await db.$transaction(async (tx) => {
          await tx.documentChunk.deleteMany({ where: { fileId } });
          
          // 创建 chunk（使用 Prisma）
          const createdChunk = await tx.documentChunk.create({
            data: {
              content: fileType === 'image' ? `[Image: ${fileName}]` : `[Video: ${fileName}]`,
              tokenCount: 0, // 图像/视频没有token计数
              embedding: embeddingBuffer, // 保留旧列用于兼容性
              fileId: fileId
            }
          });
          
          // 在事务中更新向量（使用验证逻辑以确保安全性）
          // 使用embedding模型的维度，而不是硬编码的维度
          const actualVectorDimensions = vectorDimensions;
          const actualDimensions = embedding.length;
          
          // 验证维度匹配（pgvector 要求维度完全匹配）
          if (actualDimensions !== actualVectorDimensions) {
            throw new Error(
              `向量维度不匹配: 期望 ${actualVectorDimensions} 维（模型: ${embeddingConfig.model}），实际 ${actualDimensions} 维。`
            );
          }
          
          // 验证所有元素都是有效的数字（防止注入）
          for (let i = 0; i < embedding.length; i++) {
            const value = embedding[i];
            if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
              throw new Error(`向量第 ${i} 个元素无效: 必须是有限数字，得到 ${value}`);
            }
          }
          
          // 格式化向量字符串（确保安全）
          const cleanedValues = embedding.map(val => {
            const num = Number(val);
            if (!isFinite(num) || isNaN(num)) {
              throw new Error(`无效的向量值: ${val}`);
            }
            return num.toString();
          });
          const vectorStr = `[${cleanedValues.join(',')}]`;
          
          // 在事务中更新向量
          // 注意：向量字符串已经过严格验证和清理，维度使用模型的维度，chunkId 使用参数化查询
          await tx.$executeRawUnsafe(
            `UPDATE "DocumentChunk" SET "embedding_vector" = '${vectorStr}'::vector(${actualVectorDimensions}) WHERE id = $1`,
            createdChunk.id
          );
          
          await tx.file.update({
            where: { id: fileId },
            data: {
              status: "completed",
              tokens: 0
            }
          });
        }, {
          timeout: 30000, // 设置事务超时时间
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "未知错误";
        let errorMsg = `存储向量数据失败: ${errorMessage}`;
        // 检查是否是 pgvector 扩展未安装的错误
        if (error instanceof Error && error.message.includes('type "vector" does not exist')) {
          errorMsg = `存储向量数据失败: pgvector 扩展未安装。请参考 docs/PGVECTOR_SETUP.md 安装 pgvector 扩展`;
        }
        logger.error("Vector storage error", error, { fileId });
        await db.file.update({
          where: { id: fileId },
          data: { 
            status: "failed",
            name: `${fileName} [${errorSteps.storage}失败: ${errorMsg}]`
          }
        });
        return;
      }
      
      logger.info("Multimodal embedding processing completed", { fileId, fileType });
    } else {
      // 不支持的文件类型或模型不支持多模态
      logger.warn("File type not supported for embedding", { fileId, fileType, supportsMultimodal });
      await db.file.update({
        where: { id: fileId },
        data: { status: "completed" }
      });
      return;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    const errorMsg = `处理过程中发生未知错误: ${errorMessage}`;
    logger.error("Embedding processing error", error, { 
      fileId, 
      fileName,
      fileType,
      projectId 
    });
    // 更新状态为failed，并记录错误信息
    await db.file.update({
      where: { id: fileId },
      data: { 
        status: "failed",
        name: `${fileName} [处理失败: ${errorMsg}]`
      }
    }).catch((updateErr: unknown) => {
      logger.error("Failed to update file status after error", updateErr, { fileId });
    });
    // 不再抛出错误，避免影响文件上传流程
  }
}
