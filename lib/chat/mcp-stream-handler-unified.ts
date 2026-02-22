/**
 * MCP 工具调用处理（统一流格式版本）
 * 处理 UnifiedStreamEvent 流并提取工具调用
 */

import { logger } from "@/lib/logger";
import { McpToolCallInfo } from "@/lib/types";
import { MCP } from "@/lib/constants";
import { StreamUsage } from "./stream-helper";
import { UnifiedStreamEvent } from "./protocols/unified-types";
import OpenAI from "openai";

export interface McpPluginConfig {
  id: string;
  name: string;
  serverUrl: string;
  authType: string;
  apiKey: string | null;
  advancedConfig: {
    keyValuePairs?: Record<string, string>;
    ignoreSSL?: boolean;
  };
}

// 重新导出类型
export type { McpToolCallInfo };

// 流式事件定义
export type McpStreamEvent = {
  type: 'tool_start';
  info: McpToolCallInfo;
} | {
  type: 'tool_result';
  info: McpToolCallInfo;
};

// MAX_TOOL_RESULT_SIZE is defined in MCP constants
void MCP.MAX_TOOL_RESULT_SIZE;

/**
 * 从统一流事件中提取工具调用
 */
export async function handleMcpToolCallsFromUnified(
  aiResponse: AsyncIterable<UnifiedStreamEvent>,
  enabledMcpPlugins: McpPluginConfig[]
): Promise<{
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  toolCallInfos: McpToolCallInfo[];
  hasToolCalls: boolean;
  assistantMessage: string;
  reasoning: string;
  usage: StreamUsage;
  collectedToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
}> {
  interface ToolCallAccumulator {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
    index?: number;
  }

  const toolCallsMap = new Map<number, ToolCallAccumulator>();
  let assistantMessage = "";
  let reasoning = "";
  let usage: StreamUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };

  // 收集流式响应中的函数调用和内容
  for await (const event of aiResponse) {
    if (event.type === 'content' && event.delta) {
      assistantMessage += event.delta;
    } else if (event.type === 'thinking' && event.delta) {
      reasoning += event.delta;
    } else if (event.type === 'tool_call') {
      const index = event.index ?? 0;

      if (!toolCallsMap.has(index)) {
        toolCallsMap.set(index, {
          id: event.id || `call_${index}`,
          type: "function" as const,
          function: {
            name: event.nameDelta || "",
            arguments: event.argsDelta || "",
          },
          index,
        });
      } else {
        const existing = toolCallsMap.get(index)!;
        // 更新 id（如果之前是临时的，现在有真实的 id 了）
        if (event.id && existing.id.startsWith('call_')) {
          existing.id = event.id;
        }
        if (event.nameDelta) {
          existing.function.name += event.nameDelta;
        }
        if (event.argsDelta) {
          existing.function.arguments += event.argsDelta;
        }
      }
    } else if (event.type === 'finish' && event.usage) {
      usage = {
        prompt_tokens: event.usage.prompt_tokens || 0,
        completion_tokens: event.usage.completion_tokens || 0,
        total_tokens: event.usage.total_tokens || 0,
        prompt_tokens_details: event.usage.prompt_tokens_details ? {
          cached_tokens: event.usage.prompt_tokens_details.cached_tokens || 0
        } : undefined,
        completion_tokens_details: event.usage.completion_tokens_details ? {
          reasoning_tokens: event.usage.completion_tokens_details.reasoning_tokens || 0
        } : undefined,
      };
    }
  }

  // 转换为数组
  const allToolCalls = Array.from(toolCallsMap.values());
  logger.info('All tool calls from map', { 
    allToolCallsCount: allToolCalls.length,
    allToolCalls: JSON.stringify(allToolCalls)
  });
  
  const collectedToolCalls = allToolCalls
    .filter(tc => tc.id)  // 只检查 id，不检查 name
    .map(tc => ({
      id: tc.id,
      type: tc.type || 'function',
      function: {
        name: String(tc.function.name || 'unknown'),  // 如果 name 为空，使用 'unknown'
        arguments: String(tc.function.arguments || '{}'),
      },
    })) as OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];

  logger.info('Collected tool calls from stream', { 
    toolCallsCount: collectedToolCalls.length, 
    enabledPluginsCount: enabledMcpPlugins.length,
    toolCalls: JSON.stringify(collectedToolCalls)
  });

  // 如果没有函数调用，直接返回
  if (collectedToolCalls.length === 0 || enabledMcpPlugins.length === 0) {
    logger.info('No tool calls to process', { collectedToolCallsCount: collectedToolCalls.length, enabledPluginsCount: enabledMcpPlugins.length });
    return {
      toolCalls: [],
      toolResults: [],
      toolCallInfos: [],
      hasToolCalls: false,
      assistantMessage,
      reasoning,
      usage,
      collectedToolCalls: [],
    };
  }

  // 执行工具调用
  const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  const toolCallInfos: McpToolCallInfo[] = [];

  const eventGenerator = executeMcpToolsWithEvents(collectedToolCalls, enabledMcpPlugins);

  for await (const event of eventGenerator) {
    if (event.type === 'tool_result') {
      toolCallInfos.push(event.info);
      toolResults.push({
        role: "tool",
        tool_call_id: event.info.toolCallId,
        content: JSON.stringify(event.info.result || { error: event.info.error }),
      } as any);
    }
  }

  return {
    toolCalls: collectedToolCalls,
    toolResults,
    toolCallInfos,
    hasToolCalls: toolResults.length > 0,
    assistantMessage,
    reasoning,
    usage,
    collectedToolCalls,
  };
}

/**
 * 执行 MCP 工具并产生流式事件（复用原有实现）
 */
async function* executeMcpToolsWithEvents(
  collectedToolCalls: any[],
  enabledMcpPlugins: McpPluginConfig[]
): AsyncIterable<McpStreamEvent> {
  // 复用原有实现
  const { executeMcpToolsWithEvents: originalExecuteMcpToolsWithEvents } = await import("./mcp-stream-handler");
  yield* originalExecuteMcpToolsWithEvents(collectedToolCalls, enabledMcpPlugins);
}
