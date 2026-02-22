/**
 * OpenAI Responses API 适配器
 * 实现完整的Responses API调用逻辑
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { OpenAIResponsesTranslator } from './translator';
import { logger } from '@/lib/logger';
import { extractUsageFromResponsesAPI } from '@/lib/utils/stream-usage-helpers';

/**
 * Responses API 适配器实现
 */
export class ResponsesAdapter implements APIAdapter {
  private translator: OpenAIResponsesTranslator;

  constructor() {
    this.translator = new OpenAIResponsesTranslator();
  }

  /**
   * 执行API调用
   * 支持两种参数格式：TranslatorInput 或 BaseCallArgs
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

    // 构建参数
    let params: any;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      params = this.translator.translate(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型 - 只传递必要的参数，不传递模型特定的参数
      // 模型参数由前端配置和 translator 处理
      const baseArgs = input as BaseCallArgs;
      params = {
        model: baseArgs.model,
        input: baseArgs.messages.flatMap(m => {
          // Responses API 使用不同的工具调用格式
          // 参考: https://platform.openai.com/docs/guides/function-calling
          
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
            // 返回 function_call_output 格式，不包含 role
            return [{
              type: 'function_call_output',
              call_id: m.tool_call_id,
              output: String(m.content || '')
            }];
          }
          
          // 其他消息保持简单格式
          return [{
            role: m.role,
            content: m.content || '',  // 确保 content 不为 null
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

    logger.info('OpenAI Responses API call', {
      model: params.model,
      hasTools: !!params.tools,
      hasReasoning: !!params.reasoning,
      toolsCount: params.tools?.length || 0,
      inputMessagesCount: params.input?.length || 0,
      params: JSON.stringify(params, null, 2)
    });

    try {
      // 调用Responses API
      logger.debug('Calling OpenAI Responses API with params', { params: JSON.stringify(params, null, 2) });
      const stream = await client.responses.create(params as any);

      // 处理流式响应
      yield* this.handleStream(stream);

    } catch (error: any) {
      logger.error('OpenAI Responses API error', {
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code,
        errorType: error.type,
        errorStatus: error.status,
        errorCause: error.cause,
        stack: error.stack
      });

      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error
      };
    }
  }

  /**
   * 处理流式响应
   * 支持 OpenAI 和 Volcengine 的多种事件格式
   */
  private async *handleStream(stream: any): AsyncIterable<UnifiedStreamEvent> {
    let usage: StreamUsage | undefined;
    let finishReason: string = 'stop';
    let currentToolCallIndex = 0;
    const toolCallBuffers = new Map<number, { id?: string; name?: string; nameSent?: boolean; args: string }>();

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
            }
            // 处理工具调用输出项
            if (item?.type === 'function_call') {
              const funcCallIndex = item.index ?? currentToolCallIndex;
              if (!toolCallBuffers.has(funcCallIndex)) {
                toolCallBuffers.set(funcCallIndex, { args: '' });
              }
              const buffer = toolCallBuffers.get(funcCallIndex)!;
              
              // 设置工具调用信息
              if (item.id && !buffer.id) {
                buffer.id = item.id;
              }
              if (item.name && !buffer.name) {
                buffer.name = item.name;
                logger.debug('Got tool name from output_item.added', { id: buffer.id, name: item.name });
              }
            }
            break;

          case 'response.output_item.done':
            // 某些 provider 可能在此事件中返回 usage
            const doneItem = event.item;
            if (doneItem?.usage) {
              usage = extractUsageFromResponsesAPI(doneItem.usage);
              logger.debug('Extracted usage from response.output_item.done', { 
                usage: doneItem.usage,
                extractedUsage: usage 
              });
            }
            break;

          case 'response.content_part.added':
            break;

          case 'response.content_part.done':
            break;

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

          case 'response.reasoning.delta':
          case 'response.reasoning_summary_text.delta':
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
              logger.debug('Got tool name from event.name', { id: buffer.id, name: event.name, index: funcCallIndex });
            }
            
            // 如果已经有 name，发送 tool_call 事件
            if (buffer.name && !buffer.nameSent) {
              buffer.nameSent = true;
              logger.debug('Yielding tool_call with name', { id: buffer.id, name: buffer.name, index: funcCallIndex });
              yield {
                type: 'tool_call',
                id: buffer.id,
                nameDelta: buffer.name,
                argsDelta: '',
                index: funcCallIndex
              };
            } else if (event.delta) {
              // 只记录参数增量
              logger.debug('Yielding tool_call with args delta', { id: buffer.id, argsDelta: event.delta, index: funcCallIndex });
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

          case 'response.done':
          case 'response.completed': // volcengine 使用 response.completed 而不是 response.done
            const response = event.response;

            if (response?.status) {
              finishReason = response.status;
            }

            if (response?.usage) {
              usage = extractUsageFromResponsesAPI(response.usage);
              logger.debug('Extracted usage from response.done/completed', { 
                eventType,
                model: response.model,
                usage: response.usage,
                extractedUsage: usage 
              });
            } else {
              logger.debug('No usage in response.done/completed event', { 
                eventType,
                model: response?.model,
                responseKeys: response ? Object.keys(response) : null 
              });
            }
            break;

          case 'error':
            logger.error('Stream event error received', {
              event,
              errorMessage: event.error?.message,
              errorCode: event.error?.code,
              errorType: event.error?.type,
              errorParam: event.error?.param
            });
            throw new Error(event.error?.message || 'Stream error');

          default:
            // 记录未处理的事件类型，用于调试
            logger.debug('Unhandled stream event type', { eventType, eventKeys: Object.keys(event) });
        }
      }

      yield {
        type: 'finish',
        reason: finishReason,
        usage
      };

    } catch (error: any) {
      logger.error('Stream processing error', error);
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
      const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
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
        baseURL: config.baseURL,
      });

      const response = await client.models.list();

      return response.data.map(model => ({
        id: model.id,
        name: model.id,
        created: model.created,
        description: model.id
      }));
    } catch (error: any) {
      logger.error('Failed to list models', error);
      return [];
    }
  }
}
