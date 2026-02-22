/**
 * OpenRouter Responses API 适配器
 * 实现 OpenRouter 的 Responses API 调用逻辑
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { OpenRouterTranslator } from './translator';
import { logger } from '@/lib/logger';

/**
 * OpenRouter API 适配器实现
 */
export class OpenRouterAdapter implements APIAdapter {
  private translator: OpenRouterTranslator;

  constructor() {
    this.translator = new OpenRouterTranslator();
  }

  /**
   * 执行 API 调用
   */
  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    // 创建 OpenAI 客户端 (OpenRouter 兼容 OpenAI SDK)
    const client = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://rille-chat.app',
        'X-Title': 'Rille Chat'
      }
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
        input: baseArgs.messages.flatMap(m => {
          // OpenRouter Responses API 格式
          // 对于包含 tool_calls 的 assistant 消息，需要添加 function_call 项
          if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
            const items: any[] = [];
            // 添加 assistant 消息（如果有 content）
            if (m.content) {
              items.push({
                role: m.role,
                content: m.content,
              });
            }
            // 添加 function_call 项
            for (const tc of m.tool_calls) {
              items.push({
                type: 'function_call',
                call_id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
              });
            }
            return items;
          }

          // 对于 tool 消息，使用 type: 'function_call_output', call_id, output 格式
          if (m.role === 'tool' && m.tool_call_id) {
            return [{
              type: 'function_call_output',
              call_id: m.tool_call_id,
              output: String(m.content || '')
            }];
          }

          // 其他消息保持简单格式
          return [{
            role: m.role,
            content: m.content || '',
          }];
        }),
        // 转换 tools 格式从 Chat Completions 格式到 Responses API 格式
        ...((baseArgs.extra as any)?.tools && {
          tools: (baseArgs.extra as any).tools.map((tool: any) => {
            if (tool.type === 'function' && tool.function) {
              // 从 Chat Completions 格式转换
              return {
                type: 'function',
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters,
                strict: tool.function.strict
              };
            }
            // 已经是 Responses API 格式
            return tool;
          })
        }),
        stream: true,
      };
    }

    logger.info('OpenRouter Responses API call', {
      model: params.model,
      hasPlugins: !!params.plugins,
      hasTools: !!params.tools,
      hasReasoning: !!params.reasoning
    });

    try {
      // 调用 Responses API
      const stream = await client.responses.create(params as any);

      // 处理流式响应
      yield* this.handleStream(stream);

    } catch (error: any) {
      logger.error('OpenRouter Responses API error', error);

      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error
      };
    }
  }

  /**
   * 处理流式响应
   */
  private async *handleStream(stream: any): AsyncIterable<UnifiedStreamEvent> {
    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';
    let currentToolCallIndex = 0;
    const toolCallBuffers = new Map<number, { id?: string; name?: string; args: string }>();

    try {
      for await (const event of stream) {
        const eventType = event.type;

        switch (eventType) {
          case 'response.created':
            // 响应创建事件
            logger.debug('OpenRouter response created', {
              responseId: event.response?.id
            });
            break;

          case 'response.in_progress':
            // 响应处理中事件
            logger.debug('OpenRouter response in progress');
            break;

          case 'response.output_item.added':
            // 新的输出项开始
            const item = event.item;
            if (item?.type === 'message' && item.role === 'assistant') {
              yield {
                type: 'content',
                delta: '',
                role: 'assistant'
              };
            } else if (item?.type === 'function_call') {
              // 函数调用开始
              currentToolCallIndex = event.output_index || 0;
              if (!toolCallBuffers.has(currentToolCallIndex)) {
                toolCallBuffers.set(currentToolCallIndex, { args: '' });
              }
              const buffer = toolCallBuffers.get(currentToolCallIndex)!;
              buffer.id = item.id;
              buffer.name = item.name;

              yield {
                type: 'tool_call',
                id: item.id,
                nameDelta: item.name || '',
                argsDelta: '',
                index: currentToolCallIndex
              };
            } else if (item?.type === 'reasoning') {
              // 推理开始
            }
            break;

          case 'response.output_item.done':
            // 输出项完成
            break;

          case 'response.content_part.added':
            // 新的内容部分开始
            break;

          case 'response.content_part.done':
            // 内容部分完成
            break;

          case 'response.text.delta':
            // 文本增量
            if (event.delta) {
              yield {
                type: 'content',
                delta: event.delta
              };
            }
            break;

          case 'response.output_text.delta':
            // 输出文本增量 (OpenRouter 特有事件)
            if (event.delta) {
              yield {
                type: 'content',
                delta: event.delta
              };
            }
            break;

          case 'response.text.done':
            // 文本完成
            break;

          case 'response.reasoning.delta':
          case 'response.reasoning_summary_text.delta':
            // 推理过程增量 (支持两种事件名称)
            if (event.delta) {
              yield {
                type: 'thinking',
                delta: event.delta
              };
            }
            break;

          case 'response.reasoning.done':
            // 推理过程完成
            break;

          case 'response.reasoning_summary_part.added':
            // 推理摘要部分添加
            logger.debug('OpenRouter reasoning summary part added');
            break;

          case 'response.function_call_arguments.delta':
            // 函数调用参数增量
            const funcCallIndex = event.call_index ?? currentToolCallIndex;

            if (!toolCallBuffers.has(funcCallIndex)) {
              toolCallBuffers.set(funcCallIndex, { args: '' });
            }

            const buffer = toolCallBuffers.get(funcCallIndex)!;

            if (event.call_id && !buffer.id) {
              buffer.id = event.call_id;
            }

            if (event.name && !buffer.name) {
              buffer.name = event.name;
              yield {
                type: 'tool_call',
                id: buffer.id,
                nameDelta: event.name,
                argsDelta: '',
                index: funcCallIndex
              };
            }

            if (event.delta) {
              buffer.args += event.delta;
              yield {
                type: 'tool_call',
                id: buffer.id,
                nameDelta: '',
                argsDelta: event.delta,
                index: funcCallIndex
              };
            }
            break;

          case 'response.function_call_arguments.done':
            // 函数调用参数完成
            currentToolCallIndex++;
            break;

          case 'response.web_search_call.added':
            // Web search 调用添加
            logger.info('OpenRouter web search call added', {
              callId: event.item?.id
            });
            break;

          case 'response.web_search_call.done':
            // Web search 调用完成
            logger.info('OpenRouter web search call done', {
              callId: event.item?.id,
              status: event.item?.status
            });
            break;

          case 'response.done':
          case 'response.completed': // OpenRouter 使用 response.completed 而不是 response.done
            // 响应完成
            const response = event.response;

            if (response?.status) {
              finishReason = response.status;
            }

            // 提取 usage 信息
            if (response?.usage) {
              usage = {
                prompt_tokens: response.usage.input_tokens || 0,
                completion_tokens: response.usage.output_tokens || 0,
                total_tokens: response.usage.total_tokens || 0,
                prompt_tokens_details: response.usage.input_tokens_details
                  ? { cached_tokens: response.usage.input_tokens_details.cached_tokens }
                  : undefined,
                completion_tokens_details: response.usage.output_tokens_details
                  ? { reasoning_tokens: response.usage.output_tokens_details.reasoning_tokens }
                  : undefined,
              };

              logger.debug('Extracted usage from OpenRouter response', {
                eventType,
                usage: response.usage,
                extractedUsage: usage
              });

              // OpenRouter 特有的 cost 信息
              if (response.usage.cost) {
                (usage as any).cost = response.usage.cost;
              }
            } else {
              logger.debug('No usage in OpenRouter response', {
                eventType,
                responseKeys: response ? Object.keys(response) : null
              });
            }

            // 提取 URL citations (web search 结果)
            const citations = this.extractCitations(response);
            if (citations.length > 0) {
              logger.info('OpenRouter response includes citations', {
                citationCount: citations.length
              });
            }
            break;

          case 'error':
            // 错误事件
            throw new Error(event.error?.message || 'Stream error');

          default:
            // 处理其他未知事件类型
            logger.debug('Unhandled OpenRouter event type', { eventType });
        }
      }

      // 发送完成事件
      yield {
        type: 'finish',
        reason: finishReason,
        usage
      };

    } catch (error: any) {
      logger.error('OpenRouter stream processing error', error);
      yield {
        type: 'error',
        message: error.message || 'Stream processing error',
        raw: error
      };
    }
  }

  /**
   * 从响应中提取 URL citations
   */
  private extractCitations(response: any): any[] {
    const citations: any[] = [];

    if (!response?.output) {
      return citations;
    }

    for (const item of response.output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'output_text' && content.annotations) {
            for (const annotation of content.annotations) {
              if (annotation.type === 'url_citation') {
                citations.push({
                  url: annotation.url,
                  title: annotation.title,
                  startIndex: annotation.start_index,
                  endIndex: annotation.end_index
                });
              }
            }
          }
        }
      }
    }

    return citations;
  }

  /**
   * 健康检查
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      });

      // 尝试列出模型来验证连接
      await client.models.list();

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed'
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
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      });

      const response = await client.models.list();

      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
        description: model.id
      }));
    } catch (error: any) {
      logger.error('Failed to list OpenRouter models', error);
      return [];
    }
  }
}
