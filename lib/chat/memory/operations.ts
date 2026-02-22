/**
 * 记忆操作服务
 * 执行记忆操作：add, update, delete
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { MemoryOperation, MemoryStatus, RetrievalMode } from "./types";
import { generateEmbedding, embeddingToBuffer } from "./embedding";

/**
 * 执行记忆操作列表
 * @param operations 操作列表
 * @param userId 用户 ID
 * @param projectId 项目 ID
 * @param mode 检索模式
 * @param embeddingModel Embedding 模型配置
 * @param providers 用户配置
 * @returns 执行结果
 */
export async function executeMemoryOperations(
  operations: MemoryOperation[],
  userId: string,
  projectId: string | undefined,
  mode: RetrievalMode,
  embeddingModel: string | undefined,
  providers: Record<string, any>
): Promise<{
  added: number;
  updated: number;
  deleted: number;
  archived: number;
}> {
  const result = {
    added: 0,
    updated: 0,
    deleted: 0,
    archived: 0,
  };

  for (const op of operations) {
    try {
      switch (op.action) {
        case "add":
          await executeAdd(op, userId, projectId, mode, embeddingModel, providers);
          result.added++;
          break;
        case "update":
          await executeUpdate(op, userId, projectId, mode, embeddingModel, providers);
          result.updated++;
          break;
        case "delete":
          await executeDelete(op, userId);
          result.deleted++;
          break;
      }
    } catch (error) {
      logger.error("Failed to execute memory operation", {
        error,
        userId,
        action: op.action,
        content: op.content?.slice(0, 100),
      });
    }
  }

  return result;
}

/**
 * 执行添加操作
 */
async function executeAdd(
  op: MemoryOperation,
  userId: string,
  projectId: string | undefined,
  mode: RetrievalMode,
  embeddingModel: string | undefined,
  providers: Record<string, any>
): Promise<void> {
  // 1. 解析项目 ID
  const targetProjectId = await resolveProjectId(projectId, userId);

  // 2. 生成 embedding（如果是向量模式）
  let embeddingBuffer: Buffer | null = null;
  if (mode === "vector" && embeddingModel) {
    const embeddingResult = await generateEmbedding(op.content, embeddingModel, providers);
    if (embeddingResult) {
      embeddingBuffer = embeddingToBuffer(embeddingResult.embedding);
    }
  }

  // 3. 确定初始状态
  // Profile 类型或重要性 >= 4 的直接设为 active，否则为 candidate
  const initialStatus: MemoryStatus =
    op.importance >= 4 || op.root === "Profile" ? "active" : "candidate";

  // 4. 插入数据库
  await db.$executeRaw`
    INSERT INTO "Memory" (
      id,
      content,
      "embedding_vector",
      "root",
      "status",
      "frequency",
      "importance",
      "last_accessed",
      "userId",
      "projectId",
      "createdAt",
      "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      ${op.content},
      ${embeddingBuffer}::bytea,
      ${op.root},
      ${initialStatus},
      1,
      ${op.importance},
      NOW(),
      ${userId},
      ${targetProjectId},
      NOW(),
      NOW()
    )
  `;

  logger.debug("Memory added", {
    userId,
    root: op.root,
    status: initialStatus,
    importance: op.importance,
  });
}

/**
 * 执行更新操作
 * 策略：归档旧记忆，创建新记忆
 */
async function executeUpdate(
  op: MemoryOperation,
  userId: string,
  projectId: string | undefined,
  mode: RetrievalMode,
  embeddingModel: string | undefined,
  providers: Record<string, any>
): Promise<void> {
  // 1. 如果有 targetId，归档旧记忆
  if (op.targetId) {
    await db.$executeRaw`
      UPDATE "Memory"
      SET 
        "status" = 'archived',
        "updatedAt" = NOW()
      WHERE id = ${op.targetId}
        AND "userId" = ${userId}
    `;
  }

  // 2. 创建新记忆（复用 add 逻辑）
  await executeAdd(op, userId, projectId, mode, embeddingModel, providers);

  logger.debug("Memory updated", {
    userId,
    oldId: op.targetId,
    newContent: op.content.slice(0, 100),
  });
}

/**
 * 执行删除操作
 * 逻辑删除：标记为 archived
 */
async function executeDelete(op: MemoryOperation, userId: string): Promise<void> {
  const targetId = op.targetId;

  if (!targetId) {
    logger.warn("Delete operation missing targetId", { userId });
    return;
  }

  await db.$executeRaw`
    UPDATE "Memory"
    SET 
      "status" = 'archived',
      "updatedAt" = NOW()
    WHERE id = ${targetId}
      AND "userId" = ${userId}
  `;

  logger.debug("Memory deleted (archived)", {
    userId,
    targetId,
  });
}

/**
 * 解析项目 ID
 * 检查项目是否启用了记忆隔离
 */
async function resolveProjectId(
  projectId: string | undefined,
  userId: string
): Promise<string | null> {
  if (!projectId) {
    return null;
  }

  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { memoryIsolated: true },
    });

    if (project?.memoryIsolated) {
      return projectId;
    }

    return null;
  } catch (error) {
    logger.error("Failed to resolve project ID", { error, projectId, userId });
    return null;
  }
}

/**
 * 晋升候选记忆为活跃状态
 * 当发现相似记忆时调用
 * @param memoryId 记忆 ID
 * @param similarity 相似度
 */
export async function promoteCandidateMemory(
  memoryId: string,
  similarity: number
): Promise<boolean> {
  try {
    // 只处理 candidate 状态的记忆
    // 相似度阈值：向量模式 0.95，关键词模式 0.8
    const threshold = similarity > 0.95 ? 0.95 : 0.8;

    if (similarity < threshold) {
      return false;
    }

    const result = await db.$executeRaw`
      UPDATE "Memory"
      SET 
        "status" = 'active',
        "frequency" = "frequency" + 1,
        "last_accessed" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${memoryId}
        AND "status" = 'candidate'
    `;

    if (result > 0) {
      logger.debug("Memory promoted to active", { memoryId, similarity });
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Failed to promote candidate memory", { error, memoryId });
    return false;
  }
}

/**
 * 检查记忆是否存在且活跃
 */
export async function isMemoryActive(
  memoryId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await db.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM "Memory"
      WHERE id = ${memoryId}
        AND "userId" = ${userId}
        AND "status" = 'active'
    `;

    return result[0]?.count > 0;
  } catch (error) {
    logger.error("Failed to check memory status", { error, memoryId, userId });
    return false;
  }
}

/**
 * 批量归档过期记忆
 * 用于清理长期未访问的 Context 类型记忆
 * @param userId 用户 ID
 * @param days 未访问天数阈值
 * @returns 归档数量
 */
export async function archiveStaleMemories(
  userId: string,
  days: number = 30
): Promise<number> {
  try {
    const result = await db.$executeRaw`
      UPDATE "Memory"
      SET 
        "status" = 'archived',
        "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "status" = 'active'
        AND "root" = 'Context'
        AND "last_accessed" < NOW() - ${days} * INTERVAL '1 day'
    `;

    logger.info("Archived stale memories", {
      userId,
      count: result,
      days,
    });

    return result;
  } catch (error) {
    logger.error("Failed to archive stale memories", { error, userId });
    return 0;
  }
}
