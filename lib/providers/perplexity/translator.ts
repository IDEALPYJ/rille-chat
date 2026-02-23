/**
 * Perplexity 参数翻译器
 * 负责将模型层配置翻译为 Perplexity Chat Completions API 参数
 */

import {
  TranslatorInput,
  ParameterTranslator
} from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';

/**
 * 检查key是否是危险的prototype key
 * 防止原型污染攻击
 */
function isDangerousKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

/**
 * Perplexity Chat Completions API 参数
 */
export interface PerplexityChatParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[];
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
  }>;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
  seed?: number;

  // Perplexity 特有参数
  search_type?: 'fast' | 'pro' | 'auto';
  search_mode?: 'web' | 'academic' | 'sec';
  search_context_size?: 'low' | 'medium' | 'high';
  search_domain_filter?: string[];
  search_recency_filter?: 'day' | 'week' | 'month' | 'year';
  return_images?: boolean;
  return_related_questions?: boolean;
  stream_mode?: 'full' | 'concise';

  // 结构化输出
  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      schema: Record<string, any>;
      strict?: boolean;
    };
  };
}

/**
 * Perplexity 参数翻译器
 */
export class PerplexityTranslator implements ParameterTranslator<TranslatorInput, PerplexityChatParams> {
  /**
   * 完整翻译流程
   */
  translate(input: TranslatorInput): PerplexityChatParams {
    const params: PerplexityChatParams = {
      model: input.modelConfig.id,
      messages: this.translateMessages(input.messages, input.instructions),
      stream: true
    };

    // 翻译基础参数
    this.translateBasicParameters(input, params);

    // 翻译 Perplexity 特有参数
    this.translatePerplexityParameters(input, params);

    // 翻译推理参数
    this.translateReasoningParameters(input, params);

    // 翻译结构化输出
    this.translateStructuredOutput(input, params);

    return params;
  }

  /**
   * 翻译基础参数
   */
  private translateBasicParameters(input: TranslatorInput, params: PerplexityChatParams): void {
    const settings = input.userSettings;
    const modelParams = input.modelConfig.parameters || [];

    // 遍历模型配置中定义的所有参数
    for (const paramDef of modelParams) {
      let value = settings[paramDef.id as keyof typeof settings];

      // 如果 userSettings 里没有找到，尝试从 extra 中找
      if (value === undefined && input.extra) {
        value = input.extra[paramDef.id];
      }

      // 如果还是没有，使用默认值
      if (value === undefined) {
        value = paramDef.default as any;
      }

      // 处理布尔值参数的字符串转换 ("true"/"false" -> true/false)
      if ((value as any) === 'true') {
        value = true as any;
      } else if ((value as any) === 'false') {
        value = false as any;
      }

      // 处理 API 字段映射
      if (paramDef.mapping && value !== undefined) {
        this.setDeepValue(params, paramDef.mapping, value);
      }
    }

    // 处理标准参数（如果没有被 mapping 处理过）
    if (params.temperature === undefined && settings.temperature !== undefined) {
      params.temperature = settings.temperature;
    }
    if (params.top_p === undefined && settings.top_p !== undefined) {
      params.top_p = settings.top_p;
    }
    if (params.max_tokens === undefined && settings.max_tokens !== undefined) {
      params.max_tokens = settings.max_tokens;
    }
    if (params.presence_penalty === undefined && settings.presence_penalty !== undefined) {
      params.presence_penalty = settings.presence_penalty;
    }
    if (params.frequency_penalty === undefined && settings.frequency_penalty !== undefined) {
      params.frequency_penalty = settings.frequency_penalty;
    }
    if (params.seed === undefined && settings.seed !== undefined) {
      params.seed = settings.seed;
    }
    if (params.stop === undefined && settings.stop && settings.stop.length > 0) {
      params.stop = settings.stop;
    }
  }

  /**
   * 翻译 Perplexity 特有参数
   */
  private translatePerplexityParameters(input: TranslatorInput, params: PerplexityChatParams): void {
    const extra = input.extra || {};

    // search_type
    if (extra.search_type !== undefined) {
      params.search_type = extra.search_type;
    }

    // search_mode
    if (extra.search_mode !== undefined) {
      params.search_mode = extra.search_mode;
    }

    // search_context_size
    if (extra.search_context_size !== undefined) {
      params.search_context_size = extra.search_context_size;
    }

    // search_domain_filter
    if (extra.search_domain_filter !== undefined && Array.isArray(extra.search_domain_filter)) {
      params.search_domain_filter = extra.search_domain_filter;
    }

    // search_recency_filter
    if (extra.search_recency_filter !== undefined) {
      params.search_recency_filter = extra.search_recency_filter;
    }

    // return_images
    if (extra.return_images !== undefined) {
      params.return_images = extra.return_images;
    }

    // return_related_questions
    if (extra.return_related_questions !== undefined) {
      params.return_related_questions = extra.return_related_questions;
    }

    // stream_mode
    if (extra.stream_mode !== undefined) {
      params.stream_mode = extra.stream_mode;
    }
  }

  /**
   * 翻译推理参数
   */
  private translateReasoningParameters(input: TranslatorInput, _params: PerplexityChatParams): void {
    // 检查模型是否支持推理特性
    if (!input.modelConfig.features?.includes('reasoning')) {
      return;
    }

    // 检查是否启用了推理
    if (!input.reasoning?.enabled) {
      return;
    }

    // Perplexity 的推理模型通过特定模型 ID 来区分
    // 如 sonar-reasoning-pro, sonar-deep-research
    // 不需要额外的参数配置
  }

  /**
   * 翻译结构化输出
   */
  private translateStructuredOutput(input: TranslatorInput, params: PerplexityChatParams): void {
    if (!input.enabledFeatures?.includes('structured_outputs')) {
      return;
    }

    if (input.extra?.json_schema) {
      params.response_format = {
        type: 'json_schema',
        json_schema: input.extra.json_schema
      };
    } else if (input.extra?.json_mode) {
      params.response_format = {
        type: 'json_object'
      };
    }
  }

  /**
   * 转换消息格式
   */
  private translateMessages(
    messages: UnifiedMessage[],
    instructions?: string
  ): PerplexityChatParams['messages'] {
    const result: PerplexityChatParams['messages'] = [];

    // 添加系统指令
    if (instructions) {
      result.push({
        role: 'system',
        content: instructions
      });
    }

    // 转换消息
    for (const msg of messages) {
      // 避免重复添加系统消息
      if (msg.role === 'system' && instructions) {
        continue;
      }

      const message: PerplexityChatParams['messages'][0] = {
        role: msg.role as any,
        content: msg.content as any
      };

      // 处理工具调用
      if (msg.tool_calls) {
        message.tool_calls = msg.tool_calls;
      }
      if (msg.tool_call_id) {
        message.tool_call_id = msg.tool_call_id;
      }
      if (msg.name) {
        message.name = msg.name;
      }

      result.push(message);
    }

    return result;
  }

  /**
   * 设置嵌套属性值
   */
  private setDeepValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');

    // 检查路径中是否包含危险的key，防止原型污染
    for (const key of keys) {
      if (isDangerousKey(key)) {
        throw new Error(`Invalid path: dangerous key "${key}" is not allowed`);
      }
    }

    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
}

/**
 * 创建 Perplexity 翻译器实例
 */
export function createPerplexityTranslator(): PerplexityTranslator {
  return new PerplexityTranslator();
}
