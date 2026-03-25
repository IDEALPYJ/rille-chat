/**
 * 记忆系统
 * 统一导出记忆相关功能
 */

// 类型定义
export * from "./types";

// 服务模块
export { generateEmbedding, generateEmbeddings, isVectorModeEnabled } from "./embedding";
export { retrieveMemories, findSimilarMemories, getRetrievalMode } from "./retrieval";
export { extractMemoryOperations, extractMemoryOperationsSimple } from "./extraction";
export {
  executeMemoryOperations,
  promoteCandidateMemory,
  isMemoryActive,
  archiveStaleMemories,
} from "./operations";

// 新增：质量控制和优化模块
export { assessInformationValue, makeTriggerDecision } from "./value-assessment";
export { filterExtractionQuality } from "./extraction-filter";
export { checkDuplicateLocal, computeContentHash, calculateTextSimilarity } from "./duplicate-detection";
export { selectMergeStrategy, intelligentlyMerge, executeMerge } from "./smart-merge";
export { applyTemporalDecay, calculateDecayMultiplier, getHalfLifeDescription } from "./advanced-retrieval";
export { mmrRerank, applyMMRToMemories, DEFAULT_MMR_CONFIG } from "./mmr";
export { 
  generateCacheKey, 
  getFromMemoryCache, 
  setMemoryCache, 
  generateEmbeddingWithCache,
  bufferToArray,
  arrayToBuffer
} from "./embedding-cache";
export { 
  performMaintenance, 
  shouldArchiveMemory, 
  isLowQualityMemory,
  calculateMemoryQualityScore 
} from "./maintenance";

// 主处理函数
import { ProcessMemoryOptions, MemoryOperation, RetrievalMode, Message } from "./types";
import { extractMemoryOperations } from "./extraction";
import { executeMemoryOperations } from "./operations";
import { getRetrievalMode } from "./retrieval";
import { logger } from "@/lib/logger";
import { makeTriggerDecision } from "./value-assessment";
import { filterExtractionQuality } from "./extraction-filter";

// 全局状态：记录上次提取的轮次
const userLastExtractionRound = new Map<string, number>();

/**
 * 处理记忆（主入口）
 * Fire-and-Forget 模式：异步执行，不阻塞主流程
 * @param options 处理选项
 */
export async function processMemory(options: ProcessMemoryOptions): Promise<void> {
  const {
    userId,
    projectId,
    extractionModel,
    embeddingModel,
    settings,
    userInput,
    aiResponse: _aiResponse,
    conversationHistory = [],
  } = options;

  try {
    // 1. 智能触发检测（新增）
    const lastRound = userLastExtractionRound.get(userId) || 0;
    const triggerDecision = makeTriggerDecision(
      userInput,
      conversationHistory as Message[],
      lastRound,
      { forceInterval: 5, minValueThreshold: 0.5 }
    );

    if (!triggerDecision.shouldExtract) {
      logger.debug("Skipping memory extraction", {
        userId,
        reason: triggerDecision.reason,
        valueScore: triggerDecision.valueScore,
      });
      return;
    }

    // 更新最后提取轮次
    userLastExtractionRound.set(userId, conversationHistory.length);

    // 2. 确定检索模式
    const mode: RetrievalMode = getRetrievalMode(embeddingModel);

    logger.debug("Processing memories", {
      userId,
      mode,
      priority: triggerDecision.priority,
      hasEmbeddingModel: !!embeddingModel,
    });

    // 3. 提取记忆操作
    const operations: MemoryOperation[] = await extractMemoryOperations(options);

    if (operations.length === 0) {
      logger.debug("No memory operations extracted");
      return;
    }

    // 4. 质量过滤（新增）
    const filteredOperations: MemoryOperation[] = [];
    for (const op of operations) {
      const qualityCheck = filterExtractionQuality(op, userInput);
      if (qualityCheck.passed) {
        filteredOperations.push(op);
      } else {
        logger.debug("Memory operation filtered by quality check", {
          reason: qualityCheck.rejectionReason,
          content: op.content.slice(0, 50),
        });
      }
    }

    if (filteredOperations.length === 0) {
      logger.debug("All memory operations filtered by quality check");
      return;
    }

    // 5. 执行操作
    const result = await executeMemoryOperations(
      filteredOperations,
      userId,
      projectId,
      mode,
      embeddingModel,
      settings.providers
    );

    logger.info("Memory processing completed", {
      userId,
      originalCount: operations.length,
      filteredCount: filteredOperations.length,
      ...result,
    });
  } catch (error) {
    logger.error("Memory processing failed", {
      error,
      userId,
      extractionModel,
    });
  }
}

/**
 * 格式化记忆用于系统提示词
 * @param memories 记忆内容列表
 * @returns 格式化后的提示词片段
 */
export function formatMemoriesForPrompt(memories: string[]): string {
  if (memories.length === 0) return "";

  return `
<UserMemory>
以下是关于用户的已验证记忆，请利用这些信息个性化你的回复：
${memories.map((m) => `- ${m}`).join("\n")}
</UserMemory>
`.trim();
}

/**
 * 格式化记忆（带分类信息）
 * @param memories 记忆列表，包含 content 和 root
 * @returns 格式化后的提示词片段
 */
export function formatMemoriesWithRoot(
  memories: Array<{ content: string; root: string | null }>
): string {
  if (memories.length === 0) return "";

  // 按 root 分组
  const grouped = memories.reduce((acc, m) => {
    const root = m.root || "Other";
    if (!acc[root]) acc[root] = [];
    acc[root].push(m.content);
    return acc;
  }, {} as Record<string, string[]>);

  const sections = Object.entries(grouped).map(([root, contents]) => {
    return `[${root}]\n${contents.map((c) => `- ${c}`).join("\n")}`;
  });

  return `
<UserMemory>
以下是关于用户的已验证记忆：

${sections.join("\n\n")}
</UserMemory>
`.trim();
}
