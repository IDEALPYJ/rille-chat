/**
 * xAI Responses API 适配器
 * 继承 OpenAI Responses API 适配器，添加 xAI 特有的功能支持
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { XAIResponsesTranslator } from './translator';
import { logger } from '@/lib/logger';

/**
 * xAI 流式响应中的额外信息
 */
interface XAIStreamExtras {
  citations?: string[];
  inline_citations?: Array<{
    id: string;
    web_citation?: {
      url: string;
      title?: string;
    };
  }>;
  encrypted_reasoning?: string;
  search_results?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
}

/**
 * xAI Responses API 适配器实现
 */
export class XAIAdapter implements APIAdapter {
  private translator: XAIResponsesTranslator;

  constructor() {
    this.translator = new XAIResponsesTranslator();
  }

  /**
   * 执行 API 调用
   */
  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    // xAI API 端点
    const baseURL = providerConfig.baseURL || 'https://api.x.ai/v1';
    const apiKey = providerConfig.apiKey;

    // 创建 OpenAI 客户端（xAI 使用 OpenAI 兼容格式）
    const client = new OpenAI({
      apiKey,
      baseURL,
      timeout: 360000, // xAI 推理模型可能需要更长的超时时间
    });

    // 翻译参数
    let params: any;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      logger.info('xAI API call', { baseURL, model: input.modelConfig.id });
      params = this.translator.translate(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型 - 构建基本参数
      const baseArgs = input as BaseCallArgs;
      logger.info('xAI API call (BaseCallArgs)', { baseURL, model: baseArgs.model });
      params = {
        model: baseArgs.model,
        input: baseArgs.messages.flatMap(m => {
          // xAI Responses API 格式
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

    logger.info('xAI API call params', {
      model: params.model,
      hasTools: !!params.tools,
      hasReasoning: !!params.reasoning,
      store: params.store,
      hasPreviousResponseId: !!params.previous_response_id,
    });

    try {
      // 调用 xAI Responses API
      const stream = await client.responses.create(params as any);

      // 处理流式响应
      yield* this.handleStream(stream);

    } catch (error: any) {
      logger.error('xAI API error', error);

      yield {
        type: 'error',
        message: error.message || 'Unknown xAI API error',
        raw: error
      };
    }
  }

  /**
   * 处理流式响应
   * 支持 xAI 特有的事件格式和字段
   * 根据 xAI API 文档，使用事件类型区分 thinking 和 output 内容
   */
  private async *handleStream(stream: any): AsyncIterable<UnifiedStreamEvent> {
    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';
    let currentToolCallIndex = 0;
    const toolCallBuffers = new Map<number, { id?: string; name?: string; args: string }>();
    const extras: XAIStreamExtras = {};

    try {
      for await (const event of stream) {
        const eventType = event.type;

        switch (eventType) {
          case 'response.created':
            break;

          case 'response.in_progress':
            break;

          case 'response.output_item.added':
            const item = event.item;
            if (item?.type === 'message' && item.role === 'assistant') {
              yield {
                type: 'content',
                delta: '',
                role: 'assistant'
              };
            } else if (item?.type === 'reasoning') {
              // xAI 推理内容（可能是加密的）
              // 由于 grok-4 的推理内容是加密的，我们不输出 thinking 内容
              logger.debug('xAI reasoning item added', {
                reasoningId: item.id,
                hasEncryptedContent: !!item.encrypted_content
              });
              // 只记录加密内容到 extras，不输出到前端
              if (item.encrypted_content) {
                extras.encrypted_reasoning = item.encrypted_content;
              }
            } else if (item?.type === 'function_call') {
              // xAI 工具调用开始 - 捕获工具名称
              const funcCallIndex = item.index ?? currentToolCallIndex;
              if (!toolCallBuffers.has(funcCallIndex)) {
                toolCallBuffers.set(funcCallIndex, { args: '' });
              }
              const buffer = toolCallBuffers.get(funcCallIndex)!;
              if (item.id && !buffer.id) {
                buffer.id = item.id;
              }
              if (item.name && !buffer.name) {
                buffer.name = item.name;
                logger.debug('xAI got tool name from output_item.added', { id: buffer.id, name: item.name });
              }
            }
            break;

          case 'response.output_item.done':
            // 处理完成的输出项
            const doneItem = event.item;
            logger.debug('xAI output item done', {
              itemType: doneItem?.type,
              hasEncryptedContent: !!doneItem?.encrypted_content,
              reasoningId: doneItem?.id
            });
            if (doneItem?.type === 'reasoning' && doneItem.encrypted_content) {
              // xAI 加密推理内容完成 - 只记录到 extras，不输出到前端
              extras.encrypted_reasoning = doneItem.encrypted_content;
              logger.info('xAI encrypted reasoning received (not displayed)', {
                reasoningId: doneItem.id,
                contentLength: doneItem.encrypted_content.length
              });
            }
            break;

          case 'response.content_part.added':
            break;

          case 'response.content_part.done':
            break;

          // 最终输出内容 - 作为普通 content 输出
          case 'response.text.delta':
          case 'response.output_text.delta':
            if (event.delta) {
              yield {
                type: 'content',
                delta: event.delta
              };
            }
            break;

          case 'response.text.done':
            break;

          // xAI 推理/思考内容（通过 reasoning 事件返回）
          // 注意：grok-4 系列模型的推理内容是加密的，不会通过此事件返回明文
          // 只有 grok-3-mini 等模型会返回明文 reasoning 内容
          case 'response.reasoning.delta':
            // 由于当前不支持 grok-3-mini，且 grok-4 返回加密内容
            // 暂时不输出 thinking 内容，避免显示加密数据
            logger.debug('xAI reasoning delta received (ignored for grok-4)', {
              deltaLength: event.delta?.length
            });
            break;

          case 'response.reasoning_summary_text.delta':
            // reasoning_summary 是明文的推理摘要，可以显示
            if (event.delta) {
              yield {
                type: 'thinking',
                delta: event.delta
              };
            }
            break;

          case 'response.reasoning_summary_text.done':
            break;

          case 'response.reasoning.done':
            break;

          case 'response.reasoning_part.added':
            break;

          // xAI 加密推理内容
          case 'response.reasoning.encrypted_content':
            if (event.encrypted_content) {
              extras.encrypted_reasoning = event.encrypted_content;
            }
            break;

          // xAI 工具调用
          case 'response.function_call_arguments.delta':
            const funcCallIndex = event.call_index ?? currentToolCallIndex;

            if (!toolCallBuffers.has(funcCallIndex)) {
              toolCallBuffers.set(funcCallIndex, { args: '' });
            }

            const buffer = toolCallBuffers.get(funcCallIndex)!;

            // 优先使用 event.call_id，如果没有则使用 event.id
            const callId = event.call_id || event.id;
            if (callId && !buffer.id) {
              buffer.id = callId;
            }

            // 确保 buffer.id 有值
            if (!buffer.id) {
              buffer.id = `call_${funcCallIndex}`;
            }

            // 尝试从 event.name 获取工具名称
            if (event.name && !buffer.name) {
              buffer.name = event.name;
              logger.debug('xAI got tool name from event.name', { id: buffer.id, name: event.name, index: funcCallIndex });
            }

            // 如果已经有 name（可能从 output_item.added 获取）且还没有发送过，发送 tool_call 事件
            if (buffer.name && !(buffer as any).nameSent) {
              (buffer as any).nameSent = true;
              logger.debug('xAI yielding tool_call with name', { id: buffer.id, name: buffer.name, index: funcCallIndex });
              yield {
                type: 'tool_call',
                id: buffer.id,
                nameDelta: buffer.name,
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
            currentToolCallIndex++;
            break;

          // xAI 引用（citations）
          case 'response.citations':
            if (event.citations) {
              extras.citations = event.citations;
            }
            break;

          case 'response.inline_citations':
            if (event.inline_citations) {
              extras.inline_citations = event.inline_citations;
            }
            break;

          case 'response.done':
          case 'response.completed': // xAI 可能使用 response.completed 而不是 response.done
            const response = event.response;

            if (response?.status) {
              finishReason = response.status;
            }

            // xAI 响应 ID（用于继续对话）
            if (response?.id) {
              logger.info('xAI response completed', { responseId: response.id, eventType });
            }

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
              logger.debug('Extracted usage from xAI response', {
                eventType,
                usage: response.usage,
                extractedUsage: usage
              });
            } else {
              logger.debug('No usage in xAI response', {
                eventType,
                responseKeys: response ? Object.keys(response) : null
              });
            }

            // xAI 特有的搜索结果
            if (response?.search_results) {
              extras.search_results = response.search_results;
            }
            break;

          case 'error':
            logger.error('xAI stream event error received', {
              event,
              errorMessage: event.error?.message,
              errorCode: event.error?.code,
              errorType: event.error?.type,
              errorParam: event.error?.param
            });
            throw new Error(event.error?.message || 'xAI stream error');
        }
      }

      yield {
        type: 'finish',
        reason: finishReason,
        usage,
        raw: extras
      };

    } catch (error: any) {
      logger.error('xAI stream processing error', error);
      yield {
        type: 'error',
        message: error.message || 'xAI stream processing error',
        raw: error
      };
    }
  }

  /**
   * 健康检查
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const baseURL = config.baseURL || 'https://api.x.ai/v1';

      logger.info('xAI health check', { baseURL });

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL,
        timeout: 30000,
      });

      // 尝试列出模型来验证连接
      await client.models.list();

      return { success: true };
    } catch (error: any) {
      logger.error('xAI health check failed', error);
      return {
        success: false,
        error: error.message || 'xAI connectivity check failed'
      };
    }
  }

  /**
   * 列出可用模型
   */
  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const baseURL = config.baseURL || 'https://api.x.ai/v1';

      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL,
        timeout: 30000,
      });

      const response = await client.models.list();

      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
        description: model.id
      }));
    } catch (error: any) {
      logger.error('Failed to list xAI models', error);
      // 如果 API 调用失败，返回已知的 xAI 模型列表
      return [
        { id: 'grok-4', name: 'Grok 4', description: 'xAI Grok 4 model' },
        { id: 'grok-4-fast', name: 'Grok 4 Fast', description: 'xAI Grok 4 Fast model' },
        { id: 'grok-4-1-fast', name: 'Grok 4.1 Fast', description: 'xAI Grok 4.1 Fast model' },
      ];
    }
  }
}

/**
 * 创建 xAI 适配器实例
 */
export function createXAIAdapter(): XAIAdapter {
  return new XAIAdapter();
}
