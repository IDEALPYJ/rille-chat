import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { McpStreamEvent } from "@/lib/chat/mcp-stream-handler";
import { getModelPricing } from "@/lib/pricing/pricing-service";
import { McpToolCallInfo } from "@/lib/types";
import { UnifiedStreamEvent } from "./protocols/unified-types";
import { mergeUsage, extractUsageFromOpenAIChunk } from "@/lib/utils/stream-usage-helpers";

export async function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const rates = await getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * rates.input;
  const outputCost = (outputTokens / 1_000_000) * rates.output;
  return inputCost + outputCost;
}

export interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

// 定义严格的 ContentPart 类型
export interface TextContentPart {
  type: 'text';
  content: string;
}

export interface ToolCallContentPart {
  type: 'tool_call';
  info: McpToolCallInfo;
}

export type ContentPart = TextContentPart | ToolCallContentPart;

// 扩展输入类型以支持统一流事件和 MCP 事件
// 注意：MCP 工具调用仍使用 OpenAI chunk 格式（向后兼容）
type StreamInput = UnifiedStreamEvent | OpenAI.Chat.Completions.ChatCompletionChunk | McpStreamEvent;

// 类型守卫函数
function isMcpStreamEvent(chunk: unknown): chunk is { type: 'tool_start' | 'tool_result'; info: McpToolCallInfo } {
  if (typeof chunk !== 'object' || chunk === null) return false;
  const c = chunk as any;
  return (
    'type' in c &&
    (c.type === 'tool_start' || c.type === 'tool_result') &&
    'info' in c &&
    typeof c.info === 'object' &&
    c.info !== null &&
    'toolCallId' in c.info
  );
}

function extractTextFromDeltaContent(content: unknown): { text: string; reasoning: string } {
  let text = ""
  let reasoning = ""
  const extract = (val: unknown) => {
    if (typeof val === "string") {
      text += val
      return
    }
    if (val && typeof val === "object") {
      const obj = val as Record<string, unknown>
      if (obj.type === "text" && typeof obj.text === "string") {
        text += obj.text
      } else if (obj.type === "thinking" && Array.isArray(obj.thinking)) {
        for (const t of obj.thinking) {
          if (t && typeof t === "object" && typeof (t as any).text === "string") {
            reasoning += (t as any).text
          }
        }
      }
    }
  }
  if (Array.isArray(content)) {
    for (const item of content) extract(item)
  } else if (content !== undefined && content !== null) {
    extract(content)
  }
  return { text, reasoning }
}

function isUnifiedStreamEvent(chunk: unknown): chunk is UnifiedStreamEvent {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    'type' in chunk &&
    (chunk.type === 'content' ||
      chunk.type === 'tool_call' ||
      chunk.type === 'thinking' ||
      chunk.type === 'system' ||
      chunk.type === 'finish' ||
      chunk.type === 'error')
  );
}

export function createChatStream({
  aiResponse,
  sessionId,
  searchResults,
  retrievalChunks,
  enabledMcpPlugins: _enabledMcpPlugins = [],
  toolCallUsage,
  mcpToolCallInfos = [],
  onStart,
  onProgress,
  onComplete
}: {
  aiResponse: AsyncIterable<StreamInput>;
  sessionId: string;
  searchResults: string;
  retrievalChunks?: string;
  enabledMcpPlugins?: any[];
  toolCallUsage?: any;
  mcpToolCallInfos?: any[]; // 兼容旧逻辑
  onStart?: () => Promise<string | undefined>; // 返回消息ID用于增量更新
  onProgress?: (messageId: string, text: string, reasoning: string, usage: StreamUsage, contentParts: any[]) => Promise<void>; // 增量保存
  onComplete: (fullText: string, fullReasoning: string, usage: StreamUsage, contentParts: any[], messageId?: string) => Promise<{ title?: string; memories?: string[] } | void>;
}) {
  let fullText = "";
  let fullReasoning = "";
  // 结构化消息内容（使用严格的类型）
  let contentParts: ContentPart[] = [];

  let usage: StreamUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    prompt_tokens_details: { cached_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 0 }
  };
  let hasSaved = false;
  let messageId: string | undefined;
  let lastSaveTime = Date.now();
  let lastSaveLength = 0;
  const SAVE_INTERVAL_MS = 5000; // 每5秒保存一次
  const SAVE_LENGTH_THRESHOLD = 100; // 每100个字符保存一次

  // 工具调用累积器（用于处理 UnifiedStreamEvent 中的 tool_call）
  const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();

  // 辅助函数：追加文本到当前的 parts（使用不可变更新）
  const appendTextToParts = (text: string) => {
    const newParts = [...contentParts];
    const lastPart = newParts[newParts.length - 1];

    if (lastPart && lastPart.type === 'text') {
      // 创建新的 part 而不是修改原对象
      newParts[newParts.length - 1] = {
        ...lastPart,
        content: lastPart.content + text
      };
    } else {
      newParts.push({ type: 'text', content: text });
    }

    contentParts = newParts;
  };

  const saveProgress = async () => {
    if (!messageId || !onProgress) return;

    const now = Date.now();
    const textLength = fullText.length + fullReasoning.length;
    const shouldSave =
      (now - lastSaveTime >= SAVE_INTERVAL_MS) ||
      (textLength - lastSaveLength >= SAVE_LENGTH_THRESHOLD);

    if (shouldSave) {
      try {
        await onProgress(messageId, fullText, fullReasoning, usage, contentParts);
        lastSaveTime = now;
        lastSaveLength = textLength;
      } catch (err) {
        logger.error("Failed to save progress", err);
      }
    }
  };

  const saveOnce = async (controller: ReadableStreamDefaultController) => {
    if (hasSaved) return;
    hasSaved = true;
    const result = await onComplete(fullText, fullReasoning, usage, contentParts, messageId);
    if (result) {
      const encoder = new TextEncoder();
      if (result.title) {
        controller.enqueue(encoder.encode(JSON.stringify({ t: result.title }) + "\n"));
      }
      if (result.memories && result.memories.length > 0) {
        controller.enqueue(encoder.encode(JSON.stringify({ m: result.memories }) + "\n"));
      }
    }
  };

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        // 在流开始时创建消息记录
        if (onStart) {
          messageId = await onStart();
        }

        controller.enqueue(encoder.encode(JSON.stringify({ sessionId }) + "\n"));

        if (searchResults) {
          controller.enqueue(encoder.encode(JSON.stringify({ s: searchResults }) + "\n"));
        }

        if (retrievalChunks) {
          controller.enqueue(encoder.encode(JSON.stringify({ rc: retrievalChunks }) + "\n"));
        }

        // 兼容旧逻辑：发送预先计算好的MCP工具调用信息
        if (mcpToolCallInfos && mcpToolCallInfos.length > 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ tc: mcpToolCallInfos }) + "\n"));
          // 同时更新 contentParts（使用不可变更新）
          contentParts = [
            ...contentParts,
            ...mcpToolCallInfos.map(info => ({ type: 'tool_call' as const, info }))
          ];
        }

        for await (const chunk of aiResponse) {
          // 处理自定义 MCP 事件（使用类型守卫）
          if (isMcpStreamEvent(chunk)) {
            const event = chunk;
            logger.info('Received MCP stream event', { type: event.type, toolCallId: event.info.toolCallId });
            // 发送给前端，格式：{ te: { type: 'tool_start', info: ... } }
            controller.enqueue(encoder.encode(JSON.stringify({ te: event }) + "\n"));

            // 更新 contentParts（使用不可变更新）
            if (event.type === 'tool_start') {
              contentParts = [...contentParts, { type: 'tool_call', info: event.info }];
            } else if (event.type === 'tool_result') {
              // 找到对应的 tool_call part 并更新
              const existingIndex = contentParts.findIndex(
                p => p.type === 'tool_call' && p.info.toolCallId === event.info.toolCallId
              );
              if (existingIndex >= 0) {
                const newParts = [...contentParts];
                newParts[existingIndex] = { type: 'tool_call', info: event.info };
                contentParts = newParts;
              } else {
                // 理论上不应该发生，但防御性处理
                contentParts = [...contentParts, { type: 'tool_call', info: event.info }];
              }
            }
            continue;
          }

          // 处理统一流事件（新协议适配器输出）
          if (isUnifiedStreamEvent(chunk)) {
            const event = chunk;

            switch (event.type) {
              case 'content':
                fullText += event.delta;
                appendTextToParts(event.delta);
                controller.enqueue(encoder.encode(JSON.stringify({ c: event.delta }) + "\n"));
                break;

              case 'thinking':
                fullReasoning += event.delta;
                controller.enqueue(encoder.encode(JSON.stringify({ r: event.delta }) + "\n"));
                break;

              case 'tool_call': {
                // 工具调用事件 - 累积 delta 并发送到前端显示
                const index = event.index ?? 0;
                
                // 获取或创建累积器
                if (!toolCallAccumulators.has(index)) {
                  toolCallAccumulators.set(index, { id: event.id || `call_${index}`, name: '', arguments: '' });
                }
                const accumulator = toolCallAccumulators.get(index)!;
                
                // 累积参数
                if (event.id) accumulator.id = event.id;
                if (event.nameDelta) accumulator.name += event.nameDelta;
                if (event.argsDelta) accumulator.arguments += event.argsDelta;
                
                // 发送给前端，格式：{ tc: { id, name, arguments, index } }
                controller.enqueue(encoder.encode(JSON.stringify({
                  tc: {
                    id: accumulator.id,
                    name: accumulator.name,
                    arguments: accumulator.arguments,
                    index: index
                  }
                }) + "\n"));
                break;
              }

              case 'finish':
                // 从 finish 事件中提取 usage 信息（只在第一次收到 usage 时更新）
                if (event.usage && usage.total_tokens === 0) {
                  usage = mergeUsage(toolCallUsage || {}, event.usage);
                  logger.debug('Received usage from finish event', { 
                    usage: event.usage,
                    mergedUsage: usage 
                  });
                } else if (event.usage) {
                  logger.debug('Ignoring duplicate usage in finish event');
                } else {
                  logger.debug('No usage in finish event');
                }
                break;

              case 'error':
                logger.error('Stream error from protocol adapter', { message: event.message, raw: event.raw });
                // 发送错误信息到前端
                controller.enqueue(encoder.encode(JSON.stringify({ e: event.message }) + "\n"));
                break;

              case 'system':
                // 系统消息通常不需要特殊处理
                break;
            }

            await saveProgress();
            continue;
          }

          // 处理标准 OpenAI Chunk（向后兼容，用于 MCP 工具调用）
          const openaiChunk = chunk as OpenAI.Chat.Completions.ChatCompletionChunk;

          if (openaiChunk.usage) {
            // 如果有工具调用的usage，需要累加
            const chunkUsage = extractUsageFromOpenAIChunk(openaiChunk.usage);
            usage = mergeUsage(toolCallUsage || {}, chunkUsage);
          }

          const delta = openaiChunk.choices[0]?.delta
          const reasoning = (delta as any)?.reasoning_content || ""
          const contentRaw = delta?.content
          const { text: content, reasoning: contentReasoning } = extractTextFromDeltaContent(contentRaw)

          if (reasoning || contentReasoning) {
            const r = reasoning || contentReasoning
            fullReasoning += r
            controller.enqueue(encoder.encode(JSON.stringify({ r }) + "\n"))
          }
          if (content) {
            fullText += content
            appendTextToParts(content)
            controller.enqueue(encoder.encode(JSON.stringify({ c: content }) + "\n"))
          }

          // 定期保存进度
          await saveProgress();
        }
        // 发送 usage 数据给前端
        if (usage.total_tokens > 0) {
          logger.debug('Sending usage to frontend', { usage });
          controller.enqueue(encoder.encode(JSON.stringify({ u: usage }) + "\n"));
        } else {
          logger.debug('Not sending usage: total_tokens is 0', { usage });
        }

        await saveOnce(controller);
      } catch (err) {
        logger.error("Stream error", err);
        await saveOnce(controller);
        try { controller.error(err); } catch { }
      } finally {
        await saveOnce(controller);
        try { controller.close(); } catch { }
      }
    },
    async cancel() {
      logger.info("Stream cancelled by client");
      if (!hasSaved) {
        hasSaved = true;
        await onComplete(fullText, fullReasoning, usage, contentParts, messageId);
      }
    }
  });
}
