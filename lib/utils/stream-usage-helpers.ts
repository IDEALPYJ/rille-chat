/**
 * Stream Usage 工具函数
 * 用于统一处理流式响应中的 usage 数据
 */

import { StreamUsage } from '@/lib/chat/protocols/unified-types';

/**
 * 创建空的 usage 对象
 */
export function createEmptyUsage(): StreamUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    prompt_tokens_details: { cached_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 0 }
  };
}

/**
 * 合并两个 usage 对象
 * @param base 基础 usage
 * @param delta 要累加的 usage
 * @returns 合并后的 usage
 */
export function mergeUsage(base: Partial<StreamUsage>, delta: Partial<StreamUsage>): StreamUsage {
  const result: StreamUsage = {
    prompt_tokens: (base.prompt_tokens || 0) + (delta.prompt_tokens || 0),
    completion_tokens: (base.completion_tokens || 0) + (delta.completion_tokens || 0),
    total_tokens: (base.total_tokens || 0) + (delta.total_tokens || 0),
  };

  // 合并 prompt_tokens_details
  if (base.prompt_tokens_details || delta.prompt_tokens_details) {
    result.prompt_tokens_details = {
      cached_tokens: ((base.prompt_tokens_details?.cached_tokens || 0) +
        (delta.prompt_tokens_details?.cached_tokens || 0))
    };
  }

  // 合并 completion_tokens_details
  if (base.completion_tokens_details || delta.completion_tokens_details) {
    result.completion_tokens_details = {
      reasoning_tokens: ((base.completion_tokens_details?.reasoning_tokens || 0) +
        (delta.completion_tokens_details?.reasoning_tokens || 0))
    };
  }

  return result;
}

/**
 * 从 OpenAI Chunk 中提取 usage 信息
 * @param usage OpenAI usage 对象
 * @returns 标准化的 StreamUsage
 */
export function extractUsageFromOpenAIChunk(usage: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}): StreamUsage {
  return {
    prompt_tokens: usage.prompt_tokens || 0,
    completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    prompt_tokens_details: usage.prompt_tokens_details
      ? { cached_tokens: usage.prompt_tokens_details.cached_tokens || 0 }
      : undefined,
    completion_tokens_details: usage.completion_tokens_details
      ? { reasoning_tokens: usage.completion_tokens_details.reasoning_tokens || 0 }
      : undefined,
  };
}

/**
 * 从 Responses API 响应中提取 usage 信息
 * @param usage Responses API usage 对象
 * @returns 标准化的 StreamUsage
 */
export function extractUsageFromResponsesAPI(usage: {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
}): StreamUsage {
  return {
    prompt_tokens: usage.input_tokens || 0,
    completion_tokens: usage.output_tokens || 0,
    total_tokens: usage.total_tokens || 0,
    prompt_tokens_details: usage.input_tokens_details
      ? { cached_tokens: usage.input_tokens_details.cached_tokens || 0 }
      : undefined,
    completion_tokens_details: usage.output_tokens_details
      ? { reasoning_tokens: usage.output_tokens_details.reasoning_tokens || 0 }
      : undefined,
  };
}

/**
 * 累加 usage 详情字段
 * @param target 目标 usage
 * @param source 源 usage
 * @param field 字段名 ('prompt_tokens_details' | 'completion_tokens_details')
 * @param subField 子字段名 ('cached_tokens' | 'reasoning_tokens')
 */
export function addUsageDetail(
  target: StreamUsage,
  source: StreamUsage,
  field: 'prompt_tokens_details' | 'completion_tokens_details',
  subField: 'cached_tokens' | 'reasoning_tokens'
): void {
  const targetField = target[field] as Record<string, number> | undefined;
  const sourceField = source[field] as Record<string, number> | undefined;

  if (!targetField) {
    (target[field] as Record<string, number>) = { [subField]: 0 };
  }

  const currentValue = (target[field] as Record<string, number>)[subField] || 0;
  const addValue = sourceField?.[subField] || 0;
  (target[field] as Record<string, number>)[subField] = currentValue + addValue;
}
