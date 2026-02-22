/**
 * OpenAI Chat Completions 协议适配器
 * 支持所有使用 OpenAI 兼容 API 的服务商
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from './base-protocol';
import { UnifiedStreamEvent, StreamUsage } from './unified-types';
import { logger } from '@/lib/logger';

export class OpenAIProtocolAdapter implements ProtocolAdapter {
  /**
   * 执行 API 调用并返回统一格式的流
   */
  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig, extra } = args;

    // 创建 OpenAI 客户端
    const client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    });

    // 构建 OpenAI API 参数
    const params: any = {
      model,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      stream: true,
      stream_options: { include_usage: true },
    };

    // 应用设置
    if (settings.temperature !== undefined) params.temperature = settings.temperature;
    if (settings.top_p !== undefined) params.top_p = settings.top_p;
    if (settings.top_k !== undefined) {
      params.top_k = settings.top_k;
    }
    if (settings.max_tokens !== undefined) params.max_tokens = settings.max_tokens;
    if (settings.presence_penalty !== undefined) params.presence_penalty = settings.presence_penalty;
    if (settings.frequency_penalty !== undefined) params.frequency_penalty = settings.frequency_penalty;
    if (settings.seed !== undefined) params.seed = settings.seed;
    if (settings.stop !== undefined && settings.stop.length > 0) {
      params.stop = settings.stop;
    }

    // 处理工具（如果提供）
    if (extra && typeof extra === 'object' && 'tools' in extra) {
      const tools = (extra as { tools?: OpenAI.Chat.Completions.ChatCompletionTool[] }).tools;
      if (tools && tools.length > 0) {
        params.tools = tools;
        params.tool_choice = "auto";
      }
    }

    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';

    try {
      const stream = await client.chat.completions.create(params) as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;

      for await (const chunk of stream) {
        // 处理 usage 信息（通常在最后一个 chunk 中）
        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens || 0,
            completion_tokens: chunk.usage.completion_tokens || 0,
            total_tokens: chunk.usage.total_tokens || 0,
            prompt_tokens_details: chunk.usage.prompt_tokens_details
              ? { cached_tokens: chunk.usage.prompt_tokens_details.cached_tokens }
              : undefined,
            completion_tokens_details: chunk.usage.completion_tokens_details
              ? { reasoning_tokens: chunk.usage.completion_tokens_details.reasoning_tokens }
              : undefined,
          };
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // 处理 finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // 处理 content
        if (delta.content) {
          const role = delta.role === 'assistant' || delta.role === 'user' || delta.role === 'system'
            ? delta.role
            : 'assistant';
          yield {
            type: 'content',
            delta: delta.content,
            role,
          };
        }

        // 处理 reasoning content（如果支持）
        if ((delta as any).reasoning_content) {
          yield {
            type: 'thinking',
            delta: (delta as any).reasoning_content,
          };
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

      // 发送 finish 事件
      yield {
        type: 'finish',
        reason: finishReason,
        usage,
      };
    } catch (error: any) {
      logger.error('OpenAI protocol call error', error);
      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error,
      };
    }
  }

  /**
   * 检查 API 连接是否正常
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: 30000,
      });

      const testModel = config.checkModel || 'gpt-3.5-turbo';
      await client.chat.completions.create({
        model: testModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('OpenAI protocol check error', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
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
        timeout: 30000,
      });

      const response = await client.models.list();
      return response.data.map((model: any) => {
        // 尝试从 API 响应中提取模型名称
        // 某些兼容 API 可能返回 name, display_name 或其他字段
        const modelName = model.name || model.display_name || model.displayName || model.id;
        
        return {
          id: model.id,
          name: modelName,
          description: model.description,
          created: model.created,
          // 某些 API 可能返回其他有用信息
          contextLength: model.context_length,
          pricing: model.pricing ? {
            prompt: model.pricing.prompt,
            completion: model.pricing.completion,
          } : undefined,
        };
      });
    } catch (error: any) {
      logger.error('OpenAI protocol listModels error', error);
      throw error;
    }
  }
}
