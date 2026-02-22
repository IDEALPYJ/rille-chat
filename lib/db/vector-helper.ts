import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * 统一的向量数据操作封装
 * 使用 PostgreSQL real[] 数组存储，支持任意维度（无 2000 维限制）
 */
export class VectorHelper {
  /**
   * 验证向量数据的格式和内容
   * @param embedding 向量数组
   * @param expectedDimensions 期望的维度（可选，用于验证）
   */
  private static validateEmbedding(
    embedding: number[],
    expectedDimensions?: number
  ): void {
    // 验证数组不为空
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("向量数组不能为空");
    }

    // 验证期望维度（如果提供）
    if (expectedDimensions !== undefined && embedding.length !== expectedDimensions) {
      throw new Error(
        `向量维度不匹配: 期望 ${expectedDimensions} 维，实际 ${embedding.length} 维`
      );
    }

    // 验证所有元素都是有效的数字
    for (let i = 0; i < embedding.length; i++) {
      const value = embedding[i];
      if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) {
        throw new Error(`向量第 ${i} 个元素无效: 必须是有限数字，得到 ${value}`);
      }
    }
  }

  /**
   * 验证 chunkId 格式
   * @param chunkId DocumentChunk ID
   */
  private static validateChunkId(chunkId: string): void {
    if (!chunkId || typeof chunkId !== 'string') {
      throw new Error("chunkId 必须是非空字符串");
    }
    
    // 验证 ID 格式
    const isValidId = /^[a-zA-Z0-9_-]{1,255}$/.test(chunkId);
    if (!isValidId) {
      throw new Error(`无效的 chunkId 格式: ${chunkId}`);
    }
  }

  /**
   * 将向量数组格式化为 PostgreSQL 数组字符串
   * @param embedding 向量数组
   * @returns PostgreSQL 数组字符串，如 '{0.1,0.2,0.3}'
   */
  private static formatVectorArray(embedding: number[]): string {
    // 确保所有值都是数字
    const cleanedValues = embedding.map(val => {
      const num = Number(val);
      if (!isFinite(num) || isNaN(num)) {
        throw new Error(`无效的向量值: ${val}`);
      }
      return num.toString();
    });
    
    // PostgreSQL 数组格式: {1,2,3}
    return `{${cleanedValues.join(',')}}`;
  }

  /**
   * 更新 DocumentChunk 的向量数据
   * @param chunkId DocumentChunk ID
   * @param embedding 向量数组
   * @param dimensions 向量维度（用于记录）
   */
  static async updateChunkVector(
    chunkId: string,
    embedding: number[],
    dimensions: number
  ): Promise<void> {
    // 验证输入参数
    this.validateChunkId(chunkId);
    this.validateEmbedding(embedding, dimensions);

    // 格式化为 PostgreSQL 数组
    const vectorArray = this.formatVectorArray(embedding);

    try {
      // 使用参数化查询更新向量和维度
      await db.$executeRawUnsafe(
        `UPDATE "DocumentChunk" 
         SET "embedding_vector" = $1::real[], 
             "embedding_dimensions" = $2 
         WHERE id = $3`,
        vectorArray,
        dimensions,
        chunkId
      );
    } catch (error: unknown) {
      logger.error("更新向量数据失败", error, { chunkId, dimensions: embedding.length });
      throw error;
    }
  }

  /**
   * 批量更新多个 chunks 的向量数据
   */
  static async batchUpdateChunkVectors(
    updates: Array<{ chunkId: string; embedding: number[]; dimensions: number }>
  ): Promise<void> {
    // 验证输入数组
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("更新数组不能为空");
    }

    // 验证所有向量的格式和维度
    for (let i = 0; i < updates.length; i++) {
      const { chunkId, embedding, dimensions } = updates[i];
      this.validateChunkId(chunkId);
      this.validateEmbedding(embedding, dimensions);
    }

    try {
      // 使用事务确保原子性
      await db.$transaction(async (tx) => {
        for (const { chunkId, embedding, dimensions } of updates) {
          const vectorArray = this.formatVectorArray(embedding);
          await tx.$executeRawUnsafe(
            `UPDATE "DocumentChunk" 
             SET "embedding_vector" = $1::real[], 
                 "embedding_dimensions" = $2 
             WHERE id = $3`,
            vectorArray,
            dimensions,
            chunkId
          );
        }
      });
    } catch (error: unknown) {
      logger.error("批量更新向量数据失败", error, { 
        updateCount: updates.length
      });
      throw error;
    }
  }

  /**
   * 创建 DocumentChunk 并设置向量（原子操作）
   */
  static async createChunkWithVector(
    data: {
      content: string;
      tokenCount: number;
      embedding: Buffer;
      embeddingVector: number[];
      vectorDimensions: number;
      fileId: string;
      chunkIndex?: number;
    }
  ): Promise<string> {
    // 先创建记录
    const chunk = await db.documentChunk.create({
      data: {
        content: data.content,
        tokenCount: data.tokenCount,
        embedding: data.embedding,
        fileId: data.fileId,
        chunkIndex: data.chunkIndex,
      }
    });

    // 然后更新向量
    await this.updateChunkVector(
      chunk.id,
      data.embeddingVector,
      data.vectorDimensions
    );

    return chunk.id;
  }

  /**
   * 批量创建 DocumentChunks 并设置向量
   */
  static async batchCreateChunksWithVectors(
    chunks: Array<{
      content: string;
      tokenCount: number;
      embedding: Buffer;
      embeddingVector: number[];
      vectorDimensions: number;
      fileId: string;
      chunkIndex?: number;
    }>
  ): Promise<string[]> {
    // 先批量创建记录
    const createdChunks = await Promise.all(
      chunks.map(chunk =>
        db.documentChunk.create({
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

    // 然后批量更新向量
    await this.batchUpdateChunkVectors(
      createdChunks.map((createdChunk, i) => ({
        chunkId: createdChunk.id,
        embedding: chunks[i].embeddingVector,
        dimensions: chunks[i].vectorDimensions,
      }))
    );

    return createdChunks.map(chunk => chunk.id);
  }
}
