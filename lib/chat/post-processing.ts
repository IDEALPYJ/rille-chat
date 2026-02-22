import { Message, UserSettings } from "@/lib/types";
import { MESSAGE_ROLES } from "@/lib/constants";
import { extractMemories, saveMemories, processMemory } from "@/lib/chat/memory-helper";
import { generateTitle } from "@/lib/chat/title-generator";
import { updateSessionTitle } from "@/lib/chat/db-helper";
import { logger } from "@/lib/logger";

export interface PostProcessingOptions {
  fullText: string;
  fullReasoning: string;
  messages: Message[];
  settings: UserSettings;
  userId: string;
  projectId: string | null;
  sessionId: string | null;
  userMsgCount: number;
}

export interface PostProcessingResult {
  title?: string;
  memories?: string[];
}

/**
 * 执行后处理任务：自动重命名、记忆提取
 */
export async function executePostProcessing(
  options: PostProcessingOptions
): Promise<PostProcessingResult> {
  const { fullText, messages, settings, userId, projectId, sessionId, userMsgCount } = options;
  // fullReasoning is kept in options for future use
  void options.fullReasoning;

  const result: PostProcessingResult = {};

  // 1. 自动重命名（仅第一条用户消息时）
  if (settings.autoRename && settings.autoRenameModel && sessionId && userMsgCount === 1) {
    try {
      const lastUserContent = messages.filter((m) => m.role === 'user').pop()?.content || "";
      const newTitle = await generateTitle(lastUserContent, fullText, settings);
      if (newTitle) {
        await updateSessionTitle(sessionId, newTitle);
        result.title = newTitle;
      }
    } catch (error) {
      logger.error("Failed to auto-rename session:", error);
    }
  }

  // 2. 记忆提取（如果启用）
  if (settings.memory?.enabled && sessionId) {
    try {
      if (settings.memory.extractionModel) {
        logger.debug("Using memory processing");

        const userAndAssistantMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

        const lastUserMsg = [...userAndAssistantMessages].reverse().find(m => m.role === 'user');
        const lastAssistantMsg = [...userAndAssistantMessages].reverse().find(m => m.role === 'assistant');

        if (lastUserMsg && lastAssistantMsg) {
          processMemory({
            userId,
            projectId: projectId || undefined,
            userInput: lastUserMsg.content,
            aiResponse: lastAssistantMsg.content,
            extractionModel: settings.memory.extractionModel,
            embeddingModel: settings.memory.embeddingModel,
            settings: settings as any,
          }).then(() => {
            logger.debug("Memory processing completed");
          }).catch(err => {
            logger.error("Memory processing failed:", err);
          });
          
          // 新流程是异步的，如果需要通知，可以在这里设置
          if (settings.memory.notifyOnUpdate) {
            // 由于新流程是异步的，无法立即知道提取了哪些记忆
            // 可以考虑在后续版本中通过 WebSocket 或轮询获取结果
            result.memories = []; // 占位，表示正在处理
          }
        }
      } else {
        // 使用旧版流程（向后兼容）
        logger.debug("Using legacy memory processing");
        
        const userAndAssistantMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
        const messagesForExtraction = [
          ...userAndAssistantMessages,
          { role: MESSAGE_ROLES.ASSISTANT, content: fullText } as Message
        ];
        
        const newMemories = await extractMemories(
          messagesForExtraction,
          settings,
          userId,
          projectId || undefined
        );
        
        if (newMemories.length > 0) {
          await saveMemories(userId, projectId || undefined, newMemories);
          if (settings.memory.notifyOnUpdate) {
            result.memories = newMemories;
          }
        }
      }
    } catch (err) {
      logger.error("Failed to extract memories:", err);
    }
  }

  return result;
}
