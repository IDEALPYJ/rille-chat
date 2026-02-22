import OpenAI from "openai";
import { db } from "@/lib/db";
import { Message } from "@/lib/types";
import { logger } from "@/lib/logger";
import { MESSAGE_ROLES, MESSAGE_STATUS } from "@/lib/constants";
import { streamCache } from "./stream-cache";
import { sessionUpdateDebouncer } from "./session-update-debouncer";
import { Prisma } from "@prisma/client";

/**
 * 更新会话的最后一条消息预览信息（实际执行函数）
 */
async function doUpdateSessionLastMessage(
  sessionId: string,
  content: string,
  role: string
) {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: {
        updatedAt: new Date(),
        lastMessagePreview: content.substring(0, 200), // 存储前200个字符作为预览
        lastMessageAt: new Date(),
        lastMessageRole: role
      }
    });
  } catch (err) {
    logger.error("Failed to update session last message", err, { sessionId });
  }
}

/**
 * 更新会话的最后一条消息预览信息（带防抖）
 */
function updateSessionLastMessage(
  sessionId: string,
  content: string,
  role: string
) {
  // 使用防抖器来减少数据库更新频率
  sessionUpdateDebouncer.schedule(sessionId, content, role, doUpdateSessionLastMessage);
}

export async function ensureSession(userId: string, sessionId?: string | null, firstMessageContent?: string, projectId?: string | null, isImageGeneration?: boolean) {
  if (sessionId) return sessionId;

  const newSession = await db.session.create({
    data: {
      userId: userId,
      title: firstMessageContent?.slice(0, 30) || "New Chat",
      projectId: projectId || null,
      isImageGeneration: isImageGeneration || false,
    },
  });
  logger.info(`Created new session: ${newSession.id}`, { userId, projectId, isImageGeneration });
  return newSession.id;
}

export async function saveMessageHistory(
  sessionId: string,
  messages: Message[],
  selectedModel: string,
  selectedProviderId: string
) {
  // 1. 尝试查找已存在的消息
  // 这里的查找策略：
  // 前端传来的 messages 数组包含当前分支的所有消息
  // 我们需要判断哪些消息已经在数据库中，哪些是新消息
  // 判断依据：优先使用 traceId 匹配（如果前端生成并持久化了 ID），其次可能需要其他策略？
  // 目前前端生成的 ID 是 UUID，作为 traceId 存储。
  // 注意：如果消息在 DB 中已经存在，我们就不需要重新创建。
  // 匹配策略：
  // 1. m.id 可能直接是 DB 的 id (如果是加载历史后发送的消息)
  // 2. m.id 可能是 traceId (如果是当前会话新产生的消息)
  
  const messageIds = messages.map(m => m.id).filter((id): id is string => !!id);
  
  const existingMessages = await db.message.findMany({
    where: {
      sessionId: sessionId,
      OR: [
        { id: { in: messageIds } },
        { traceId: { in: messageIds } }
      ]
    },
    select: { id: true, traceId: true },
  });

  // 建立查找表：将 id 和 traceId 都映射到 db.id
  const existingMap = new Map<string, string>();
  for (const em of existingMessages) {
    existingMap.set(em.id, em.id);
    if (em.traceId) {
      existingMap.set(em.traceId, em.id);
    }
  }

  const messageIdMap = new Map<string, string>();

  await db.$transaction(async (tx) => {
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      
      // 检查是否已存在
      const dbId = m.id ? existingMap.get(m.id) : undefined;

      if (dbId && m.id) {
        messageIdMap.set(m.id, dbId);
      } else {
        // 如果不存在，需要创建
        // 关键点：确定 parentId
        // 前端传来的 messages 是一个线性分支。
        // 对于第 i 条消息 (i > 0)，其 parent 应该是第 i-1 条消息在 DB 中的 ID。
        // 对于第 0 条消息，如果它是根节点，parentId 为 null。
        // 但这里有个问题：如果 messages[0] 实际上是某个深层节点的子节点（比如我们在某个分支上继续对话）
        // 前端传来的 messages 应该包含完整的从根到叶的路径。
        // 如果 messages[0] 是新消息，说明这是新的根节点？通常不会发生，除非是新会话的第一条消息。
        
        // 修正逻辑：
        // 前端 getMessageBranch 返回的是从根到叶的完整路径。
        // 所以 messages[i-1] 一定是 messages[i] 的父节点。
        
        let parentId: string | null = null;
        if (i > 0 && messages[i - 1].id) {
            parentId = (messages[i - 1].id ? messageIdMap.get(messages[i - 1].id!) : null) || null;
        } else {
            // 如果是第一条消息 (i=0)，它可能是根节点，也可能是从中间某个节点开始的分支
            // 此时我们需要确定它的 parentId。
            
            // 如果前端消息带有 parentId (即 traceId 格式)，我们需要找到它对应的数据库 ID
            if (m.parentId) {
                 // 尝试通过 traceId 查找 parent
                 // 1. 先看 messageIdMap 里有没有（虽然 i=0 时肯定没有，但逻辑上保持一致）
                 const mappedParentId = messageIdMap.get(m.parentId);
                 if (mappedParentId) {
                     parentId = mappedParentId;
                 } else {
                     // 2. 去数据库查
                     const parentMsg = await tx.message.findFirst({
                        where: {
                          sessionId,
                          OR: [
                            { id: m.parentId },
                            { traceId: m.parentId }
                          ]
                        },
                        select: { id: true }
                     });
                     if (parentMsg) {
                         parentId = parentMsg.id;
                     }
                 }
            }
        }

        const created = await tx.message.create({
          data: {
            content: m.content,
            reasoningContent: m.reasoning_content,
            role: m.role,
            sessionId: sessionId,
            parentId: parentId,
            traceId: m.id,
            // 语音消息字段
            isVoiceInput: m.isVoiceInput || false,
            audioUrl: m.audioUrl,
            audioDuration: m.audioDuration,
            ...(m.role === 'assistant' ? {
              model: selectedModel,
              provider: selectedProviderId,
            } : {}),
            attachments: m.attachments ? {
              create: m.attachments.map((a) => ({
                name: a.name,
                url: a.url,
                type: a.type,
                size: a.size
              }))
            } : undefined
          },
        });
        if (m.id) {
            messageIdMap.set(m.id, created.id);
        }
        
        // 更新会话的最后一条消息预览（仅对用户消息和助手消息）
        if (m.role === MESSAGE_ROLES.USER || m.role === MESSAGE_ROLES.ASSISTANT) {
          await updateSessionLastMessage(sessionId, m.content, m.role);
        }
      }
    }
  });

  return messageIdMap;
}

export async function updateAuditParams(
  userMessageDbId: string,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming
) {
  try {
    const { messages: _, ...auditParams } = params;
    await db.message.update({
      where: { id: userMessageDbId },
      data: {
        requestParams: JSON.stringify(auditParams)
      }
    });
  } catch (auditErr) {
    logger.error("Failed to save request audit params", auditErr);
  }
}

/**
 * 创建或更新AI响应消息（支持增量保存）
 * @param messageId 如果提供，则更新现有消息；否则创建新消息
 */
export async function saveAIResponse({
  sessionId,
  content,
  reasoningContent,
  searchResults,
  retrievalChunks,
  contentParts,
  parentId,
  model,
  provider,
  modelAvatar,
  usage,
  cost,
  traceId,
  messageId
}: {
  sessionId: string;
  content: string;
  reasoningContent: string;
  searchResults: string;
  retrievalChunks?: string;
  contentParts?: any[];
  parentId: string | null;
  model: string;
  provider: string;
  modelAvatar?: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  cost: number;
  traceId?: string;
  messageId?: string; // 用于增量更新
}) {
  try {
    if (messageId) {
      // 增量更新：优先写入 Redis 缓存，减少数据库压力
      await streamCache.saveStreamState(messageId, {
        content,
        reasoningContent,
        searchResults,
        contentParts,
        usage,
        cost,
      });
      
      // 仍然更新数据库，但频率较低（由调用方控制）
      // 这里保持更新以确保数据一致性
      await db.message.update({
        where: { id: messageId },
        data: {
          content,
          reasoningContent,
          searchResults,
          contentParts: contentParts ? JSON.stringify(contentParts) : undefined,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          inputCacheTokens: usage.prompt_tokens_details?.cached_tokens || 0,
          outputCacheTokens: usage.completion_tokens_details?.reasoning_tokens || 0,
          totalTokens: usage.total_tokens,
          cost,
          status: MESSAGE_STATUS.STREAMING, // 流式响应中保持streaming状态
        },
      });
    } else {
      // 创建新消息
      const created = await db.message.create({
        data: {
          content,
          reasoningContent,
          searchResults,
          retrievalChunks,
          contentParts: contentParts ? JSON.stringify(contentParts) : undefined,
          role: MESSAGE_ROLES.ASSISTANT,
          sessionId,
          parentId,
          model,
          provider,
          modelAvatar,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          inputCacheTokens: usage.prompt_tokens_details?.cached_tokens || 0,
          outputCacheTokens: usage.completion_tokens_details?.reasoning_tokens || 0,
          totalTokens: usage.total_tokens,
          cost,
          traceId,
          status: MESSAGE_STATUS.STREAMING, // 初始状态为streaming
        },
      });
      
      // 返回消息ID以便后续增量更新
      return created.id;
    }
    
    // 更新会话的最后一条消息预览
    await updateSessionLastMessage(sessionId, content, MESSAGE_ROLES.ASSISTANT);
    
    if (!messageId) {
      logger.info(`Successfully created AI response for session: ${sessionId}`, { tokens: usage.total_tokens, cost });
    }
  } catch (err) {
    logger.error("Failed to save AI response", err, { sessionId, messageId });
    throw err; // 重新抛出错误以便调用者处理
  }
}

/**
 * 完成AI响应消息（将状态从streaming改为completed）
 * 从 Redis 缓存读取最终状态并写入数据库
 */
export async function completeAIResponse(
  messageId: string,
  finalUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  },
  finalCost?: number,
  sessionId?: string
) {
  try {
    // 尝试从缓存获取最终状态
    const cachedState = await streamCache.getStreamState(messageId);

    // 构建更新数据
    const updateData: Prisma.MessageUpdateInput = {
      status: MESSAGE_STATUS.COMPLETED,
    };

    // 只有在缓存有数据时才更新内容字段
    if (cachedState) {
      if (cachedState.content) {
        updateData.content = cachedState.content;
      }
      if (cachedState.reasoningContent) {
        updateData.reasoningContent = cachedState.reasoningContent;
      }
      if (cachedState.searchResults) {
        updateData.searchResults = cachedState.searchResults;
      }
      if (cachedState.contentParts) {
        updateData.contentParts = JSON.stringify(cachedState.contentParts);
      }
      if (cachedState.usage) {
        updateData.inputTokens = cachedState.usage.prompt_tokens;
        updateData.outputTokens = cachedState.usage.completion_tokens;
        updateData.inputCacheTokens = cachedState.usage.prompt_tokens_details?.cached_tokens || 0;
        updateData.outputCacheTokens = cachedState.usage.completion_tokens_details?.reasoning_tokens || 0;
        updateData.totalTokens = cachedState.usage.total_tokens;
      }
      if (cachedState.cost !== undefined) {
        updateData.cost = cachedState.cost;
      }
    } else if (finalUsage) {
      // 缓存不可用但传入了 usage，只更新 usage 和 cost
      updateData.inputTokens = finalUsage.prompt_tokens;
      updateData.outputTokens = finalUsage.completion_tokens;
      updateData.inputCacheTokens = finalUsage.prompt_tokens_details?.cached_tokens || 0;
      updateData.outputCacheTokens = finalUsage.completion_tokens_details?.reasoning_tokens || 0;
      updateData.totalTokens = finalUsage.total_tokens;
      if (finalCost !== undefined) {
        updateData.cost = finalCost;
      }
    }

    await db.message.update({
      where: { id: messageId },
      data: updateData,
    });

    // 清理缓存
    await streamCache.deleteStreamState(messageId);

    // 如果提供了 sessionId，立即刷新 Session 更新（不等待防抖）
    if (sessionId) {
      // 获取消息内容用于更新会话预览
      const message = await db.message.findUnique({
        where: { id: messageId },
        select: { content: true }
      });
      if (message?.content) {
        await sessionUpdateDebouncer.flush(sessionId, doUpdateSessionLastMessage);
      }
    }

    logger.info(`Completed AI response message: ${messageId}`);
  } catch (err) {
    logger.error("Failed to complete AI response", err, { messageId });
  }
}

export async function updateSessionTitle(sessionId: string, title: string) {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: { title },
    });
    logger.info(`Updated session title for ${sessionId}`, { title });
  } catch (error) {
    logger.error(`Failed to update session title for ${sessionId}`, error);
  }
}
