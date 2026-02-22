import { Message, UserSettings } from "@/lib/types";
import { ensureSession } from "@/lib/chat/db-helper";
import { processMessageAttachments } from "@/lib/chat/file-helper";
import { performWebSearch } from "@/lib/chat/search-helper";
import { getRelevantMemories } from "@/lib/chat/memory-helper";
import { logger } from "@/lib/logger";
import { RetrievalChunk } from "@/lib/chat/retrieval-helper";

export interface ParallelTaskResults {
  sessionId: string | null;
  processedMessages: Message[];
  relevantMemories: string[];
  searchResult: { searchResults: string; searchPrompt: string } | null;
  retrievalResult: RetrievalChunk[] | null;
}

/**
 * 并行执行独立任务：session创建、附件处理、记忆检索、网络搜索、向量检索
 */
export async function executeParallelTasks(
  userId: string,
  messages: Message[],
  sessionId: string | null,
  projectId: string | null,
  settings: UserSettings,
  tempChat: boolean,
  webSearch: boolean,
  vectorSearch: boolean,
  /** 仅当使用外部搜索时才调用 performWebSearch；内置搜索由模型自行处理 */
  webSearchSource?: { type: 'builtin' | 'external' }
): Promise<ParallelTaskResults> {
  const lastMessage = messages[messages.length - 1];

  // 1. Session 创建（临时聊天跳过）
  const sessionPromise = tempChat 
    ? Promise.resolve(null)
    : ensureSession(userId, sessionId, lastMessage.content, projectId);

  // 2. 附件处理
  const attachmentsPromise = processMessageAttachments(messages);

  // 3. 记忆检索（临时聊天或未启用时跳过）
  const memoryPromise = (tempChat || !settings.memory?.enabled)
    ? Promise.resolve([] as string[])
    : getRelevantMemories(
        userId,
        projectId || undefined,
        settings.memory.maxContextTokens || 2000,
        lastMessage.content,
        settings
      ).catch(err => {
        logger.error("Failed to fetch memories:", err);
        return [] as string[];
      });

  // 4. 网络搜索（仅外部搜索：builtin 由模型内置工具处理，无需调用 performWebSearch）
  const useExternalSearch = webSearch && webSearchSource?.type === 'external';
  const searchPromise = useExternalSearch
    ? performWebSearch(lastMessage.content, settings).catch(err => {
        logger.error("Web search failed:", err);
        return null;
      })
    : Promise.resolve(null);

  // 5. 向量检索（需要项目ID）
  const { searchRelevantChunks } = await import("@/lib/chat/retrieval-helper");
  const retrievalPromise = vectorSearch && projectId
    ? searchRelevantChunks(lastMessage.content, projectId, userId, 5).catch(err => {
        logger.error("Vector retrieval failed:", err);
        return null;
      })
    : Promise.resolve(null);

  // 等待所有并行任务完成
  const [currentSessionId, processedMessages, relevantMemories, searchRes, retrievalRes] = await Promise.all([
    sessionPromise,
    attachmentsPromise,
    memoryPromise,
    searchPromise,
    retrievalPromise
  ]);

  return {
    sessionId: currentSessionId,
    processedMessages,
    relevantMemories,
    searchResult: searchRes,
    retrievalResult: retrievalRes,
  };
}

