import OpenAI from "openai";
import { Message, UserSettings } from "@/lib/types";
import { selectProviderAndModel } from "@/lib/chat/provider-helper";
import { logger } from "@/lib/logger";

// 压缩摘要的标识前缀（用于识别已压缩的消息）
export const COMPRESSED_SUMMARY_PREFIX = "[上下文摘要]";

/**
 * 检查消息是否为压缩摘要
 */
function isCompressedSummary(message: Message): boolean {
  return message.role === 'system' && 
         message.content.startsWith(COMPRESSED_SUMMARY_PREFIX);
}

/**
 * 提取压缩摘要的纯文本内容（去掉前缀）
 */
function extractCompressedContent(message: Message): string {
  return message.content.replace(COMPRESSED_SUMMARY_PREFIX, '').trim();
}

/**
 * 压缩消息历史，将超出限制的部分压缩为总结
 * 使用增量压缩策略：将之前的压缩摘要 + 新消息一起压缩
 */
export async function compressMessages(
  messages: Message[],
  maxMessages: number,
  compressModel: string,
  settings: UserSettings
): Promise<Message[]> {
  try {
    // 分离不同类型的消息
    const systemMessages = messages.filter(m => m.role === 'system' && !isCompressedSummary(m));
    const compressedSummaryMessages = messages.filter(m => isCompressedSummary(m));
    const conversationMessages = messages.filter(m => 
      m.role === 'user' || m.role === 'assistant'
    );

    // 计算实际需要保留的消息数量
    const actualMaxMessages = maxMessages;

    // 如果消息数量未超过限制，直接返回
    if (conversationMessages.length <= actualMaxMessages) {
      return messages;
    }

    // 保留最近的N条消息（这些不会被压缩）
    const recentMessages = conversationMessages.slice(-actualMaxMessages);
    
    // 需要压缩的消息包括新累积的、超出限制的消息
    const messagesToCompress = conversationMessages.slice(0, -actualMaxMessages);

    // 如果不需要压缩，直接返回
    if (messagesToCompress.length === 0 && compressedSummaryMessages.length === 0) {
      return messages;
    }

    // 获取之前的压缩摘要内容（如果有）
    let previousCompressedSummary: string | null = null;
    if (compressedSummaryMessages.length > 0) {
      // 取最后一个压缩摘要（理论上应该只有一个，但为了安全取最后一个）
      previousCompressedSummary = extractCompressedContent(
        compressedSummaryMessages[compressedSummaryMessages.length - 1]
      );
    }

    // 执行增量压缩
    const compressedSummary = await compressMessageHistory(
      messagesToCompress,
      previousCompressedSummary,
      compressModel,
      settings
    );

    // 构建新的压缩摘要消息
    const newCompressedMessage: Message = {
      role: 'system',
      content: `${COMPRESSED_SUMMARY_PREFIX} ${compressedSummary}`,
      id: `compressed-${Date.now()}`
    };

    // 返回：原始system消息 + 新的压缩摘要 + 最近的消息
    // 注意：之前的压缩摘要被新的压缩摘要替换了
    return [
      ...systemMessages,
      newCompressedMessage,
      ...recentMessages
    ];

  } catch (error) {
    logger.error("Failed to compress messages:", error);
    // 压缩失败时，采用智能截断策略
    return smartTruncateMessages(messages, maxMessages);
  }
}

/**
 * 使用AI模型压缩消息历史（支持增量压缩）
 * @param newMessages 新需要压缩的消息
 * @param previousSummary 之前的压缩摘要（如果有）
 * @param compressModel 压缩使用的模型ID
 * @param settings 用户设置
 */
async function compressMessageHistory(
  newMessages: Message[],
  previousSummary: string | null,
  compressModel: string,
  settings: UserSettings
): Promise<string> {
  // 解析模型ID
  let providerId: string | undefined;
  let modelId: string | undefined;

  if (compressModel && compressModel.trim() !== "") {
    const parts = compressModel.split(":");
    if (parts.length === 2) {
      providerId = parts[0];
      modelId = parts[1];
    }
  }

  // 选择模型
  const selection = selectProviderAndModel(settings, providerId, modelId);
  
  if (!selection) {
    throw new Error("No valid provider/model selected for context compression");
  }

  const { selectedProviderConfig, baseURL, selectedModel } = selection;

  const openai = new OpenAI({
    apiKey: selectedProviderConfig.apiKey,
    baseURL: baseURL,
  });

  // 构建要压缩的文本
  // 如果有之前的压缩摘要，将其包含在内
  let contentToCompress: string;
  
  if (previousSummary) {
    // 增量压缩：之前的摘要 + 新消息
    const newMessagesText = newMessages
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join("\n\n");
    
    contentToCompress = `之前的对话摘要：\n${previousSummary}\n\n\n新的对话内容：\n${newMessagesText}`;
  } else {
    // 首次压缩：只有新消息
    contentToCompress = newMessages
      .map(m => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
      .join("\n\n");
  }

  // 根据是否有之前的摘要，调整系统提示词
  const systemPrompt = previousSummary
    ? `
你是一个对话摘要助手。请将之前的对话摘要和新对话内容合并压缩为一个新的摘要，保留关键信息、重要决策和上下文。

要求：
- 基于之前的摘要，整合新的对话内容
- 保留用户的主要问题、需求和偏好
- 保留助手的重要回答和解决方案
- 保留对话中的关键事实和决策
- 使用简洁的中文或英文表达
- 新摘要应该比"之前摘要 + 新内容"的总长度更短（压缩到20-30%左右）
- 如果新内容与之前摘要有重复或相似的信息，进行合并

请直接输出新的压缩摘要，不要添加额外的说明。
`.trim()
    : `
你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要，保留关键信息、重要决策和上下文。

要求：
- 保留用户的主要问题、需求和偏好
- 保留助手的重要回答和解决方案
- 保留对话中的关键事实和决策
- 使用简洁的中文或英文表达
- 摘要长度控制在原内容的20-30%左右

请直接输出摘要内容，不要添加额外的说明。
`.trim();

  const completion = await openai.chat.completions.create({
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: contentToCompress }
    ],
    temperature: 0.3, // 较低的温度以保持准确性
    max_tokens: 1500, // 限制摘要长度（增量压缩时可以稍微放宽）
  });

  const summary = completion.choices[0]?.message?.content?.trim();
  if (!summary) {
    throw new Error("Compression returned empty summary");
  }
  
  return summary;
}

/**
 * 智能截断消息策略
 * 相比简单截断，此策略会：
 * 1. 保留所有系统消息（除了压缩摘要）
 * 2. 保留关键上下文（最近的消息）
 * 3. 保留对话的完整性（尽量成对保留 user-assistant）
 * 4. 考虑消息的重要性（长度、关键词等）
 * 5. 保留时间权重（最近的消息优先）
 */
function smartTruncateMessages(
  messages: Message[],
  maxMessages: number
): Message[] {
  // 分离不同类型的消息
  const systemMessages = messages.filter(m => 
    m.role === 'system' && !isCompressedSummary(m)
  );
  const conversationMessages = messages.filter(m => 
    m.role === 'user' || m.role === 'assistant'
  );
  
  // 如果消息数量未超过限制，直接返回
  if (conversationMessages.length <= maxMessages) {
    return messages;
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
