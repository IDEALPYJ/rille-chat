import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * 检查数据库是否包含必需的 pgvector 列
 * 在应用启动时调用，确保数据库结构正确
 */
export async function checkDatabaseSchema(): Promise<boolean> {
  // 仅在非测试环境检查
  if (env.NODE_ENV === "test") {
    return true;
  }

  try {
    // 检查 DocumentChunk 表是否存在 embedding_vector 列
    const result = await db.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'DocumentChunk' 
      AND column_name = 'embedding_vector'
    `;

    if (result.length === 0) {
      logger.error(
        "Database schema check failed: embedding_vector column not found in DocumentChunk table. " +
        "Please run the migration: prisma migrate deploy",
        undefined,
        {
          table: "DocumentChunk",
          expectedColumn: "embedding_vector",
        }
      );
      return false;
    }

    // 检查 HNSW 索引是否存在
    const indexResult = await db.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'DocumentChunk' 
      AND indexname = 'embedding_hnsw_idx'
    `;

    if (indexResult.length === 0) {
      logger.warn(
        "Database schema check: HNSW index 'embedding_hnsw_idx' not found. " +
        "Vector search performance may be degraded. Consider running the migration.",
        {
          table: "DocumentChunk",
          expectedIndex: "embedding_hnsw_idx",
        }
      );
      // 索引缺失不是致命错误，只记录警告
    }

    logger.info("Database schema check passed", {
      hasEmbeddingVector: true,
      hasHNSWIndex: indexResult.length > 0,
    });

    return true;
  } catch (error) {
    logger.error("Failed to check database schema", error);
    // 在检查失败时，不阻止应用启动（可能是权限问题等）
    // 但记录错误以便排查
    return true; // 允许启动，但记录错误
  }
}

/**
 * 在应用启动时执行 schema 检查
 * 应该在应用初始化时调用
 */
export async function initializeSchemaCheck(): Promise<void> {
  if (env.NODE_ENV === "production") {
    // 生产环境强制检查
    const passed = await checkDatabaseSchema();
    if (!passed) {
      logger.error(
        "Critical: Database schema check failed in production. Application may not function correctly.",
        undefined,
        {
          action: "Please run 'prisma migrate deploy' to apply missing migrations",
        }
      );
      // 在生产环境中，可以选择抛出错误阻止启动
      // throw new Error("Database schema check failed");
    }
  } else {
    // 开发环境只记录警告
    await checkDatabaseSchema();
  }
}

