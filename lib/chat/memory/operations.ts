/**
 * 记忆操作服务
 * 执行记忆操作：add, update, delete
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Memory, MemoryOperation, MemoryStatus, RetrievalMode } from "./types";
import { generateEmbedding, embeddingToBuffer } from "./embedding";
import { computeContentHash, calculateTextSimilarity } from "./duplicate-detection";
import { selectMergeStrategy, executeMerge } from "./smart-merge";
import { findSimilarMemories } from "./retrieval";

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
 * 执行添加操作（增强版，带重复检测和智能合并）
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

  // 2. 重复检测（新增）
  const duplicateCheck = await checkDuplicateInDB(op, userId, targetProjectId);
  
  if (duplicateCheck.isDuplicate) {
    switch (duplicateCheck.recommendedAction) {
      case 'skip':
        logger.debug("Duplicate memory skipped", {
          type: duplicateCheck.duplicateType,
          similarity: duplicateCheck.similarity,
        });
        return;
        
      case 'update':
        // 用新内容更新现有记忆
        if (duplicateCheck.existingMemory) {
          await updateExistingMemory(duplicateCheck.existingMemory.id, op, mode, embeddingModel, providers);
          logger.debug("Memory updated (superset)", {
            existingId: duplicateCheck.existingMemory.id,
          });
          return;
        }
        break;
        
      case 'merge':
        // 智能合并
        if (duplicateCheck.existingMemory) {
          await mergeWithExisting(duplicateCheck.existingMemory, op, mode, embeddingModel, providers);
          logger.debug("Memory merged", {
            existingId: duplicateCheck.existingMemory.id,
          });
          return;
        }
        break;
    }
  }

  // 3. 生成 embedding（如果是向量模式）
  let embeddingBuffer: Buffer | null = null;
  if (mode === "vector" && embeddingModel) {
    const embeddingResult = await generateEmbedding(op.content, embeddingModel, providers);
    if (embeddingResult) {
      embeddingBuffer = embeddingToBuffer(embeddingResult.embedding);
    }
  }

  // 4. 计算内容哈希（新增）
  const contentHash = computeContentHash(op.content);

  // 5. 确定初始状态（已放宽：重要性 >= 3 或关键类型直接设为 active）
  // 放宽条件让更多记忆可直接被检索
  const isKeyRoot = op.root === "Profile" || op.root === "Ability" || op.root === "Goal";
  const initialStatus: MemoryStatus =
    op.importance >= 3 || isKeyRoot ? "active" : "candidate";

  // 6. 插入数据库
  await db.$executeRaw`
    INSERT INTO "Memory" (
      id,
      content,
      "contentHash",
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
      ${contentHash},
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
 * 在数据库中检查重复
 */
async function checkDuplicateInDB(
  newMemory: MemoryOperation,
  userId: string,
  projectId: string | null
): Promise<{
  isDuplicate: boolean;
  duplicateType: 'exact' | 'semantic' | 'superset' | 'subset' | 'none';
  existingMemory?: Memory;
  similarity: number;
  recommendedAction: 'skip' | 'merge' | 'update' | 'keep';
}> {
  // 1. 精确匹配（内容完全相同）
  const exactMatch = await db.$queryRaw<Memory[]>`
    SELECT * FROM "Memory"
    WHERE "userId" = ${userId}
      AND ("projectId" IS NULL OR "projectId" = ${projectId})
      AND "status" IN ('active', 'candidate')
      AND content = ${newMemory.content}
    LIMIT 1
  `;
  
  if (exactMatch.length > 0) {
    return {
      isDuplicate: true,
      duplicateType: 'exact',
      existingMemory: exactMatch[0],
      similarity: 1.0,
      recommendedAction: 'skip',
    };
  }
  
  // 2. 获取用户的活跃记忆进行相似度比较
  const existingMemories = await db.$queryRaw<Memory[]>`
    SELECT * FROM "Memory"
    WHERE "userId" = ${userId}
      AND ("projectId" IS NULL OR "projectId" = ${projectId})
      AND "status" IN ('active', 'candidate')
    ORDER BY "last_accessed" DESC
    LIMIT 50
  `;
  
  if (existingMemories.length === 0) {
    return {
      isDuplicate: false,
      duplicateType: 'none',
      similarity: 0,
      recommendedAction: 'keep',
    };
  }
  
  // 3. 文本相似度检查
  let bestMatch: Memory | undefined;
  let bestSimilarity = 0;
  
  for (const memory of existingMemories) {
    const similarity = calculateTextSimilarity(newMemory.content, memory.content);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = memory;
    }
  }
  
  // 4. 判断重复类型
  if (bestSimilarity >= 0.95 && bestMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'semantic',
      existingMemory: bestMatch,
      similarity: bestSimilarity,
      recommendedAction: 'skip',
    };
  }
  
  if (bestSimilarity >= 0.85 && bestMatch) {
    const newLower = newMemory.content.toLowerCase();
    const existingLower = bestMatch.content.toLowerCase();
    
    if (newLower.includes(existingLower) && newLower.length > existingLower.length * 1.3) {
      return {
        isDuplicate: true,
        duplicateType: 'superset',
        existingMemory: bestMatch,
        similarity: bestSimilarity,
        recommendedAction: 'update',
      };
    }
    
    if (existingLower.includes(newLower) && existingLower.length > newLower.length * 1.3) {
      return {
        isDuplicate: true,
        duplicateType: 'subset',
        existingMemory: bestMatch,
        similarity: bestSimilarity,
        recommendedAction: 'skip',
      };
    }
    
    return {
      isDuplicate: false,
      duplicateType: 'none',
      existingMemory: bestMatch,
      similarity: bestSimilarity,
      recommendedAction: 'merge',
    };
  }
  
  return {
    isDuplicate: false,
    duplicateType: 'none',
    similarity: bestSimilarity,
    recommendedAction: 'keep',
  };
}

/**
 * 更新现有记忆
 */
async function updateExistingMemory(
  memoryId: string,
  op: MemoryOperation,
  mode: RetrievalMode,
  embeddingModel: string | undefined,
  providers: Record<string, any>
): Promise<void> {
  // 生成新的 embedding
  let embeddingBuffer: Buffer | null = null;
  if (mode === "vector" && embeddingModel) {
    const embeddingResult = await generateEmbedding(op.content, embeddingModel, providers);
    if (embeddingResult) {
      embeddingBuffer = embeddingToBuffer(embeddingResult.embedding);
    }
  }
  
  const contentHash = computeContentHash(op.content);
  
  await db.$executeRaw`
    UPDATE "Memory"
    SET 
      content = ${op.content},
      "contentHash" = ${contentHash},
      "embedding_vector" = ${embeddingBuffer}::bytea,
      "root" = ${op.root},
      "importance" = ${op.importance},
      "frequency" = "frequency" + 1,
      "last_accessed" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${memoryId}
  `;
}

/**
 * 与现有记忆合并
 */
async function mergeWithExisting(
  existing: Memory,
  op: MemoryOperation,
  mode: RetrievalMode,
  embeddingModel: string | undefined,
  providers: Record<string, any>
): Promise<void> {
  const strategy = selectMergeStrategy(existing, op);
  
  if (strategy.type === 'skip') {
    // 只增加频率
    await db.$executeRaw`
      UPDATE "Memory"
      SET 
        "frequency" = "frequency" + 1,
        "last_accessed" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${existing.id}
    `;
    return;
  }
  
  // 执行合并（不使用 LLM，简化处理）
  const mergeResult = await executeMerge(existing, op, strategy);
  
  if (mergeResult.success) {
    // 生成新的 embedding
    let embeddingBuffer: Buffer | null = null;
    if (mode === "vector" && embeddingModel) {
      const embeddingResult = await generateEmbedding(mergeResult.finalContent, embeddingModel, providers);
      if (embeddingResult) {
        embeddingBuffer = embeddingToBuffer(embeddingResult.embedding);
      }
    }
    
    const contentHash = computeContentHash(mergeResult.finalContent);
    
    await db.$executeRaw`
      UPDATE "Memory"
      SET 
        content = ${mergeResult.finalContent},
        "contentHash" = ${contentHash},
        "embedding_vector" = ${embeddingBuffer}::bytea,
        "frequency" = "frequency" + 1,
        "last_accessed" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${existing.id}
    `;
  }
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
