/**
 * SiliconFlow Chat Completions API 适配器
 * 实现完整的 SiliconFlow API 调用逻辑，支持流式响应和特有字段处理
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { SiliconFlowTranslator } from './translator';
import { logger } from '@/lib/logger';

interface SiliconFlowStreamExtras {
  reasoning_content?: string;
}

export class SiliconFlowAdapter implements APIAdapter {
  private translator: SiliconFlowTranslator;

  constructor() {
    this.translator = new SiliconFlowTranslator();
  }

  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    const baseURL = providerConfig.baseURL || 'https://api.siliconflow.cn/v1';
    const apiKey = providerConfig.apiKey;

    logger.info('SiliconFlow API call', { baseURL });

    const client = new OpenAI({
      apiKey,
      baseURL: `${baseURL}/chat`,
      timeout: 60000,
    });

    // 翻译参数
    let params: any;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      params = this.translator.translate(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型 - 构建基本参数
      const baseArgs = input as BaseCallArgs;
      params = {
        model: baseArgs.model,
        messages: baseArgs.messages.map(m => {
          const msg: any = { ...m };
          // 确保 content 不为 null/undefined
          if (msg.content === null || msg.content === undefined) {
            msg.content = '';
          }
          // 移除可能导致问题的字段
          if (msg.reasoning_content !== undefined) {
            delete msg.reasoning_content;
          }
          return msg;
        }),
        stream: true,
        ...((baseArgs.extra as any)?.tools && { tools: (baseArgs.extra as any).tools }),
      };
    }

    logger.info('SiliconFlow API call params', {
      model: params.model,
      enable_thinking: params.enable_thinking,
      thinking_budget: params.thinking_budget,
    });

    try {
      const stream = await client.chat.completions.create(
        params as any
      );

      yield* this.handleStream(stream as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>);

    } catch (error: any) {
      logger.error('SiliconFlow API error', error);

      yield {
        type: 'error',
        message: error.message || 'Unknown SiliconFlow API error',
        raw: error
      };
    }
  }

  private async *handleStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  ): AsyncIterable<UnifiedStreamEvent> {
    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';
    const extras: SiliconFlowStreamExtras = {};

    try {
      for await (const chunk of stream) {
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

          const usageAny = chunk.usage as any;
          if (usageAny.prompt_cache_hit_tokens !== undefined || usageAny.prompt_cache_miss_tokens !== undefined) {
            usage.prompt_tokens_details = {
              cached_tokens: usageAny.prompt_cache_hit_tokens,
              ...usage.prompt_tokens_details
            };
          }
        }

        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        if (delta.content) {
          yield {
            type: 'content',
            delta: delta.content,
            role: (delta.role as any) || 'assistant'
          };
        }

        const reasoningContent = (delta as any).reasoning_content;
        if (typeof reasoningContent === 'string' && reasoningContent) {
          extras.reasoning_content = (extras.reasoning_content || '') + reasoningContent;
          yield {
            type: 'thinking',
            delta: reasoningContent
          };
        }

        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            yield {
              type: 'tool_call',
              id: toolCall.id,
              nameDelta: toolCall.function?.name,
              argsDelta: toolCall.function?.arguments,
              index: (toolCall as any).index
            };
          }
        }
      }

      yield {
        type: 'finish',
        reason: finishReason,
        usage,
        raw: extras
      };

    } catch (error: any) {
      logger.error('SiliconFlow stream processing error', error);
      yield {
        type: 'error',
        message: error.message || 'Stream processing error',
        raw: error
      };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const baseURL = config.baseURL || 'https://api.siliconflow.cn/v1';
      
      logger.info('SiliconFlow health check', { baseURL });
      
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: `${baseURL}/chat`,
        timeout: 30000,
      });

      const firstModel = config.checkModel || 'Pro/zai-org/GLM-4.7';
      
      await client.chat.completions.create({
        model: firstModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('SiliconFlow health check failed', error);
      return {
        success: false,
        error: error.message || 'SiliconFlow connectivity check failed'
      };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    const siliconflowModels = await import('@/lib/data/models/siliconflow');
    return siliconflowModels.siliconflowModelConfigs.map(model => ({
      id: model.id,
      name: model.displayName,
      description: `${model.modelType} model with context window of ${model.contextWindow}`,
      created: model.releasedAt ? new Date(model.releasedAt).getTime() / 1000 : 0,
      contextLength: model.contextWindow,
      features: {
        text: model.modalities.input.includes('text') || model.modalities.output.includes('text'),
        vision: model.modalities.input.includes('image') || model.modalities.input.includes('video'),
        toolCall: model.features.includes('function_call'),
        deepThinking: model.features.includes('reasoning'),
      },
    }));
  }
}

export function createSiliconFlowAdapter(): SiliconFlowAdapter {
  return new SiliconFlowAdapter();
}
