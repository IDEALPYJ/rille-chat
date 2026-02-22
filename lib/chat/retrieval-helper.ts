/**
 * 向量检索辅助函数
 * 用于从项目的文档中检索相关的 chunks
 */

import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { getEmbeddingConfigFromProject, getEmbedding } from "@/lib/embedding/embedding-helper";

export interface RetrievalChunk {
  id: string;
  content: string;
  tokenCount: number;
  fileId: string;
  fileName?: string;
  fileType?: string; // MIME type
  similarity: number;
  // 元数据字段
  chunkIndex?: number;
  pageNumber?: number;
  sectionTitle?: string;
}

/**
 * 将向量数组格式化为 PostgreSQL 数组字符串
 */
function formatVectorArray(embedding: number[]): string {
  return `{${embedding.join(',')}}`;
}

/**
 * 从项目的文档中检索最相关的 chunks
 * 使用 PostgreSQL 函数计算余弦相似度
 * @param query 查询文本
 * @param projectId 项目ID
 * @param userId 用户ID
 * @param topK 返回最相关的K个结果，默认5
 * @returns 检索到的chunks，按相似度降序排列
 */
export async function searchRelevantChunks(
  query: string,
  projectId: string,
  userId: string,
  topK: number = 5
): Promise<RetrievalChunk[]> {
  try {
    // 1. 获取项目的 embedding 配置
    const embeddingConfig = await getEmbeddingConfigFromProject(projectId, userId);
    if (!embeddingConfig) {
      logger.warn("Embedding config not found for project", { projectId, userId });
      return [];
    }

    // 2. 对查询文本进行向量化
    const queryVector = await getEmbedding(query, embeddingConfig);
    if (!queryVector || queryVector.length === 0) {
      logger.error("Failed to generate query embedding", { projectId, userId });
      return [];
    }

    // 3. 获取项目的文件ID列表
    const files = await db.file.findMany({
      where: {
        projectId: projectId,
        userId: userId,
        status: "completed",
      },
      select: { id: true },
    });

    if (files.length === 0) {
      logger.info("No files found for retrieval", { projectId, userId });
      return [];
    }

    const fileIds = files.map(f => f.id);

    // 4. 将查询向量格式化为 PostgreSQL 数组
    const vectorArray = formatVectorArray(queryVector);
    
    logger.debug("Searching with embedding", {
      projectId,
      queryVectorLength: queryVector.length,
      fileIdsCount: fileIds.length,
      topK,
    });

    // 5. 使用数据库函数 match_document_chunks 进行相似度搜索
    // 阈值设为 0.3，因为不同模型的向量分布不同
    const SIMILARITY_THRESHOLD = 0.3;
    const results = await db.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      file_id: string;
      chunk_index: number | null;
      similarity: number;
    }>>(`
      SELECT * FROM match_document_chunks(
        '${vectorArray}'::real[],
        ${SIMILARITY_THRESHOLD},
        ${topK},
        ARRAY[${fileIds.map(id => `'${id}'`).join(',')}]::text[]
      )
    `);

    if (results.length === 0) {
      logger.info("No chunks found for retrieval", { 
        projectId, 
        userId,
        queryVectorLength: queryVector.length,
        fileIdsCount: fileIds.length,
        threshold: SIMILARITY_THRESHOLD,
      });
      return [];
    }
    
    // 查询文件名称和类型（需要单独查询因为函数返回不包含 fileName 和 type）
    const fileDetails = await db.file.findMany({
      where: { id: { in: results.map(r => r.file_id) } },
      select: { id: true, name: true, type: true },
    });
    const fileNameMap = new Map(fileDetails.map(f => [f.id, f.name]));
    const fileTypeMap = new Map(fileDetails.map(f => [f.id, f.type]));

    logger.info("Retrieved chunks using cosine similarity", {
      projectId,
      userId,
      topK: results.length,
      similarities: results.map(r => Number(r.similarity)),
    });

    return results.map(r => ({
      id: r.id,
      content: r.content,
      tokenCount: 0, // 需要从 DocumentChunk 查询
      fileId: r.file_id,
      fileName: fileNameMap.get(r.file_id) || undefined,
      fileType: fileTypeMap.get(r.file_id) || undefined,
      similarity: Number(r.similarity),
      chunkIndex: r.chunk_index ?? undefined,
    }));
  } catch (error: any) {
    logger.error("Search failed", {
      error: error.message,
      projectId,
      userId,
    });
    return [];
  }
}

/**
 * 格式化检索内容为 prompt
 * @param chunks 检索到的 chunks
 * @returns 格式化后的 prompt 文本
 */
export function formatRetrievalContextForPrompt(chunks: RetrievalChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const contextText = chunks
    .map((chunk, index) => {
      // 构建元数据信息
      const metadata: string[] = [];
      if (chunk.fileName) metadata.push(`文件: ${chunk.fileName}`);
      if (chunk.chunkIndex !== undefined) metadata.push(`块 ${chunk.chunkIndex + 1}`);
      if (chunk.pageNumber) metadata.push(`第 ${chunk.pageNumber} 页`);
      if (chunk.sectionTitle) metadata.push(`章节: ${chunk.sectionTitle}`);
      
      const sourceInfo = metadata.length > 0 ? ` (${metadata.join(', ')})` : "";
      return `[Reference ${index + 1}${sourceInfo}]\n${chunk.content}`;
    })
    .join("\n\n");

  return `
<RetrievedContext>
The following content has been retrieved from your knowledge base and is highly relevant to the user's question. Please use this information to provide accurate and detailed answers.

${contextText}

IMPORTANT INSTRUCTIONS:
1. Prioritize information from the retrieved context when it directly answers the user's question
2. If the retrieved context is relevant, cite it in your response (e.g., "According to Reference 1 from [文件名]...")
3. You can combine information from the retrieved context with your own knowledge
4. If the retrieved context is not relevant to the question, you may ignore it and use your own knowledge or web search results instead
5. If web search results are also provided, integrate both sources appropriately
</RetrievedContext>
`.trim();
}
