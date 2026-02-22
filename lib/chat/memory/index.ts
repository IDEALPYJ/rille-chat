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

// 主处理函数
import { ProcessMemoryOptions, MemoryOperation, RetrievalMode } from "./types";
import { extractMemoryOperations } from "./extraction";
import { executeMemoryOperations } from "./operations";
import { getRetrievalMode } from "./retrieval";
import { logger } from "@/lib/logger";

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
  } = options;

  try {
    // 1. 确定检索模式
    const mode: RetrievalMode = getRetrievalMode(embeddingModel);

    logger.debug("Processing memories", {
      userId,
      mode,
      hasEmbeddingModel: !!embeddingModel,
    });

    // 2. 提取记忆操作
    const operations: MemoryOperation[] = await extractMemoryOperations(options);

    if (operations.length === 0) {
      logger.debug("No memory operations extracted");
      return;
    }

    // 3. 执行操作
    const result = await executeMemoryOperations(
      operations,
      userId,
      projectId,
      mode,
      embeddingModel,
      settings.providers
    );

    logger.info("Memory processing completed", {
      userId,
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
