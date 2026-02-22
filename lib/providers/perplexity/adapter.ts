/**
 * Perplexity Chat Completions API 适配器
 * 实现完整的 Perplexity API 调用逻辑，支持流式响应和特有字段处理
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { PerplexityTranslator } from './translator';
import { logger } from '@/lib/logger';

/**
 * Perplexity 流式响应中的额外信息
 */
interface PerplexityStreamExtras {
  search_results?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
  citations?: string[];
  images?: Array<{
    url: string;
    description?: string;
  }>;
  related_questions?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: {
      input_tokens_cost: number;
      output_tokens_cost: number;
      request_cost: number;
      total_cost: number;
    };
  };
}

/**
 * Perplexity API 适配器实现
 */
export class PerplexityAdapter implements APIAdapter {
  private translator: PerplexityTranslator;

  constructor() {
    this.translator = new PerplexityTranslator();
  }

  /**
   * 执行 API 调用
   */
  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    // Perplexity API 使用 https://api.perplexity.ai 作为 baseURL
    // 注意：OpenAI SDK 默认会在 baseURL 后添加 /v1/chat/completions
    // 但 Perplexity 的 API 端点是 /v2/chat/completions
    // 所以我们需要设置 baseURL 为 https://api.perplexity.ai，然后覆盖默认路径
    const baseURL = providerConfig.baseURL || 'https://api.perplexity.ai';
    const apiKey = providerConfig.apiKey;

    logger.info('Perplexity API call', { baseURL });

    // 创建 OpenAI 客户端（Perplexity 使用 OpenAI 兼容格式）
    // 使用 dangerouslyAllowBrowser 来允许自定义路径
    const client = new OpenAI({
      apiKey,
      baseURL: `${baseURL}/v2`,  // 直接指定 v2 路径
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

    logger.info('Perplexity API call params', {
      model: params.model,
      search_mode: params.search_mode,
      search_context_size: params.search_context_size,
      stream_mode: params.stream_mode,
    });

    try {
      // 调用 Perplexity API
      const stream = await client.chat.completions.create(
        {
          ...params,
          stream: true,
        } as any
      );

      // 处理流式响应
      yield* this.handleStream(stream as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>, params.stream_mode === 'concise');

    } catch (error: any) {
      logger.error('Perplexity API error', error);

      yield {
        type: 'error',
        message: error.message || 'Unknown Perplexity API error',
        raw: error
      };
    }
  }

  /**
   * 处理流式响应
   * 支持两种模式：
   * 1. Full Mode: 标准 OpenAI 格式
   * 2. Concise Mode: Perplexity 特有格式，包含 reasoning chunks
   */
  private async *handleStream(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    isConciseMode: boolean
  ): AsyncIterable<UnifiedStreamEvent> {
    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';
    const extras: PerplexityStreamExtras = {};

    try {
      for await (const chunk of stream) {
        // 处理 usage 信息（通常在最后一个 chunk）
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

          // 处理 Perplexity 特有的 cost 信息
          const usageAny = chunk.usage as any;
          if (usageAny.cost) {
            extras.usage = {
              ...usage,
              cost: usageAny.cost,
            } as any;
          }
        }

        // 获取 chunk 类型（concise mode 特有）
        const chunkAny = chunk as any;
        const objectType = chunkAny.object;

        // 处理不同类型的 chunk（concise mode）
        if (isConciseMode && objectType) {
          switch (objectType) {
            case 'chat.reasoning':
              // 推理阶段更新
              const reasoningDelta = chunk.choices[0]?.delta;
              if (reasoningDelta?.content) {
                yield {
                  type: 'thinking',
                  delta: reasoningDelta.content
                };
              }
              continue;

            case 'chat.reasoning.done':
              // 推理完成，包含搜索结果
              if (chunkAny.search_results) {
                extras.search_results = chunkAny.search_results;
              }
              if (chunkAny.images) {
                extras.images = chunkAny.images;
              }
              continue;

            case 'chat.completion.done':
              // 最终 chunk，包含完整信息
              if (chunkAny.search_results) {
                extras.search_results = chunkAny.search_results;
              }
              if (chunkAny.images) {
                extras.images = chunkAny.images;
              }
              if (chunkAny.citations) {
                extras.citations = chunkAny.citations;
              }
              if (chunkAny.related_questions) {
                extras.related_questions = chunkAny.related_questions;
              }
              continue;
          }
        }

        // 标准内容处理（适用于 full mode 和 concise mode 的内容阶段）
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // 处理 finish reason
        if (chunk.choices[0]?.finish_reason) {
          finishReason = chunk.choices[0].finish_reason;
        }

        // 处理内容
        if (delta.content) {
          yield {
            type: 'content',
            delta: delta.content,
            role: (delta.role as any) || 'assistant'
          };
        }

        // 处理 reasoning_content（某些模型返回的推理内容）
        const reasoningContent = (delta as any).reasoning_content;
        if (typeof reasoningContent === 'string' && reasoningContent) {
          yield {
            type: 'thinking',
            delta: reasoningContent
          };
        }

        // 处理工具调用
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

        // 处理 Perplexity 特有字段（full mode 中可能出现在任意 chunk）
        if (chunkAny.search_results && !isConciseMode) {
          extras.search_results = chunkAny.search_results;
        }
        if (chunkAny.citations && !isConciseMode) {
          extras.citations = chunkAny.citations;
        }
        if (chunkAny.images && !isConciseMode) {
          extras.images = chunkAny.images;
        }
        if (chunkAny.related_questions && !isConciseMode) {
          extras.related_questions = chunkAny.related_questions;
        }
      }

      // 发送完成事件 - 使用 raw 字段传递额外信息
      yield {
        type: 'finish',
        reason: finishReason,
        usage,
        raw: extras
      };

    } catch (error: any) {
      logger.error('Perplexity stream processing error', error);
      yield {
        type: 'error',
        message: error.message || 'Stream processing error',
        raw: error
      };
    }
  }

  /**
   * 健康检查
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const baseURL = config.baseURL || 'https://api.perplexity.ai';
      
      logger.info('Perplexity health check', { baseURL });
      
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: `${baseURL}/v2`,
        timeout: 30000,
      });

      // 使用轻量级请求检查连接
      await client.chat.completions.create({
        model: config.checkModel || 'sonar',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Perplexity health check failed', error);
      return {
        success: false,
        error: error.message || 'Perplexity connectivity check failed'
      };
    }
  }

  /**
   * 列出可用模型
   * Perplexity 不提供公开的模型列表 API，返回已知的模型列表
   */
  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    // 返回 Perplexity 已知的模型列表
    return [
      {
        id: 'sonar',
        name: 'Sonar',
        description: 'Lightweight model for simple tasks',
        created: 1706409600,
        contextLength: 131072,
        features: {
          text: true,
          webSearch: true,
          toolCall: false,
        },
      },
      {
        id: 'sonar-pro',
        name: 'Sonar Pro',
        description: 'Advanced model for complex queries with image/video support',
        created: 1706409600,
        contextLength: 204800,
        features: {
          text: true,
          webSearch: true,
          toolCall: false,
          vision: true,
        },
      },
      {
        id: 'sonar-reasoning-pro',
        name: 'Sonar Reasoning Pro',
        description: 'Reasoning model for complex reasoning tasks',
        created: 1706409600,
        contextLength: 131072,
        features: {
          text: true,
          webSearch: true,
          toolCall: false,
          deepThinking: true,
        },
      },
      {
        id: 'sonar-deep-research',
        name: 'Sonar Deep Research',
        description: 'Expert-level research model with reasoning',
        created: 1706409600,
        contextLength: 131072,
        features: {
          text: true,
          webSearch: true,
          toolCall: false,
          deepThinking: true,
        },
      },
    ];
  }
}

/**
 * 创建 Perplexity 适配器实例
 */
export function createPerplexityAdapter(): PerplexityAdapter {
  return new PerplexityAdapter();
}
