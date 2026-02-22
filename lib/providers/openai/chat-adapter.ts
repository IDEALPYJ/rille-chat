/**
 * OpenAI Chat Completions API 适配器 (降级选项)
 * 为不支持Responses API的场景提供降级方案
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { logger } from '@/lib/logger';
import { createEmptyUsage, extractUsageFromOpenAIChunk, addUsageDetail } from '@/lib/utils/stream-usage-helpers';
import {
  translateToChatParams,
  sanitizeParamsForMoonshot,
  sanitizeParamsForMistral,
  extractTextFromContent
} from './chat-params-builder';
import { getWebSearchTool, FormulaTool } from '@/lib/providers/moonshot/formula-tools';

/**
 * Chat Completions API 适配器实现
 */
export class ChatAdapter implements APIAdapter {
  /**
   * 执行API调用
   * 支持工具调用的多轮循环（用于Moonshot等内置函数）
   */
  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    // 创建OpenAI客户端
    const client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    });

    // 判断输入类型并转换参数
    let params: Record<string, unknown>;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      params = translateToChatParams(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型
      const baseArgs = input as BaseCallArgs;
      const isMoonshot = providerConfig.baseURL?.includes('moonshot.cn');
      params = {
        model: baseArgs.model,
        messages: baseArgs.messages.map(m => {
          const msg: any = { ...m };
          // 确保 content 不为 null/undefined，Mistral 等服务商不接受 null
          if (msg.content === null || msg.content === undefined) {
            msg.content = '';
          }
          // 对于非 Moonshot 服务商，移除可能导致问题的字段（如 reasoning_content）
          // Moonshot 在启用 thinking 模式时需要保留 reasoning_content
          if (!isMoonshot && msg.reasoning_content !== undefined) {
            delete msg.reasoning_content;
          }
          return msg;
        }),
        stream: true,
        ...((baseArgs.extra as any)?.tools && { tools: (baseArgs.extra as any).tools }),
      };
    }

    // Mistral 专用参数映射（seed -> random_seed）
    if (providerConfig.baseURL?.includes('mistral.ai')) {
      params = sanitizeParamsForMistral(params);
    }

    // Moonshot/Kimi API 参数兼容
    const isMoonshot = providerConfig.baseURL?.includes('moonshot.cn');
    let formulaTools: FormulaTool[] = [];
    
    if (isMoonshot) {
      params = sanitizeParamsForMoonshot(params);
      
      // 如果启用了 web_search，获取 Formula 工具声明
      if (params.tools && Array.isArray(params.tools)) {
        const hasWebSearchTool = params.tools.some((t: { function?: { name?: string } }) => 
          t.function?.name === 'web_search'
        );
        
        if (hasWebSearchTool && providerConfig.apiKey && providerConfig.baseURL) {
          try {
            formulaTools = await getWebSearchTool(providerConfig.baseURL, providerConfig.apiKey);
            logger.info('Fetched Moonshot Formula tools', { 
              count: formulaTools.length,
              names: formulaTools.map(t => t.function?.name)
            });
            
            // 用 Formula 工具声明替换原有的工具声明
            params.tools = formulaTools;
          } catch (error) {
            logger.error('Failed to fetch Formula tools, falling back to builtin', error);
          }
        }
      }
    }

    logger.info('OpenAI Chat Completions API call', {
      model: params.model,
      hasTools: !!params.tools,
      toolChoice: params.tool_choice,
      isMoonshot,
      formulaToolCount: formulaTools.length
    });

    // 调试：打印完整的请求体
    logger.debug('Chat Completions API request body', { 
      body: JSON.stringify(params, null, 2),
      messageCount: (params.messages as any[])?.length,
      messages: (params.messages as any[])?.map((m, i) => ({
        index: i,
        role: m.role,
        content: m.content,
        hasToolCalls: !!m.tool_calls,
        toolCallsCount: m.tool_calls?.length,
        toolCallId: m.tool_call_id
      }))
    });

    // 用于累积多轮调用的usage
    const totalUsage: StreamUsage = createEmptyUsage();

    try {
      let currentUsage: StreamUsage | undefined;
      let finishReason = 'stop';

      logger.info('Starting API call', {
        hasTools: !!(params as any).tools,
        messageCount: (params as any).messages?.length,
      });

      let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      try {
        stream = await client.chat.completions.create(params as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming);
      } catch (firstErr: unknown) {
        const err = firstErr as { status?: number };
        if (
          err?.status === 400 &&
          providerConfig.baseURL?.includes('mistral.ai') &&
          params.tools && Array.isArray(params.tools) && params.tools.length > 0
        ) {
          const paramsNoTools = { ...params };
          delete paramsNoTools.tools;
          delete paramsNoTools.tool_choice;
          logger.warn('Mistral 400 with tools, retrying without tools', {
            model: params.model,
            toolCount: params.tools.length,
          });
          stream = await client.chat.completions.create(paramsNoTools as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming);
        } else {
          throw firstErr;
        }
      }

      // 收集当前轮次的完整assistant消息和tool calls
      for await (const chunk of stream) {
        // 处理 usage 信息
        // OpenAI 标准格式: chunk.usage
        // Moonshot 格式: chunk.choices[0].usage
        const usage = chunk.usage || (chunk.choices[0] as unknown as { usage?: unknown })?.usage;
        if (usage) {
          currentUsage = extractUsageFromOpenAIChunk(usage);
          logger.debug('Extracted usage from chunk', { 
            usage,
            source: chunk.usage ? 'chunk.usage' : 'chunk.choices[0].usage'
          });
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // 处理 finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // 处理 content（Mistral Magistral 2509 返回 content 为对象数组，需提取文本）
        const contentVal = delta.content;
        if (contentVal !== undefined && contentVal !== null) {
          const { textDeltas, reasoningDeltas } = extractTextFromContent(contentVal);
          for (const r of reasoningDeltas) {
            yield { type: 'thinking', delta: r };
          }
          for (const t of textDeltas) {
            const role = delta.role === 'assistant' || delta.role === 'user' || delta.role === 'system' 
              ? delta.role 
              : 'assistant';
            yield { type: 'content', delta: t, role };
          }
        }

        // 处理 reasoning content（某些模型如 DeepSeek 使用此字段）
        const reasoningContent = (delta as unknown as { reasoning_content?: string }).reasoning_content;
        if (typeof reasoningContent === 'string' && reasoningContent) {
          yield { type: 'thinking', delta: reasoningContent };
        }

        // 处理 tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function) {
              yield {
                type: 'tool_call',
                id: toolCall.id,
                nameDelta: toolCall.function.name,
                argsDelta: toolCall.function.arguments,
                index: toolCall.index,
              };
            }
          }
        }
      }

      // 累积usage
      if (currentUsage) {
        totalUsage.prompt_tokens += currentUsage.prompt_tokens;
        totalUsage.completion_tokens += currentUsage.completion_tokens;
        totalUsage.total_tokens += currentUsage.total_tokens;
        if (currentUsage.prompt_tokens_details) {
          addUsageDetail(totalUsage, currentUsage, 'prompt_tokens_details', 'cached_tokens');
        }
        if (currentUsage.completion_tokens_details) {
          addUsageDetail(totalUsage, currentUsage, 'completion_tokens_details', 'reasoning_tokens');
        }
      }

      // 发送 finish 事件
      yield {
        type: 'finish',
        reason: finishReason,
        usage: totalUsage,
      };

    } catch (error: unknown) {
      const err = error as { message?: string; status?: number; error?: unknown; code?: string };
      const errDetail: Record<string, unknown> = {
        message: err.message,
        status: err.status,
      };
      if (err.error) errDetail.apiError = err.error;
      if (err.code) errDetail.code = err.code;
      logger.error('OpenAI Chat Completions API error', error, errDetail);

      yield {
        type: 'error',
        message: err.message || 'Unknown error',
        raw: error,
      };
    }
  }

  /**
   * 健康检查
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });

      await client.models.list();

      return {
        success: true
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      return {
        success: false,
        error: err.message || 'Connection failed'
      };
    }
  }

  /**
   * 列出可用模型
   */
  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });

      const response = await client.models.list();

      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
        description: model.id
      }));
    } catch (error: unknown) {
      logger.error('Failed to list models', error);
      return [];
    }
  }
}
