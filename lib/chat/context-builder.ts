import { Message, UserSettings } from "@/lib/types";
import { compressMessages, COMPRESSED_SUMMARY_PREFIX } from "@/lib/chat/context-compress-helper";
import { formatMemoriesForPrompt } from "@/lib/chat/memory-helper";
import { formatRetrievalContextForPrompt } from "@/lib/chat/retrieval-helper";
import { RetrievalChunk } from "@/lib/chat/retrieval-helper";
import { MODEL_FEATURES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { detectSkills, buildSkillSystemPrompt } from "@/lib/skills/skill-detector";
import { Skill } from "@/lib/types/skill";

export interface ContextBuilderOptions {
  messages: Message[];
  settings: UserSettings;
  relevantMemories: string[];
  searchResult: { searchResults: string; searchPrompt: string } | null;
  retrievalResult: RetrievalChunk[] | null;
  reasoning: boolean | { enabled: boolean; effort?: string | number };
  selectedModel: string;
  userSkills?: Skill[];
}

export interface BuiltContext {
  messages: Message[];
  searchResultsStr: string;
}

/**
 * 构建完整的对话上下文，包括：
 * - 上下文压缩
 * - 记忆注入
 * - 向量检索上下文
 * - 推理提示
 * - 网络搜索结果
 * - Skills 触发和注入
 */
export async function buildContext(options: ContextBuilderOptions): Promise<BuiltContext> {
  let { messages } = options;
  const { settings, relevantMemories, searchResult, retrievalResult, reasoning, selectedModel, userSkills } = options;
  
  // 兼容旧格式：将 boolean 转换为 ReasoningSettings
  const reasoningEnabled = typeof reasoning === 'boolean' ? reasoning : reasoning?.enabled;

  // 1. 上下文压缩（如果启用）
  if (settings.contextLimit?.enabled) {
    const maxMessages = settings.contextLimit.maxMessages || 10;
    const shouldCompress = settings.contextLimit.compress && settings.contextLimit.compressModel;
    
    if (shouldCompress) {
      try {
        messages = await compressMessages(
          messages,
          maxMessages,
          settings.contextLimit.compressModel,
          settings
        );
      } catch (error) {
        logger.error("Context compression failed, using smart truncation:", error);
        // 压缩失败时，使用智能截断
        messages = truncateMessages(messages, maxMessages);
      }
    } else {
      // 不压缩，直接截断
      messages = truncateMessages(messages, maxMessages);
    }
  }

  // 2. 记忆注入
  if (relevantMemories.length > 0) {
    const memoryContext = formatMemoriesForPrompt(relevantMemories);
    if (memoryContext) {
      const systemMsgIndex = messages.findIndex(m => m.role === "system");
      if (systemMsgIndex >= 0) {
        messages[systemMsgIndex].content = `${messages[systemMsgIndex].content}\n\n${memoryContext}`;
      } else {
        messages.unshift({ role: "system", content: memoryContext });
      }
    }
  }

  // 3. 向量检索上下文注入
  if (retrievalResult && retrievalResult.length > 0) {
    const retrievalContext = formatRetrievalContextForPrompt(retrievalResult);
    if (retrievalContext) {
      // 插入独立的系统消息，放在最后一个用户消息之前
      const lastUserMsgIndex = messages.length - 1;
      if (lastUserMsgIndex >= 0) {
        messages.splice(lastUserMsgIndex, 0, {
          role: "system",
          content: retrievalContext
        });
      } else {
        messages.push({
          role: "system",
          content: retrievalContext
        });
      }
    }
  }

  // 4. 推理提示（如果启用且模型不支持）
  if (reasoningEnabled && !MODEL_FEATURES.REASONING.some(feature => selectedModel.includes(feature))) {
    messages.unshift({
      role: "system",
      content: "You are in 'Deep Thinking' mode. Please think carefully and provide a detailed, step-by-step analysis before giving your final answer."
    });
  }

  // 5. 网络搜索结果注入
  let searchResultsStr = "";
  if (searchResult) {
    searchResultsStr = searchResult.searchResults;
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      lastMsg.content = `${searchResult.searchPrompt}\n\nUser Question: ${lastMsg.content}`;
    }
  }

  // 6. Skills 触发检测和注入
  if (userSkills && userSkills.length > 0) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const triggeredResults = detectSkills(lastUserMessage.content, userSkills);
      if (triggeredResults.length > 0) {
        const skillPrompt = buildSkillSystemPrompt(triggeredResults);
        // 将 Skill 提示添加到系统消息
        const systemMsgIndex = messages.findIndex(m => m.role === "system");
        if (systemMsgIndex >= 0) {
          messages[systemMsgIndex].content = `${messages[systemMsgIndex].content}${skillPrompt}`;
        } else {
          messages.unshift({ role: "system", content: skillPrompt.trim() });
        }
        logger.info('Skills triggered', { 
          skills: triggeredResults.map(r => r.skill.name),
          confidence: triggeredResults.map(r => r.confidence)
        });
      }
    }
  }

  return {
    messages,
    searchResultsStr,
  };
}

/**
 * 智能截断消息（移除旧的压缩摘要，智能保留重要消息）
 * 相比简单截断，此策略会：
 * 1. 保留所有系统消息（除了压缩摘要）
 * 2. 保留关键上下文（最近的消息）
 * 3. 保留对话的完整性（尽量成对保留 user-assistant）
 * 4. 考虑消息的重要性（长度、关键词等）
 * 5. 保留时间权重（最近的消息优先）
 */
function truncateMessages(messages: Message[], maxMessages: number): Message[] {
  const systemMessages = messages.filter(m => 
    m.role === 'system' && !m.content.startsWith(COMPRESSED_SUMMARY_PREFIX)
  );
  const conversationMessages = messages.filter(m => 
    m.role === 'user' || m.role === 'assistant'
  );
  
  // 如果消息数量未超过限制，直接返回
  if (conversationMessages.length <= maxMessages) {
    return [...systemMessages, ...conversationMessages];
  }
  
  // 智能选择要保留的消息
  const selectedMessages = selectImportantMessages(conversationMessages, maxMessages);
  
  return [...systemMessages, ...selectedMessages];
}

/**
 * 智能选择重要消息
 * 基于多个因素评分：
 * 1. 时间位置（越近越重要）
 * 2. 消息长度（长消息可能包含更多信息）
 * 3. 对话完整性（成对的 user-assistant）
 * 4. 关键词重要性（包含重要关键词的消息）
 */
function selectImportantMessages(
  messages: Message[],
  maxMessages: number
): Message[] {
  if (messages.length <= maxMessages) {
    return messages;
  }
  
  // 1. 始终保留最后的 N 条消息（确保有足够的最近上下文）
  const recentCount = Math.min(maxMessages, Math.ceil(maxMessages * 0.7));
  const recentMessages = messages.slice(-recentCount);
  const remainingSlots = maxMessages - recentCount;
  
  if (remainingSlots <= 0) {
    return recentMessages;
  }
  
  // 2. 从剩余的消息中，选择重要的消息填充剩余位置
  const olderMessages = messages.slice(0, -recentCount);
  const scoredMessages = olderMessages.map((msg, index) => {
    let score = 0;
    
    // 时间位置分数：越靠后（接近最近消息）分数越高
    const positionRatio = (olderMessages.length - index) / olderMessages.length;
    score += positionRatio * 30;
    
    // 消息长度分数：长消息可能包含更多信息
    const contentLength = (msg.content || '').length;
    const lengthScore = Math.min(contentLength / 500, 1.0); // 500字符为满分
    score += lengthScore * 20;
    
    // 对话完整性：检查是否是成对的 user-assistant
    const isPaired = checkMessagePairing(msg, olderMessages, index);
    if (isPaired) {
      score += 25;
    }
    
    // 关键词重要性：包含重要关键词的消息
    const keywordScore = calculateKeywordImportance(msg.content || '');
    score += keywordScore * 25;
    
    return { message: msg, score, originalIndex: index };
  });
  
  // 按分数排序，选择得分最高的
  scoredMessages.sort((a, b) => b.score - a.score);
  const selectedOlder = scoredMessages
    .slice(0, remainingSlots)
    .sort((a, b) => a.originalIndex - b.originalIndex) // 恢复原始顺序
    .map(item => item.message);
  
  // 合并结果：保留的消息 + 最近的消息
  return [...selectedOlder, ...recentMessages];
}

/**
 * 检查消息是否成对（user-assistant 或 assistant-user）
 */
function checkMessagePairing(
  message: Message,
  messages: Message[],
  index: number
): boolean {
  if (index === 0) {
    // 第一条消息，检查下一条是否成对
    if (messages.length > 1) {
      const nextMsg = messages[index + 1];
      return (
        (message.role === 'user' && nextMsg.role === 'assistant') ||
        (message.role === 'assistant' && nextMsg.role === 'user')
      );
    }
    return false;
  }
  
  // 检查前一条消息是否成对
  const prevMsg = messages[index - 1];
  return (
    (message.role === 'user' && prevMsg.role === 'assistant') ||
    (message.role === 'assistant' && prevMsg.role === 'user')
  );
}

/**
 * 计算消息关键词重要性分数
 * 检测包含重要关键词的消息（如：问题、错误、需求、偏好等）
 */
function calculateKeywordImportance(content: string): number {
  if (!content || content.length === 0) return 0;
  
  const lowerContent = content.toLowerCase();
  
  // 重要关键词列表（可根据实际需求扩展）
  const importantKeywords = [
    // 问题相关
    '问题', '错误', 'bug', 'issue', 'error', 'exception',
    // 需求相关
    '需要', '要求', '需求', 'requirement', 'need', 'want',
    // 偏好相关
    '偏好', '喜欢', 'prefer', 'preference', 'like',
    // 重要指示
    '重要', '必须', '一定要', 'important', 'must', 'required',
    // 配置相关
    '配置', '设置', 'config', 'setting', 'configure',
    // 决策相关
    '决定', '选择', 'decision', 'choose', 'select',
  ];
  
  // 计算关键词匹配数量
  let matchCount = 0;
  for (const keyword of importantKeywords) {
    if (lowerContent.includes(keyword)) {
      matchCount++;
    }
  }
  
  // 返回归一化的分数（0-1）
  return Math.min(matchCount / 5, 1.0);
}

