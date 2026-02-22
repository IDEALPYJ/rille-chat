/**
 * Chat Completions API 参数构建模块
 * 负责将 TranslatorInput 转换为 OpenAI Chat Completions API 参数
 */

import { TranslatorInput } from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';
import { logger } from '@/lib/logger';

/**
 * 内容增量类型
 */
export interface ContentDeltas {
  textDeltas: string[];
  reasoningDeltas: string[];
}

/**
 * 转换参数为 Chat Completions 格式
 */
export function translateToChatParams(input: TranslatorInput): Record<string, unknown> {
  const params: Record<string, unknown> = {
    model: input.modelConfig.id,
    messages: convertMessages(input.messages, input.instructions),
    stream: true,
  };

  // 基础参数：temperature/top_p/presence_penalty/frequency_penalty 仅当模型 parameters 中定义时才添加，避免覆盖 API 默认值
  const settings = input.userSettings;
  const paramIds = new Set((input.modelConfig?.parameters ?? []).map((p: { id: string }) => p.id));
  if (paramIds.has('temperature') && settings.temperature !== undefined) params.temperature = settings.temperature;
  if (paramIds.has('top_p') && settings.top_p !== undefined) params.top_p = settings.top_p;
  if (settings.max_tokens !== undefined) params.max_tokens = settings.max_tokens;
  if (paramIds.has('presence_penalty') && settings.presence_penalty !== undefined) params.presence_penalty = settings.presence_penalty;
  if (paramIds.has('frequency_penalty') && settings.frequency_penalty !== undefined) params.frequency_penalty = settings.frequency_penalty;
  if (settings.seed !== undefined) params.seed = settings.seed;
  if (settings.stop && settings.stop.length > 0) params.stop = settings.stop;

  // 推理参数（需要在工具之前处理，因为 kimi-k2.5 思考与搜索有冲突）
  const modelId = input.modelConfig?.id ?? '';
  const isMoonshotK25 = modelId === 'kimi-k2.5';
  const isDeepSeek = modelId.includes('deepseek');
  // 检测 web_search 工具（支持 builtin_function 旧方式和 function 新方式）
  const hasWebSearchTool = input.extra?.tools?.some((t: { type?: string; function?: { name?: string } }) =>
    (t.type === 'builtin_function' && t.function?.name === '$web_search') ||
    (t.type === 'function' && t.function?.name === 'web_search')
  );

  if (isMoonshotK25) {
    // Kimi K2.5：使用 thinking 参数控制是否启用思考
    // 注意：当启用 web_search 时，需要禁用思考功能，因为两者不兼容
    const enableThinking = input.reasoning?.enabled && !hasWebSearchTool;
    params.thinking = enableThinking ? { type: 'enabled' } : { type: 'disabled' };
    if (hasWebSearchTool && input.reasoning?.enabled) {
      logger.info('Kimi K2.5: disabling thinking because web_search is enabled');
    }
  } else if (isDeepSeek && input.reasoning?.enabled) {
    // DeepSeek 官方 API：使用 thinking 参数
    params.thinking = { type: 'enabled' };
  } else if (input.reasoning?.enabled) {
    // Mistral Magistral 推理模型：使用 prompt_mode
    if (modelId.includes('magistral')) {
      params.prompt_mode = 'reasoning';
    } else {
      // OpenAI o1/o3/o4 等：reasoning_effort, max_completion_tokens
      if (input.reasoning.effort && typeof input.reasoning.effort === 'string' && input.reasoning.effort !== 'none') {
        params.reasoning_effort = input.reasoning.effort;
      }
      if (typeof input.reasoning.effort === 'number') {
        params.max_completion_tokens = input.reasoning.effort;
      } else if (params.max_tokens !== undefined) {
        params.max_completion_tokens = params.max_tokens;
        delete params.max_tokens;
      }
    }
  }

  // 工具
  if (input.extra?.tools) {
    // 处理 builtin_function 类型工具（Moonshot 等服务商特有格式）
    const processedTools = input.extra.tools.map((tool: { type?: string }) => {
      if (tool.type === 'builtin_function') {
        // Moonshot 的 $web_search 使用 builtin_function 类型
        return tool;
      }
      return tool;
    });
    params.tools = processedTools;
    params.tool_choice = input.extra.tool_choice || 'auto';
  }

  // 结构化输出
  if (input.extra?.json_schema) {
    params.response_format = {
      type: 'json_schema',
      json_schema: input.extra.json_schema
    };
  } else if (input.extra?.json_mode) {
    params.response_format = { type: 'json_object' };
  }

  return params;
}

/**
 * Moonshot/Kimi API 参数兼容
 * - 模型不支持调整的参数不显式发送，由 API 使用默认值
 * - kimi-k2.5：temperature/top_p/n/presence_penalty/frequency_penalty 不可修改，移除后由 API 默认
 * - 其他模型：temperature 范围 [0, 1]，temp~0 时 n 必须为 1
 * - 不支持 tool_choice=required
 */
export function sanitizeParamsForMoonshot(params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  const fixedParamsK25 = ['temperature', 'top_p', 'n', 'presence_penalty', 'frequency_penalty'];
  if (out.model === 'kimi-k2.5') {
    for (const k of fixedParamsK25) delete out[k];
  } else if (out.temperature !== undefined) {
    const temp = Math.max(0, Math.min(1, Number(out.temperature)));
    out.temperature = temp;
    if (temp <= 0.01 && out.n && (out.n as number) > 1) out.n = 1;
  }
  if (out.tool_choice === 'required') out.tool_choice = 'auto';
  return out;
}

/**
 * Mistral API 参数兼容处理（seed -> random_seed 等）
 * Magistral 推理模型：当同时存在 tools 时，prompt_mode 可能导致 400，暂不发送 prompt_mode
 */
export function sanitizeParamsForMistral(params: Record<string, unknown>): Record<string, unknown> {
  const out = { ...params };
  if (out.seed !== undefined) {
    out.random_seed = out.seed;
    delete out.seed;
  }
  if (out.tools && Array.isArray(out.tools) && out.tools.length > 0 && out.prompt_mode === 'reasoning') {
    delete out.prompt_mode;
  }
  return out;
}

/**
 * 从 content 中提取文本（Mistral Magistral 2509 等返回对象/数组格式）
 */
export function extractTextFromContent(content: unknown): ContentDeltas {
  const textDeltas: string[] = [];
  const reasoningDeltas: string[] = [];

  interface ThinkingItem {
    text?: string;
  }

  interface ContentObject {
    type?: string;
    text?: string;
    thinking?: ThinkingItem[];
  }

  const extract = (val: unknown) => {
    if (typeof val === 'string' && val) {
      textDeltas.push(val);
      return;
    }
    if (val && typeof val === 'object') {
      const obj = val as ContentObject;
      if (obj.type === 'text' && typeof obj.text === 'string') {
        textDeltas.push(obj.text);
      } else if (obj.type === 'thinking' && Array.isArray(obj.thinking)) {
        for (const t of obj.thinking) {
          if (t && typeof t === 'object' && typeof t.text === 'string') {
            reasoningDeltas.push(t.text);
          }
        }
      }
    }
  };

  if (Array.isArray(content)) {
    for (const item of content) extract(item);
  } else {
    extract(content);
  }
  return { textDeltas, reasoningDeltas };
}

/**
 * 转换消息格式
 */
function convertMessages(
  messages: UnifiedMessage[],
  instructions?: string
): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];

  // 添加系统指令
  if (instructions) {
    result.push({
      role: 'system',
      content: instructions
    });
  }

  // 转换消息
  for (const msg of messages) {
    if (msg.role === 'system') {
      result.push({
        role: 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      });
    } else if (msg.role === 'user') {
      result.push({
        role: 'user',
        content: msg.content
      });
    } else if (msg.role === 'assistant') {
      const assistantMsg: Record<string, unknown> = {
        role: 'assistant',
        content: typeof msg.content === 'string' ? msg.content : null
      };

      // Moonshot API 在启用 thinking 模式时，要求 assistant 消息必须包含 reasoning_content 字段
      // 即使为空字符串也必须包含，特别是当消息中有 tool_calls 时
      if (msg.reasoning_content !== undefined) {
        assistantMsg.reasoning_content = msg.reasoning_content;
      }

      if (msg.tool_calls) {
        assistantMsg.tool_calls = msg.tool_calls;
      }

      // 调试日志
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        logger.debug('Converting assistant message with tool_calls', {
          hasReasoningContent: msg.reasoning_content !== undefined,
          reasoningContentValue: msg.reasoning_content,
          toolCallsCount: msg.tool_calls.length,
          outputHasReasoning: 'reasoning_content' in assistantMsg,
        });
      }

      result.push(assistantMsg);
    } else if (msg.role === 'tool') {
      const toolMsg: Record<string, unknown> = {
        role: 'tool',
        tool_call_id: msg.tool_call_id!,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      };
      // Moonshot需要name字段
      if (msg.name) {
        toolMsg.name = msg.name;
      }
      result.push(toolMsg);
    }
  }

  return result;
}
