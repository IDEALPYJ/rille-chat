/**
 * 批量向量化服务
 * 批量向量化历史记忆
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateEmbedding, embeddingToBuffer } from "./embedding";

/**
 * 向量化进度
 */
export interface VectorizationProgress {
  /** 总数 */
  total: number;
  /** 已完成 */
  completed: number;
  /** 失败 */
  failed: number;
  /** 当前处理中的记忆 ID */
  currentMemoryId?: string;
  /** 预计剩余时间（秒） */
  estimatedTimeRemaining?: number;
}

/**
 * 向量化结果
 */
export interface VectorizationResult {
  /** 总数 */
  total: number;
  /** 成功 */
  success: number;
  /** 失败 */
  failed: number;
  /** 失败的记忆 ID 列表 */
  failedIds: string[];
}

/**
 * 批量向量化选项
 */
export interface BatchVectorizationOptions {
  /** 用户 ID */
  userId: string;
  /** Embedding 模型配置 */
  embeddingModel: string;
  /** 提供商配置 */
  providers: Record<string, any>;
  /** 进度回调 */
  onProgress?: (progress: VectorizationProgress) => void;
  /** 取消信号 */
  signal?: AbortSignal;
}

/**
 * 获取未向量化的记忆
 */
export async function getUnvectorizedMemories(
  userId: string,
  limit?: number
): Promise<Array<{ id: string; content: string }>> {
  const sql = `
    SELECT id, content
    FROM "Memory"
    WHERE "userId" = $1
      AND "embedding_vector" IS NULL
      AND "status" != 'archived'
    ORDER BY "createdAt" DESC
    ${limit ? `LIMIT ${limit}` : ""}
  `;

  const results = await db.$queryRawUnsafe<
    Array<{ id: string; content: string }>
  >(sql, userId);

  return results;
}

/**
 * 获取未向量化记忆数量
 */
export async function getUnvectorizedCount(userId: string): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count
    FROM "Memory"
    WHERE "userId" = $1
      AND "embedding_vector" IS NULL
      AND "status" != 'archived'
  `;

  const result = await db.$queryRawUnsafe<Array<{ count: number }>>(
    sql,
    userId
  );

  return Number(result[0]?.count || 0);
}

/**
 * 批量向量化记忆
 */
export async function batchVectorizeMemories(
  options: BatchVectorizationOptions
): Promise<VectorizationResult> {
  const { userId, embeddingModel, providers, onProgress, signal } = options;

  const result: VectorizationResult = {
    total: 0,
    success: 0,
    failed: 0,
    failedIds: [],
  };

  try {
    // 1. 获取未向量化的记忆
    const memories = await getUnvectorizedMemories(userId);
    result.total = memories.length;

    if (memories.length === 0) {
      logger.info("No unvectorized memories found", { userId });
      return result;
    }

    logger.info("Starting batch vectorization", {
      userId,
      total: memories.length,
      model: embeddingModel,
    });

    // 2. 分批处理（每批 5 条，避免 API 限流）
    const batchSize = 5;
    const startTime = Date.now();

    for (let i = 0; i < memories.length; i += batchSize) {
      // 检查取消信号
      if (signal?.aborted) {
        logger.info("Batch vectorization cancelled", { userId, processed: i });
        break;
      }

      const batch = memories.slice(i, i + batchSize);

      // 处理当前批次
      await Promise.all(
        batch.map(async (memory) => {
          try {
            // 生成 embedding
            const embeddingResult = await generateEmbedding(
              memory.content,
              embeddingModel,
              providers
            );

            if (!embeddingResult) {
              throw new Error("Failed to generate embedding");
            }

            // 转换为 Buffer
            const embeddingBuffer = embeddingToBuffer(
              embeddingResult.embedding
            );

            // 更新数据库
            await db.$executeRaw`
              UPDATE "Memory"
              SET "embedding_vector" = ${embeddingBuffer}::bytea
              WHERE id = ${memory.id}
            `;

            result.success++;
          } catch (error) {
            logger.error("Failed to vectorize memory", {
              error,
              memoryId: memory.id,
              userId,
            });
            result.failed++;
            result.failedIds.push(memory.id);
          }
        })
      );

      // 计算进度
      const completed = result.success + result.failed;
      const elapsed = (Date.now() - startTime) / 1000;
      const avgTimePerItem = elapsed / completed;
      const remaining = memories.length - completed;
      const estimatedTimeRemaining = Math.ceil(avgTimePerItem * remaining);

      // 回调进度
      onProgress?.({
        total: result.total,
        completed,
        failed: result.failed,
        currentMemoryId: batch[batch.length - 1]?.id,
        estimatedTimeRemaining,
      });

      // 批次间延迟，避免限流
      if (i + batchSize < memories.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logger.info("Batch vectorization completed", {
      userId,
      total: result.total,
      success: result.success,
      failed: result.failed,
    });

    return result;
  } catch (error) {
    logger.error("Batch vectorization failed", { error, userId });
    throw error;
  }
}

/**
 * 向量化单条记忆
 */
export async function vectorizeSingleMemory(
  memoryId: string,
  content: string,
  embeddingModel: string,
  providers: Record<string, any>
): Promise<boolean> {
  try {
    const embeddingResult = await generateEmbedding(
      content,
      embeddingModel,
      providers
    );

    if (!embeddingResult) {
      return false;
    }

    const embeddingBuffer = embeddingToBuffer(embeddingResult.embedding);

    await db.$executeRaw`
      UPDATE "Memory"
      SET "embedding_vector" = ${embeddingBuffer}::bytea
      WHERE id = ${memoryId}
    `;

    return true;
  } catch (error) {
    logger.error("Failed to vectorize single memory", { error, memoryId });
    return false;
  }
}

/**
 * 获取向量化统计信息
 */
export async function getVectorizationStats(userId: string): Promise<{
  total: number;
  vectorized: number;
  unvectorized: number;
  vectorizedPercentage: number;
}> {
  const sql = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN "embedding_vector" IS NOT NULL THEN 1 END) as vectorized,
      COUNT(CASE WHEN "embedding_vector" IS NULL THEN 1 END) as unvectorized
    FROM "Memory"
    WHERE "userId" = $1
      AND "status" != 'archived'
  `;

  const result = await db.$queryRawUnsafe<
    Array<{
      total: number;
      vectorized: number;
      unvectorized: number;
    }>
  >(sql, userId);

  const stats = result[0];
  const total = Number(stats.total || 0);
  const vectorized = Number(stats.vectorized || 0);
  const unvectorized = Number(stats.unvectorized || 0);

  return {
    total,
    vectorized,
    unvectorized,
    vectorizedPercentage: total > 0 ? Math.round((vectorized / total) * 100) : 0,
  };
}
