import OpenAI from "openai";
import { AdvancedSettings, UserSettings, ProviderConfig, Message } from "@/lib/types";
import { getEnabledMcpPlugins, convertMcpPluginsToTools } from "@/lib/chat/mcp-helper";
import { handleMcpToolCalls, McpStreamEvent } from "@/lib/chat/mcp-stream-handler";
import { logger } from "@/lib/logger";
import { getProtocolForProvider, getPreferredAPIForProvider } from "./protocol-config";
import { getAdapterForProvider } from "./protocols";
import { convertToUnifiedMessages, convertToCommonSettings } from "./protocols/message-converter";
import { UnifiedStreamEvent } from "./protocols/unified-types";
import { MAX_MCP_TOOL_STEPS, accumulateUsage, createEmptyMcpUsage } from "./mcp-constants";

export interface ProviderSelection {
  selectedProviderId: string;
  selectedProviderConfig: ProviderConfig;
  selectedModel: string;
  baseURL: string | undefined;
}

export interface AICallOptions {
  messages: Message[];
  providerSelection: ProviderSelection;
  settings: UserSettings;
  advancedSettings?: AdvancedSettings;
  userId: string;
}

export interface AICallResult {
  aiResponse: AsyncIterable<UnifiedStreamEvent | McpStreamEvent | OpenAI.Chat.Completions.ChatCompletionChunk>;
  enabledMcpPlugins: Array<{ id: string; [key: string]: unknown }>;
  toolCallUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 初始化 OpenAI 客户端
 */
export function createOpenAIClient(providerSelection: ProviderSelection): OpenAI {
  return new OpenAI({
    apiKey: providerSelection.selectedProviderConfig.apiKey,
    baseURL: providerSelection.baseURL,
  });
}

/**
 * 准备 MCP 工具
 */
export async function prepareMcpTools(
  userId: string,
  settings: UserSettings
): Promise<{
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  enabledPlugins: Array<{ id: string; [key: string]: unknown }>;
}> {
  try {
    const enabledPlugins = await getEnabledMcpPlugins(userId, settings);
    if (enabledPlugins.length === 0) {
      return { tools: [], enabledPlugins: [] };
    }
    
    const tools = await convertMcpPluginsToTools(enabledPlugins);
    return { tools, enabledPlugins: enabledPlugins as any };
  } catch {
    logger.error("Failed to get MCP plugins");
    return { tools: [], enabledPlugins: [] };
  }
}

/**
 * 构建 AI 调用参数
 */
export function buildAICallParams(
  messages: Message[],
  model: string,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  advancedSettings?: AdvancedSettings
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
  const params: any = {
    model,
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    stream: true,
    stream_options: { include_usage: true },
  };

  // 添加工具
  if (tools.length > 0) {
    params.tools = tools;
    params.tool_choice = "auto";
  }

  // 应用高级设置
  if (advancedSettings) {
    if (advancedSettings.temperature !== undefined) params.temperature = advancedSettings.temperature;
    if (advancedSettings.topP !== undefined) params.top_p = advancedSettings.topP;
    if (advancedSettings.topK !== undefined) {
      params.top_k = advancedSettings.topK;
    }
    if (advancedSettings.presencePenalty !== undefined) params.presence_penalty = advancedSettings.presencePenalty;
    if (advancedSettings.frequencyPenalty !== undefined) params.frequency_penalty = advancedSettings.frequencyPenalty;
    if (advancedSettings.seed !== undefined) params.seed = advancedSettings.seed;
    if (advancedSettings.stopSequences !== undefined && advancedSettings.stopSequences.length > 0) {
      params.stop = advancedSettings.stopSequences;
    }
  }

  return params;
}

/**
 * 创建支持 MCP 工具调用的递归流
 * 
 * @deprecated 此函数使用旧的 OpenAI Chunk 格式，建议使用 createMcpRecursiveStreamFromUnified
 * 作为过渡方案，新旧逻辑将并存直到统一流格式完全稳定
 * 
 * 设计说明：
 * - 旧逻辑：使用 OpenAI.Chat.Completions.ChatCompletionChunk 格式
 * - 新逻辑：使用 UnifiedStreamEvent 格式（见 ai-call-manager-unified.ts）
 * - 两者功能相同，但数据格式不同
 * - 迁移计划：待所有协议适配器完成统一流格式支持后，移除此函数
 */
export function createMcpRecursiveStream(
  initialStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  enabledPlugins: Array<{ id: string; [key: string]: unknown }>,
  openai: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
  mcpTools: OpenAI.Chat.Completions.ChatCompletionTool[],
  toolCallUsageRef: { value?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }
): AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk | McpStreamEvent> {
  return {
    [Symbol.asyncIterator]: async function* () {
      let currentStream = initialStream;
      let step = 0;
      let toolCallUsage = createEmptyMcpUsage();

      // 维护当前的对话历史
      const currentMessages = params.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        reasoning_content: (msg as unknown as Record<string, unknown>).reasoning_content
      })) as unknown as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

      while (step < MAX_MCP_TOOL_STEPS) {
        const chunks: OpenAI.Chat.Completions.ChatCompletionChunk[] = [];
        let hasToolCallsInCurrentStream = false;

        // 1. 消费当前流
        for await (const chunk of currentStream) {
          chunks.push(chunk);
          
          if (chunk.choices[0]?.delta?.tool_calls && chunk.choices[0].delta.tool_calls.length > 0) {
            hasToolCallsInCurrentStream = true;
          }

          // 实时透传给前端
          yield chunk;
        }

        // 2. 检查是否有工具调用
        if (!hasToolCallsInCurrentStream || chunks.length === 0) {
          break;
        }

        step++;
        if (step >= MAX_MCP_TOOL_STEPS) {
          logger.warn("Max MCP tool execution steps reached");
          break;
        }

        // 3. 处理工具调用
        const createStreamFromChunks = (chunks: OpenAI.Chat.Completions.ChatCompletionChunk[]): AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> => {
          return {
            async *[Symbol.asyncIterator]() {
              for (const chunk of chunks) {
                yield chunk;
              }
            }
          };
        };

        const cachedStream = createStreamFromChunks(chunks);
        const toolCallResult = await handleMcpToolCalls(cachedStream, enabledPlugins as unknown as import('./mcp-stream-handler').McpPluginConfig[]);

        // 累加 usage
        if (toolCallResult.usage) {
          toolCallUsage = accumulateUsage(toolCallUsage, toolCallResult.usage);
        }

        // 发送工具调用事件
        if (toolCallResult.collectedToolCalls && toolCallResult.collectedToolCalls.length > 0) {
          for (const info of toolCallResult.toolCallInfos) {
            yield { type: 'tool_start', info: { ...info, status: 'pending', result: null } };
            yield { type: 'tool_result', info: { ...info } };
          }
        }

        if (toolCallResult.toolResults.length === 0) {
          break;
        }

        // 4. 准备下一轮请求
        const assistantMessageWithTools: any = {
          role: "assistant",
          content: toolCallResult.assistantMessage || null,
          reasoning_content: toolCallResult.reasoning || undefined,
          tool_calls: toolCallResult.toolCalls
        };
        
        currentMessages.push(assistantMessageWithTools);
        currentMessages.push(...toolCallResult.toolResults);

        // 发起新请求
        const nextParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
          ...params,
          messages: currentMessages,
          tools: mcpTools,
          tool_choice: "auto"
        };

        currentStream = await openai.chat.completions.create(nextParams);
      }
      
      // 保存最终的 toolCallUsage
      if (toolCallUsage.total_tokens > 0) {
        toolCallUsageRef.value = toolCallUsage;
      }
    }
  };
}

/**
 * 执行 AI 调用（支持 MCP 工具）
 * 
 * 注意：MCP 工具调用目前仅支持 OpenAI 协议，使用旧的 OpenAI SDK 逻辑
 * 对于其他协议或没有 MCP 工具的情况，使用新的协议适配器
 */
export async function executeAICall(options: AICallOptions): Promise<AICallResult> {
  const { messages, providerSelection, settings, advancedSettings, userId } = options;
  
  // 获取协议类型
  const protocolType = getProtocolForProvider(providerSelection.selectedProviderId);

  // 准备 MCP 工具
  const { tools: mcpTools, enabledPlugins } = await prepareMcpTools(userId, settings);

  // 如果启用了 MCP 工具且是 OpenAI 协议，使用旧的逻辑（MCP 工具调用尚未重构为支持统一流格式）
  if (enabledPlugins.length > 0 && mcpTools.length > 0 && protocolType === 'openai') {
    // 使用旧的 OpenAI SDK 逻辑处理 MCP 工具调用
    const openai = createOpenAIClient(providerSelection);
    const params = buildAICallParams(
      messages,
      providerSelection.selectedModel,
      mcpTools,
      advancedSettings
    );

    const aiResponse = await openai.chat.completions.create(params);
    const toolCallUsageRef: { value?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } } = {};
    
    try {
      const chunks: OpenAI.Chat.Completions.ChatCompletionChunk[] = [];
      const bufferedStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> = {
        [Symbol.asyncIterator]: async function* () {
          try {
            for await (const chunk of aiResponse) {
              chunks.push(chunk);
              yield chunk;
            }
          } catch (error) {
            throw error;
          }
        }
      };

      const finalAiResponse = createMcpRecursiveStream(
        bufferedStream,
        enabledPlugins,
        openai,
        params,
        mcpTools,
        toolCallUsageRef
      );

      return {
        aiResponse: finalAiResponse as any, // 类型转换，因为返回类型包含 OpenAI chunk
        enabledMcpPlugins: enabledPlugins,
        toolCallUsage: toolCallUsageRef.value,
      };
    } catch (error) {
      logger.error("Failed to setup buffered stream", error);
      return {
        aiResponse: aiResponse as any,
        enabledMcpPlugins: enabledPlugins,
        toolCallUsage: toolCallUsageRef.value,
      };
    }
  }

  // 对于没有 MCP 工具或非 OpenAI 协议的情况，使用新的协议适配器
  const adapter = getAdapterForProvider(providerSelection.selectedProviderId);
  if (!adapter) {
    throw new Error(`No protocol adapter found for provider: ${providerSelection.selectedProviderId}`);
  }

  const unifiedMessages = convertToUnifiedMessages(messages);
  const commonSettings = convertToCommonSettings(advancedSettings);

  const protocol = getProtocolForProvider(providerSelection.selectedProviderId);
  const extra: { tools?: any[]; forceAPI?: 'responses' | 'chat' } = {};
  if (mcpTools.length > 0) extra.tools = mcpTools;
  if (protocol === 'openai') extra.forceAPI = getPreferredAPIForProvider(providerSelection.selectedProviderId);

  const callArgs = {
    messages: unifiedMessages,
    model: providerSelection.selectedModel,
    settings: commonSettings,
    providerConfig: providerSelection.selectedProviderConfig,
    providerId: providerSelection.selectedProviderId,
    reasoning: advancedSettings?.reasoning,
    extra: Object.keys(extra).length > 0 ? extra : undefined,
  };

  const stream = adapter.call(callArgs);

  // 如果启用了 MCP 工具，使用统一流格式的 MCP 递归流
  if (enabledPlugins.length > 0 && mcpTools.length > 0) {
    const { createMcpRecursiveStreamFromUnified } = await import("./ai-call-manager-unified");
    const toolCallUsageRef: { value?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } } = {};
    
    try {
      const finalAiResponse = createMcpRecursiveStreamFromUnified(
        stream,
        enabledPlugins,
        adapter,
        callArgs,
        mcpTools,
        toolCallUsageRef
      );

      return {
        aiResponse: finalAiResponse as any,
        enabledMcpPlugins: enabledPlugins,
        toolCallUsage: toolCallUsageRef.value,
      };
    } catch (error) {
      logger.error("Failed to setup MCP recursive stream", error);
      return {
        aiResponse: stream,
        enabledMcpPlugins: enabledPlugins,
        toolCallUsage: undefined,
      };
    }
  }

  return {
    aiResponse: stream,
    enabledMcpPlugins: enabledPlugins,
    toolCallUsage: undefined,
  };
}

