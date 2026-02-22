/**
 * Anthropic Messages API 适配器
 * 负责执行 API 调用并处理流式 SSE 响应
 */

import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { logger } from '@/lib/logger';
import { AnthropicTranslator } from './translator';
function isMinimaxEndpoint(baseURL: string): boolean {
  return !!baseURL && (baseURL.includes('minimaxi') || baseURL.includes('minimax'));
}

/** MiniMax Anthropic 兼容接口对参数有额外限制，需做 sanitize */
function sanitizeRequestBodyForMinimax(body: Record<string, any>): Record<string, any> {
  const IGNORED_KEYS = new Set(['top_k', 'stop_sequences', 'service_tier', 'mcp_servers', 'context_management', 'container']);
  const out: Record<string, any> = {};

  for (const [k, v] of Object.entries(body)) {
    if (v === undefined || v === null || IGNORED_KEYS.has(k)) continue;
    out[k] = v;
  }

  if (typeof out.temperature === 'number' && (out.temperature <= 0 || out.temperature > 1)) {
    out.temperature = 1;
  }

  // 清理 input_schema，移除不兼容的字段并转换类型
  // MiniMax 对 input_schema 有严格要求，但支持 type, description, properties, required, items
  function sanitizeInputSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object' };
    }

    // 只保留支持的字段
    const result: any = {
      type: schema.type === 'array' ? 'array' : 'object',
    };

    // 处理 array 类型的 items
    if (schema.type === 'array' && schema.items) {
      result.items = sanitizeInputSchema(schema.items);
    }

    // 处理 object 类型的 properties - 保留 type 和 description 字段
    if (schema.properties && typeof schema.properties === 'object') {
      const cleanedProperties: Record<string, any> = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        if (value && typeof value === 'object') {
          const propType = (value as any).type;
          const propDesc = (value as any).description;
          const cleanedProp: any = {};

          // MiniMax 只支持这些类型: string, number, boolean, array, object
          // 注意: 不使用 integer，因为 MiniMax 可能不支持
          if (propType === 'string' || propType === 'boolean' || propType === 'array' || propType === 'object') {
            cleanedProp.type = propType;
          } else if (propType === 'integer' || propType === 'number') {
            cleanedProp.type = 'number';
          } else {
            // 对于不支持的类型，默认使用 string
            cleanedProp.type = 'string';
          }

          // 保留 description 字段（如果存在）
          if (typeof propDesc === 'string' && propDesc.length > 0) {
            cleanedProp.description = propDesc;
          }

          // 递归处理嵌套的 object/array 类型
          if (propType === 'object' && (value as any).properties) {
            const nested = sanitizeInputSchema(value);
            if (nested.properties) cleanedProp.properties = nested.properties;
            if (nested.required) cleanedProp.required = nested.required;
          } else if (propType === 'array' && (value as any).items) {
            const nested = sanitizeInputSchema(value);
            if (nested.items) cleanedProp.items = nested.items;
          }

          cleanedProperties[key] = cleanedProp;
        } else {
          cleanedProperties[key] = { type: 'string' };
        }
      }
      if (Object.keys(cleanedProperties).length > 0) {
        result.properties = cleanedProperties;
      }
    }

    // 保留 required 字段
    if (Array.isArray(schema.required) && schema.required.length > 0) {
      result.required = schema.required;
    }

    return result;
  }

  // tools：确保每个 tool 有合法结构，避免 invalid params
  // 支持 OpenAI 格式（type, function）和 Anthropic 格式（name, description, input_schema）
  // MiniMax 工具定义不需要 type 字段，只使用 name, description, input_schema
  if (Array.isArray(out.tools)) {
    const validTools = out.tools
      .map((t: any) => {
        // 处理 OpenAI 格式: { type: 'function', function: { name, description, parameters } }
        if (t.type === 'function' && t.function) {
          const parameters = t.function.parameters && typeof t.function.parameters === 'object'
            ? sanitizeInputSchema(t.function.parameters)
            : { type: 'object', properties: {} };
          return {
            name: String(t.function.name || ''),
            description: typeof t.function.description === 'string' ? t.function.description : '',
            input_schema: {
              ...parameters,
              type: parameters.type || 'object',
            },
          };
        }
        // 处理 Anthropic 格式: { name, description, input_schema }
        // MiniMax 不需要 type 字段，移除 type: 'custom'
        if (t && typeof t.name === 'string' && t.name.length > 0) {
          const inputSchema = t.input_schema && typeof t.input_schema === 'object'
            ? sanitizeInputSchema(t.input_schema)
            : { type: 'object', properties: {} };
          return {
            name: String(t.name),
            description: typeof t.description === 'string' ? t.description : '',
            input_schema: {
              ...inputSchema,
              type: inputSchema.type || 'object',
            },
          };
        }
        return null;
      })
      .filter(Boolean);
    out.tools = validTools.length > 0 ? validTools : undefined;
    if (!out.tools) delete out.tool_choice;
  }

  // system：确保为字符串，空字符串可能导致问题则移除
  if (out.system !== undefined && typeof out.system !== 'string') {
    out.system = String(out.system);
  }
  if (out.system === '') {
    delete out.system;
  }

  // messages：MiniMax 要求 content 为 [{ type: "text", text: "..." }] 等数组格式
  if (Array.isArray(out.messages)) {
    out.messages = out.messages.map((m: any) => {
      if (!m) return m;
      
      // 处理 tool 角色的消息 - Anthropic 格式要求 role 为 "user"，content 包含 tool_result 块
      if (m.role === 'tool') {
        const toolUseId = m.tool_call_id ?? m.toolUseId ?? m.id;
        const toolContent = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: toolContent ?? ''
          }]
        };
      }
      
      let content: any[];
      if (typeof m.content === 'string') {
        content = [{ type: 'text', text: m.content || ' ' }];
      } else if (Array.isArray(m.content)) {
        content = m.content
          .filter((c: any) => c && c.type !== 'image' && c.type !== 'document')
          .map((c: any) => {
            if (c.type === 'text') {
              const text = c.text ?? c.content ?? ' ';
              return { type: 'text', text: String(text) };
            }
            if (c.type === 'tool_use') {
              const id = c.id ?? c.tool_use_id;
              const name = c.name ?? c.function?.name;
              let input = c.input;
              if (input === undefined && c.function?.arguments != null) {
                try {
                  input = typeof c.function.arguments === 'string'
                    ? JSON.parse(c.function.arguments)
                    : c.function.arguments;
                } catch {
                  input = {};
                }
              }
              if (id && name) return { type: 'tool_use', id, name, input: input || {} };
              return null;
            }
            if (c.type === 'tool_result') {
              const tool_use_id = c.tool_use_id ?? c.toolUseId ?? c.id;
              const cnt = c.content ?? c.result;
              if (tool_use_id != null) return { type: 'tool_result', tool_use_id, content: cnt ?? '' };
              return null;
            }
            if (c.type === 'tool_call' && c.info) {
              const info = c.info;
              const id = info.toolCallId ?? info.id;
              const name = info.function?.name ?? info.toolName;
              let input: any = {};
              if (info.function?.arguments != null) {
                try {
                  input = typeof info.function.arguments === 'string'
                    ? JSON.parse(info.function.arguments)
                    : info.function.arguments;
                } catch {
                  input = info.arguments ?? {};
                }
              }
              if (id && name) return { type: 'tool_use', id, name, input };
              return null;
            }
            return null;
          })
          .filter(Boolean);
        if (content.length === 0) content = [{ type: 'text', text: ' ' }];
      } else {
        content = [{ type: 'text', text: ' ' }];
      }
      return { role: m.role, content };
    });
  }

  return out;
}

export class AnthropicAdapter implements APIAdapter {
  private translator = new AnthropicTranslator();

  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    const apiKey = providerConfig.apiKey;
    let baseURL = providerConfig.baseURL || 'https://api.anthropic.com';

    // MiniMax 旧 baseURL (minimax.chat/v1) 为 OpenAI 接口，Anthropic 兼容需 minimaxi.com/anthropic
    if (isMinimaxEndpoint(baseURL) && baseURL.includes('minimax.chat')) {
      baseURL = 'https://api.minimaxi.com/anthropic';
    }

    if (baseURL.endsWith('/')) baseURL = baseURL.slice(0, -1);
    const url = baseURL.endsWith('/v1')
      ? `${baseURL}/messages`
      : `${baseURL}/v1/messages`;

    // 构建请求体
    let requestBody: any;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      requestBody = this.translator.translate(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型 - 构建基本参数
      const baseArgs = input as BaseCallArgs;
      requestBody = {
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
          // 处理 assistant 消息的 tool_calls - 转换为 Anthropic 的 tool_use content 块
          if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
            const content: any[] = [];
            // 添加文本内容（如果有）
            if (msg.content && typeof msg.content === 'string' && msg.content.trim()) {
              content.push({ type: 'text', text: msg.content });
            } else if (msg.content && Array.isArray(msg.content)) {
              content.push(...msg.content);
            }
            // 添加 tool_use 块
            for (const tc of msg.tool_calls) {
              content.push({
                type: 'tool_use',
                id: tc.id,
                name: tc.function?.name || '',
                input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
              });
            }
            msg.content = content;
            delete msg.tool_calls;
          }
          return msg;
        }),
        stream: true,
        max_tokens: 4096,
        ...((baseArgs.extra as any)?.tools && { tools: (baseArgs.extra as any).tools }),
      };
    }

    if (isMinimaxEndpoint(baseURL)) {
      requestBody = sanitizeRequestBodyForMinimax(requestBody);
      const trunc = (s: unknown, max = 120) => {
        if (typeof s === 'string') return s.length > max ? s.slice(0, max) + '…' : s;
        if (s === undefined || s === null) return '';
        try {
          const str = JSON.stringify(s);
          return str.length > max ? str.slice(0, max) + '…' : str;
        } catch {
          return '[object]';
        }
      };
      logger.debug('MiniMax request body', {
        model: requestBody.model,
        msgCount: requestBody.messages?.length,
        msgRoles: requestBody.messages?.map((m: any) => m.role),
        msgContentTypes: requestBody.messages?.map((m: any) =>
          Array.isArray(m.content) ? m.content.map((c: any) => c.type) : 'str'
        ),
        toolNames: requestBody.tools?.map((t: any) => t.name),
        toolChoice: requestBody.tool_choice,
        tools: requestBody.tools?.map((t: any) => ({
          name: t.name,
          description: trunc(t.description, 50),
          input_schema: trunc(t.input_schema, 200),
        })),
        systemLen: requestBody.system?.length,
        systemPreview: trunc(requestBody.system, 80),
        fullRequestBody: trunc(requestBody, 1000),
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };

    // MiniMax 不支持 anthropic-beta，仅 Claude 使用
    if (!isMinimaxEndpoint(baseURL)) {
      const betas: string[] = [];
      // 只有在 TranslatorInput 类型时才检查这些设置
      if ('modelConfig' in input) {
        const translatorInput = input as TranslatorInput;
        if (translatorInput.userSettings?.context_1m === 'enabled') {
          betas.push('prompt-caching-2024-07-31', 'pdfs-2024-09-25', 'output-128k-2025-02-19');
        }
        if (translatorInput.userSettings?.compaction === 'enabled') {
          betas.push('compact-2026-01-12');
        }
      }
      if (betas.length > 0) {
        headers['anthropic-beta'] = betas.join(',');
      }
    }

    logger.info('Anthropic API call', { model: requestBody.model, url });

    const doFetch = (body: Record<string, any>) =>
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

    try {
      let response = await doFetch(requestBody);

      if (!response.ok && isMinimaxEndpoint(baseURL)) {
        const errData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errMsg = (errData?.error as { message?: string })?.message;
        logger.debug('MiniMax error response', { status: response.status, errMsg, errData });
        if (errMsg === 'invalid params' && requestBody.tools?.length) {
          const fallbackBody = { ...requestBody };
          delete fallbackBody.tools;
          delete fallbackBody.tool_choice;
          logger.warn('MiniMax invalid params with tools, retrying without tools', {
            tools: requestBody.tools?.map((t: any) => t.name),
          });
          response = await doFetch(fallbackBody);
        }
        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          const errMsg2 =
            (errorData?.error as { message?: string })?.message ||
            (typeof errorData?.error === 'string' ? errorData.error : null) ||
            (errorData?.message as string) ||
            `Anthropic API error: ${response.statusText}`;
          logger.debug('Anthropic API error response', { status: response.status, errorData });
          throw new Error(errMsg2);
        }
      } else if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errMsg =
          (errorData?.error as { message?: string })?.message ||
          (typeof errorData?.error === 'string' ? errorData.error : null) ||
          (errorData?.message as string) ||
          `Anthropic API error: ${response.statusText}`;
        logger.debug('Anthropic API error response', { status: response.status, errorData });
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let usage: StreamUsage | undefined;
      let finishReason = 'end_turn';
      
      // 工具调用累积器
      const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter((line) => line.trim().startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'content_block_delta') {
              // 处理文本增量
              if (data.delta?.text) {
                yield { type: 'content', delta: data.delta.text, role: 'assistant' as const };
              }
              // 处理工具调用参数增量 (input_json_delta)
              if (data.delta?.partial_json !== undefined) {
                const index = data.index ?? 0;
                const buffer = toolCallBuffers.get(index);
                if (buffer) {
                  buffer.args += data.delta.partial_json;
                  yield {
                    type: 'tool_call',
                    id: buffer.id,
                    nameDelta: '',
                    argsDelta: data.delta.partial_json,
                    index,
                  };
                }
              }
            } else if (data.type === 'content_block_start') {
              // 处理内容块开始，包括 tool_use
              if (data.content_block?.type === 'tool_use') {
                const index = data.index ?? 0;
                const toolUse = data.content_block;
                toolCallBuffers.set(index, {
                  id: toolUse.id || `call_${index}`,
                  name: toolUse.name || '',
                  args: '',
                });
                // 发送工具调用开始事件
                yield {
                  type: 'tool_call',
                  id: toolUse.id || `call_${index}`,
                  nameDelta: toolUse.name || '',
                  argsDelta: '',
                  index,
                };
              }
            } else if (data.type === 'message_delta') {
              if (data.delta?.stop_reason) finishReason = data.delta.stop_reason;
              if (data.usage) {
                usage = {
                  prompt_tokens: data.usage.input_tokens || 0,
                  completion_tokens: data.usage.output_tokens || 0,
                  total_tokens:
                    (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
                };
              }
            } else if (data.type === 'error') {
              throw new Error(data.error?.message || 'Anthropic API error');
            }
          } catch (parseError) {
            logger.warn('Failed to parse Anthropic stream chunk', parseError as Error);
          }
        }
      }

      yield { type: 'finish', reason: finishReason, usage };
    } catch (error: any) {
      logger.error('Anthropic adapter call error', error);
      yield { type: 'error', message: error.message || 'Unknown error', raw: error };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const isMinimax = config.baseURL?.includes('minimaxi') || config.baseURL?.includes('minimax');
      const targetModel = config.checkModel || (isMinimax ? 'MiniMax-M2.1' : 'claude-3-5-sonnet-20241022');
      let baseURL = config.baseURL || 'https://api.anthropic.com';

      // MiniMax 旧 baseURL (minimax.chat/v1) 为 OpenAI 兼容接口，Anthropic 兼容需用 minimaxi.com/anthropic
      if (isMinimax && (!baseURL || baseURL.includes('minimax.chat'))) {
        baseURL = 'https://api.minimaxi.com/anthropic';
      }

      if (baseURL.endsWith('/')) baseURL = baseURL.slice(0, -1);
      const url = baseURL.endsWith('/v1')
        ? `${baseURL}/messages`
        : `${baseURL}/v1/messages`;

      // MiniMax 建议 content 为 array 格式；Claude 两种均可
      const checkMessages = isMinimax
        ? [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'hi' }] }]
        : [{ role: 'user' as const, content: 'hi' }];

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 5,
          messages: checkMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Anthropic API error: ${response.statusText}`
        );
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Anthropic adapter check error', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const isMinimax = config.baseURL?.includes('minimaxi') || config.baseURL?.includes('minimax');
    if (isMinimax) {
      return [
        { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', contextLength: 204800 },
        { id: 'MiniMax-M2.1-lightning', name: 'MiniMax M2.1 Lightning', contextLength: 204800 },
        { id: 'MiniMax-M2', name: 'MiniMax M2', contextLength: 204800 },
      ];
    }

    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000 },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextLength: 200000 },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextLength: 200000 },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextLength: 200000 },
    ];
  }
}
