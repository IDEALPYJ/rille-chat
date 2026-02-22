/**
 * 记忆检索服务
 * 混合模式检索：优先向量检索，回退关键词检索
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  RetrievalOptions,
  MemoryRetrievalResult,
  RetrievalMode,
  MemoryRoot,
  calculateDecayFactor,
} from "./types";
import { generateEmbedding, isVectorModeEnabled } from "./embedding";

/**
 * 执行记忆检索（智能混合模式）
 * @param options 检索选项
 * @param providers 用户配置的 providers
 * @returns 检索结果
 */
export async function retrieveMemories(
  options: RetrievalOptions,
  providers: Record<string, any>
): Promise<MemoryRetrievalResult[]> {
  const { mode, query, userId } = options;
  
  try {
    if (mode === "vector") {
      // 向量模式：使用混合检索（优先向量，补充关键词）
      return await retrieveHybrid(options, providers);
    } else {
      // 关键词模式：纯关键词检索
      return await retrieveByKeyword(options);
    }
  } catch (_error) {
    logger.error("Memory retrieval failed", {
      error: _error,
      mode,
      userId,
      query: query.slice(0, 100),
    });
    return [];
  }
}

/**
 * 混合检索模式
 * 1. 优先检索有向量的记忆（向量相似度）
 * 2. 如果结果不足，补充检索无向量的记忆（关键词匹配）
 */
async function retrieveHybrid(
  options: RetrievalOptions,
  providers: Record<string, any>
): Promise<MemoryRetrievalResult[]> {
  const { query, userId, projectId, limit = 5, maxTokens = 2000 } = options;
  
  // 1. 生成查询的 embedding
  const embeddingResult = await generateEmbedding(
    query,
    providers.memory?.embeddingModel,
    providers
  );
  
  if (!embeddingResult) {
    logger.warn("Failed to generate query embedding, falling back to keyword mode");
    return retrieveByKeyword(options);
  }
  
  // 2. 构建向量数组字符串用于 SQL
  const vectorStr = `[${embeddingResult.embedding.join(",")}]`;
  
  // 3. 先检索有向量的记忆
  const vectorSql = `
    SELECT 
      id,
      content,
      "root",
      "importance",
      "frequency",
      "status",
      "last_accessed",
      "createdAt",
      -- 语义相似度 (1 - 余弦距离)
      (1 - ("embedding_vector" <=> $1::vector)) as semantic_score,
      -- 时效性奖励：Context 类型且在 24 小时内给予加分
      CASE 
        WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
        ELSE 0
      END as recency_bonus,
      -- 综合评分
      (
        (1 - ("embedding_vector" <=> $1::vector)) * 0.7 +
        CASE 
          WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
          ELSE 0
        END +
        ("importance" * 0.02)
      ) as final_score
    FROM "Memory"
    WHERE "userId" = $2
      AND "status" = 'active'
      AND ("projectId" IS NULL OR "projectId" = $3)
      AND "embedding_vector" IS NOT NULL
    ORDER BY final_score DESC
    LIMIT $4
  `;
  
  const vectorResults = await db.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      root: MemoryRoot | null;
      importance: number;
      frequency: number;
      status: string;
      lastAccessed: Date;
      createdAt: Date;
      semantic_score: number;
      recency_bonus: number;
      final_score: number;
    }>
  >(vectorSql, vectorStr, userId, projectId || null, limit * 2);
  
  // 4. 如果向量检索结果不足，补充关键词检索（针对无向量的记忆）
  let keywordResults: Array<{
    id: string;
    content: string;
    root: MemoryRoot | null;
    importance: number;
    frequency: number;
    status: string;
    lastAccessed: Date;
    createdAt: Date;
    keyword_score: number;
    recency_bonus: number;
    final_score: number;
  }> = [];
  const vectorIds = vectorResults.map(r => r.id);
  
  if (vectorResults.length < limit) {
    const keywords = extractKeywords(query);
    
    if (keywords.length > 0) {
      const keywordPatterns = keywords.map(k => `%${k}%`);
      const remainingLimit = limit * 2 - vectorResults.length;
      
      const keywordSql = `
        SELECT 
          id,
          content,
          "root",
          "importance",
          "frequency",
          "status",
          "last_accessed",
          "createdAt",
          -- 关键词匹配度
          (
            ${keywords.map((_, i) => `CASE WHEN content ILIKE $${i + 5} THEN 1 ELSE 0 END`).join(" + ")}
          )::float / ${keywords.length} as keyword_score,
          -- 时效性奖励
          CASE 
            WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
            ELSE 0
          END as recency_bonus,
          -- 综合评分
          (
            ((${keywords.map((_, i) => `CASE WHEN content ILIKE $${i + 5} THEN 1 ELSE 0 END`).join(" + ")})::float / ${keywords.length}) * 0.7 +
            CASE 
              WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
              ELSE 0
            END +
            ("importance" * 0.02)
          ) as final_score
        FROM "Memory"
        WHERE "userId" = $1
          AND "status" = 'active'
          AND ("projectId" IS NULL OR "projectId" = $2)
          AND "embedding_vector" IS NULL
          AND id NOT IN (${vectorIds.length > 0 ? vectorIds.map(() => '?').join(',') : 'NULL'})
          AND (
            ${keywords.map((_, i) => `content ILIKE $${i + 5}`).join(" OR ")}
          )
        ORDER BY final_score DESC
        LIMIT $3
      `;
      
      keywordResults = await db.$queryRawUnsafe<
        Array<{
          id: string;
          content: string;
          root: MemoryRoot | null;
          importance: number;
          frequency: number;
          status: string;
          lastAccessed: Date;
          createdAt: Date;
          keyword_score: number;
          recency_bonus: number;
          final_score: number;
        }>
      >(keywordSql, userId, projectId || null, remainingLimit, ...vectorIds, ...keywordPatterns);
    }
  }
  
  // 5. 合并结果并应用衰减和 token 限制
  const allResults = [...vectorResults, ...keywordResults];
  return applyDecayAndTokenLimit(allResults, limit, maxTokens);
}

/**
 * 关键词检索模式
 * 使用 ILIKE 匹配 + 相似度计算
 */
async function retrieveByKeyword(
  options: RetrievalOptions
): Promise<MemoryRetrievalResult[]> {
  const { query, userId, projectId, limit = 5, maxTokens = 2000 } = options;
  
  // 1. 提取查询关键词
  const keywords = extractKeywords(query);
  
  if (keywords.length === 0) {
    // 没有关键词时，按时间倒序返回最近的记忆
    const sql = `
      SELECT 
        id,
        content,
        "root",
        "importance",
        "frequency",
        "status",
        "last_accessed",
        "createdAt",
        0.5 as keyword_score,
        0 as recency_bonus,
        ("importance" * 0.02) as final_score
      FROM "Memory"
      WHERE "userId" = $1
        AND "status" = 'active'
        AND ("projectId" IS NULL OR "projectId" = $2)
      ORDER BY "last_accessed" DESC
      LIMIT $3
    `;
    
    const results = await db.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        root: MemoryRoot | null;
        importance: number;
        frequency: number;
        status: string;
        lastAccessed: Date;
        createdAt: Date;
        keyword_score: number;
        recency_bonus: number;
        final_score: number;
      }>
    >(sql, userId, projectId || null, limit * 2);
    
    return applyDecayAndTokenLimit(results, limit, maxTokens);
  }
  
  // 2. 构建关键词匹配条件
  const keywordPatterns = keywords.map(k => `%${k}%`);
  
  // 3. 执行关键词检索
  // 公式：Score = (关键词匹配度 * 0.7) + (时效性奖励) + (重要性 * 0.02)
  const sql = `
    SELECT 
      id,
      content,
      "root",
      "importance",
      "frequency",
      "status",
      "last_accessed",
      "createdAt",
      -- 关键词匹配度：匹配的关键词数量 / 总关键词数量
      (
        ${keywords.map((_, i) => `CASE WHEN content ILIKE $${i + 4} THEN 1 ELSE 0 END`).join(" + ")}
      )::float / ${keywords.length} as keyword_score,
      -- 时效性奖励
      CASE 
        WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
        ELSE 0
      END as recency_bonus,
      -- 综合评分
      (
        ((${keywords.map((_, i) => `CASE WHEN content ILIKE $${i + 4} THEN 1 ELSE 0 END`).join(" + ")})::float / ${keywords.length}) * 0.7 +
        CASE 
          WHEN "root" = 'Context' AND "last_accessed" > NOW() - INTERVAL '1 day' THEN 0.2
          ELSE 0
        END +
        ("importance" * 0.02)
      ) as final_score
    FROM "Memory"
    WHERE "userId" = $1
      AND "status" = 'active'
      AND ("projectId" IS NULL OR "projectId" = $2)
      AND (
        ${keywords.map((_, i) => `content ILIKE $${i + 4}`).join(" OR ")}
      )
    ORDER BY final_score DESC
    LIMIT $3
  `;
  
  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      content: string;
      root: MemoryRoot | null;
      importance: number;
      frequency: number;
      status: string;
      lastAccessed: Date;
      createdAt: Date;
      keyword_score: number;
      recency_bonus: number;
      final_score: number;
    }>
  >(sql, userId, projectId || null, limit * 2, ...keywordPatterns);
  
  // 4. 应用衰减因子和 token 限制
  return applyDecayAndTokenLimit(results, limit, maxTokens);
}

/**
 * 应用衰减因子和 Token 限制
 */
function applyDecayAndTokenLimit<
  T extends {
    id: string;
    content: string;
    root: MemoryRoot | null;
    importance: number;
    lastAccessed: Date;
    final_score: number;
    semantic_score?: number;
    keyword_score?: number;
  }
>(results: T[], limit: number, maxTokens: number): MemoryRetrievalResult[] {
  const now = new Date();
  const selected: MemoryRetrievalResult[] = [];
  let currentTokens = 0;
  
  for (const item of results) {
    // 计算衰减因子
    const daysSinceAccess = (now.getTime() - item.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    const decayFactor = calculateDecayFactor(item.root, daysSinceAccess);
    
    // 应用衰减后的评分
    const adjustedScore = item.final_score * decayFactor;
    
    // 估算 token 数（粗略估计：1 token ≈ 4 字符）
    const estimatedTokens = Math.ceil(item.content.length / 4);
    
    // 检查 token 限制
    if (currentTokens + estimatedTokens > maxTokens) {
      break;
    }
    
    selected.push({
      id: item.id,
      content: item.content,
      root: item.root,
      importance: item.importance,
      score: adjustedScore,
      semanticScore: item.semantic_score,
      keywordScore: item.keyword_score,
    });
    
    currentTokens += estimatedTokens;
    
    if (selected.length >= limit) {
      break;
    }
  }
  
  // 更新 lastAccessed（异步，不阻塞）
  if (selected.length > 0) {
    updateLastAccessed(selected.map(s => s.id)).catch(err => {
      logger.error("Failed to update lastAccessed", err);
    });
  }
  
  return selected;
}

/**
 * 更新记忆的最后访问时间
 */
async function updateLastAccessed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  
  await db.$executeRaw`
    UPDATE "Memory"
    SET "lastAccessed" = NOW()
    WHERE id IN (${ids.join(",")})
  `;
}

/**
 * 从查询文本中提取关键词
 * @param text 查询文本
 * @returns 关键词数组
 */
function extractKeywords(text: string): string[] {
  // 简单的关键词提取：过滤停用词，保留名词性词汇
  const stopWords = new Set([
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "那",
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  ]);
  
  // 分词：按非字母数字字符分割
  const words = text
    .toLowerCase()
    .split(/[^\u4e00-\u9fa5a-zA-Z0-9]+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));
  
  // 去重并限制数量
  return [...new Set(words)].slice(0, 10);
}

/**
 * 查找相似记忆（用于写入时的判重）
 * @param content 要匹配的内容
 * @param userId 用户 ID
 * @param projectId 项目 ID
 * @param mode 检索模式
 * @param providers 用户配置
 * @returns 相似的记忆列表
 */
export async function findSimilarMemories(
  content: string,
  userId: string,
  projectId: string | undefined,
  mode: RetrievalMode,
  providers: Record<string, any>
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  try {
    if (mode === "vector") {
      // 向量模式：优先使用向量相似度，如果没有向量则回退到关键词
      const embeddingResult = await generateEmbedding(
        content,
        providers.memory?.embeddingModel,
        providers
      );
      
      if (!embeddingResult) {
        // 生成失败时回退到关键词模式
        return findSimilarMemoriesByKeyword(content, userId, projectId);
      }
      
      const vectorStr = `[${embeddingResult.embedding.join(",")}]`;
      
      // 优先匹配有向量的记忆
      const sql = `
        SELECT 
          id,
          content,
          (1 - ("embedding_vector" <=> $1::vector)) as similarity
        FROM "Memory"
        WHERE "userId" = $2
          AND "status" IN ('active', 'candidate')
          AND ("projectId" IS NULL OR "projectId" = $3)
          AND "embedding_vector" IS NOT NULL
          AND (1 - ("embedding_vector" <=> $1::vector)) > 0.85
        ORDER BY similarity DESC
        LIMIT 3
      `;
      
      const results = await db.$queryRawUnsafe<
        Array<{ id: string; content: string; similarity: number }>
      >(sql, vectorStr, userId, projectId || null);
      
      // 如果向量匹配不足，补充关键词匹配
      if (results.length < 3) {
        const keywordResults = await findSimilarMemoriesByKeyword(
          content, 
          userId, 
          projectId, 
          results.map(r => r.id)
        );
        return [...results, ...keywordResults].slice(0, 3);
      }
      
      return results;
    } else {
      // 关键词模式
      return findSimilarMemoriesByKeyword(content, userId, projectId);
    }
  } catch (error) {
    logger.error("Failed to find similar memories", { error, userId, content: content.slice(0, 100) });
    return [];
  }
}

/**
 * 关键词模式查找相似记忆
 */
async function findSimilarMemoriesByKeyword(
  content: string,
  userId: string,
  projectId: string | undefined,
  excludeIds: string[] = []
): Promise<Array<{ id: string; content: string; similarity: number }>> {
  const keywords = extractKeywords(content);
  
  if (keywords.length === 0) {
    return [];
  }
  
  const keywordPatterns = keywords.map(k => `%${k}%`);
  
  // 计算参数索引：$1=userId, $2=projectId, $3=limit, 然后是 excludeIds 和 keywords
  const baseParamCount = 3; // userId, projectId, limit
  const excludeCount = excludeIds.length;
  const keywordStartIndex = baseParamCount + excludeCount + 1; // +1 because SQL params are 1-indexed
  
  const sql = `
    SELECT 
      id,
      content,
      (
        ${keywords.map((_, i) => `CASE WHEN content ILIKE $${keywordStartIndex + i} THEN 1 ELSE 0 END`).join(" + ")}
      )::float / ${keywords.length} as similarity
    FROM "Memory"
    WHERE "userId" = $1
      AND "status" IN ('active', 'candidate')
      AND ("projectId" IS NULL OR "projectId" = $2)
      ${excludeCount > 0 ? `AND id NOT IN (${excludeIds.map((_, i) => `$${baseParamCount + 1 + i}`).join(',')})` : ''}
      AND (
        ${keywords.map((_, i) => `content ILIKE $${keywordStartIndex + i}`).join(" OR ")}
      )
    ORDER BY similarity DESC
    LIMIT $3
  `;
  
  const results = await db.$queryRawUnsafe<
    Array<{ id: string; content: string; similarity: number }>
  >(sql, userId, projectId || null, 3, ...excludeIds, ...keywordPatterns);
  
  // 过滤低相似度结果
  return results.filter(r => r.similarity > 0.5);
}

/**
 * 获取检索模式
 * @param embeddingModel Embedding 模型配置
 * @returns 检索模式
 */
export function getRetrievalMode(embeddingModel: string | undefined): RetrievalMode {
  return isVectorModeEnabled(embeddingModel) ? "vector" : "keyword";
}
