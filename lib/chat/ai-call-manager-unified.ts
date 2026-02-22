/**
 * MCP 工具调用处理（统一流格式版本）
 * 创建支持 MCP 工具调用的递归流，使用统一流格式
 *
 * 设计说明：
 * - 此函数是 createMcpRecursiveStream 的新版本，使用 UnifiedStreamEvent 格式
 * - 与旧版本功能相同，但支持所有协议适配器（不仅限于 OpenAI）
 * - 未来将成为唯一的 MCP 递归流实现
 *
 * 迁移计划：
 * - 当前阶段：新旧版本并存
 * - 下一阶段：所有协议适配器完成统一流格式支持后，移除旧版本
 * - 最终阶段：重命名此函数为 createMcpRecursiveStream
 */

import { logger } from "@/lib/logger";
import { handleMcpToolCallsFromUnified, McpStreamEvent } from "./mcp-stream-handler-unified";
import { UnifiedStreamEvent } from "./protocols/unified-types";
import { ProtocolAdapter } from "./protocols/base-protocol";
import { BaseCallArgs } from "./protocols/base-protocol";
import { UnifiedMessage } from "./protocols/unified-types";
import OpenAI from "openai";
import { MAX_MCP_TOOL_STEPS, accumulateUsage, createEmptyMcpUsage, McpPluginConfig } from "./mcp-constants";

/**
 * 创建支持 MCP 工具调用的递归流（统一流格式版本）
 */
export function createMcpRecursiveStreamFromUnified(
  initialStream: AsyncIterable<UnifiedStreamEvent>,
  enabledPlugins: Array<McpPluginConfig>,
  adapter: ProtocolAdapter,
  baseCallArgs: BaseCallArgs,
  mcpTools: OpenAI.Chat.Completions.ChatCompletionTool[],
  toolCallUsageRef: { value?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } },
  providerConfig?: any  // ProviderConfig for BailianAdapter
): AsyncIterable<UnifiedStreamEvent | McpStreamEvent> {
  return {
    [Symbol.asyncIterator]: async function* () {
      let currentStream = initialStream;
      let step = 0;
      let toolCallUsage = createEmptyMcpUsage();

      // 维护当前的对话历史
      const currentMessages: UnifiedMessage[] = [...baseCallArgs.messages];

      while (step < MAX_MCP_TOOL_STEPS) {
        const events: UnifiedStreamEvent[] = [];
        let hasToolCallsInCurrentStream = false;

        // 1. 消费当前流
        logger.info('Consuming stream for step', { step });
        for await (const event of currentStream) {
          events.push(event);

          if (event.type === 'tool_call') {
            hasToolCallsInCurrentStream = true;
            logger.debug('Detected tool_call event', { eventType: event.type, index: event.index });
          }

          // 实时透传给前端
          yield event;
        }
        logger.info('Finished consuming stream', { step, eventCount: events.length, hasToolCalls: hasToolCallsInCurrentStream });

        // 2. 检查是否有工具调用
        if (!hasToolCallsInCurrentStream || events.length === 0) {
          break;
        }

        step++;
        if (step >= MAX_MCP_TOOL_STEPS) {
          logger.warn("Max MCP tool execution steps reached");
          break;
        }

        // 3. 处理工具调用
        const createStreamFromEvents = (events: UnifiedStreamEvent[]): AsyncIterable<UnifiedStreamEvent> => {
          return {
            async *[Symbol.asyncIterator]() {
              for (const event of events) {
                yield event;
              }
            },
          };
        };

        const cachedStream = createStreamFromEvents(events);
        const toolCallResult = await handleMcpToolCallsFromUnified(cachedStream, enabledPlugins as unknown as import('./mcp-stream-handler-unified').McpPluginConfig[]);

        // 累加 usage
        if (toolCallResult.usage) {
          toolCallUsage = accumulateUsage(toolCallUsage, toolCallResult.usage);
        }

        // 发送工具调用事件
        if (toolCallResult.collectedToolCalls && toolCallResult.collectedToolCalls.length > 0) {
          logger.info('Sending MCP tool events', { toolCallCount: toolCallResult.toolCallInfos.length });
          for (const info of toolCallResult.toolCallInfos) {
            logger.debug('Yielding tool_start event', { toolCallId: info.toolCallId, toolName: info.toolName });
            yield { type: 'tool_start', info: { ...info, status: 'pending', result: null } };
            logger.debug('Yielding tool_result event', { toolCallId: info.toolCallId, status: info.status });
            yield { type: 'tool_result', info: { ...info } };
          }
        }

        if (toolCallResult.toolResults.length === 0) {
          break;
        }

        // 4. 准备下一轮请求
        // 对于 OpenAI Chat Completions API 兼容的服务商（如 Moonshot、Bailian），
        // 需要在 tool 消息之前添加包含 tool_calls 的 assistant 消息
        // 注意：OpenAI/Moonshot API 要求 content 为字符串或 null，不支持数组格式
        const assistantMessageWithTools: UnifiedMessage = {
          role: "assistant",
          // OpenAI/Moonshot API 要求 content 为字符串或 null，当存在 tool_calls 时通常为空字符串
          content: toolCallResult.assistantMessage || '',
          // 包含 reasoning_content，Moonshot 等服务商在启用 thinking 模式时需要此字段
          // 即使为空字符串也必须包含，否则 API 会返回 400 错误
          reasoning_content: toolCallResult.reasoning ?? '',
          tool_calls: toolCallResult.collectedToolCalls.map(tc => {
            const toolCall = tc as any;
            return {
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function?.name || 'unknown',
                arguments: toolCall.function?.arguments || '{}',
              },
            };
          }),
        };

        // 调试日志：确认 reasoning_content 被正确设置
        logger.debug('Built assistant message with tools', {
          hasReasoningContent: assistantMessageWithTools.reasoning_content !== undefined,
          reasoningContentValue: assistantMessageWithTools.reasoning_content,
          toolCallsCount: assistantMessageWithTools.tool_calls?.length,
        });

        const toolResultMessages: UnifiedMessage[] = toolCallResult.toolResults.map(tr => ({
          role: "tool",
          content: typeof tr.content === 'string' ? tr.content : JSON.stringify(tr.content),
          tool_call_id: (tr as any).tool_call_id,
          name: (tr as any).name,
        }));

        currentMessages.push(assistantMessageWithTools);
        currentMessages.push(...toolResultMessages);

        // 发起新请求
        const nextCallArgs: BaseCallArgs = {
          ...baseCallArgs,
          messages: currentMessages,
          extra: { tools: mcpTools }, // 将工具放在extra中，因为BaseCallArgs没有tools字段
        };

        // 调用适配器 - 如果提供了 providerConfig，则传递它（用于 BailianAdapter）
        if (providerConfig) {
          currentStream = (adapter as any).call(nextCallArgs, providerConfig);
        } else {
          currentStream = adapter.call(nextCallArgs);
        }
      }

      // 保存最终的 toolCallUsage
      if (toolCallUsage.total_tokens > 0) {
        toolCallUsageRef.value = toolCallUsage;
      }
    },
  };
}
