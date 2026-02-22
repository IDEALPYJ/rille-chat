/**
 * Perplexity 服务商能力定义
 * 定义 Perplexity 支持的所有 API 参数、内置工具、特性等
 */

import { ProviderCapabilities } from '../types';

/**
 * Perplexity Chat Completions API 能力定义
 */
export const PerplexityCapabilities: ProviderCapabilities = {
  apiType: 'chat',

  parameters: {
    // 基础参数
    model: {
      type: 'string',
      required: true,
      description: 'Model ID to use for generation'
    },

    messages: {
      type: 'array',
      required: true,
      description: 'Array of messages in the conversation'
    },

    // 采样参数
    temperature: {
      type: 'number',
      range: [0, 2],
      description: 'Sampling temperature between 0 and 2'
    },

    top_p: {
      type: 'number',
      range: [0, 1],
      description: 'Nucleus sampling parameter'
    },

    max_tokens: {
      type: 'number',
      description: 'Maximum number of tokens to generate'
    },

    // 流式参数
    stream: {
      type: 'boolean',
      description: 'Whether to stream the response'
    },

    stream_mode: {
      type: 'string',
      enum: ['full', 'concise'],
      description: 'Stream mode: full (default) or concise'
    },

    // Perplexity 特有搜索参数
    search_mode: {
      type: 'string',
      enum: ['web', 'academic', 'sec'],
      description: 'Search mode selector'
    },

    search_context_size: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Amount of context to include in search results'
    },

    search_domain_filter: {
      type: 'array',
      description: 'Limit or exclude specific domains from search'
    },

    search_recency_filter: {
      type: 'string',
      enum: ['day', 'week', 'month', 'year'],
      description: 'Filter search results by recency'
    },

    return_images: {
      type: 'boolean',
      description: 'Include image URLs in the response'
    },

    return_related_questions: {
      type: 'boolean',
      description: 'Include related questions in the response'
    },

    // 其他参数
    stop: {
      type: 'array',
      description: 'Sequences where the API will stop generating'
    },

    presence_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on presence'
    },

    frequency_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on frequency'
    },

    seed: {
      type: 'number',
      description: 'Random seed for deterministic sampling'
    }
  },

  builtinTools: {
    web_search: {
      apiFormat: { type: 'web_search' },
      options: ['search_mode', 'search_context_size', 'search_domain_filter', 'search_recency_filter'],
      description: 'Perplexity built-in web search capability'
    }
  },

  features: [
    'streaming',
    'structured_outputs',
    'reasoning',
    'web_search',
    'citations',
    'search_results',
    'image_output'
  ]
};

/**
 * 参数映射表: 模型层参数ID -> API参数名
 */
export const PerplexityParameterMappings = {
  temperature: {
    chatAPI: 'temperature'
  },

  top_p: {
    chatAPI: 'top_p'
  },

  max_tokens: {
    chatAPI: 'max_tokens'
  },

  search_mode: {
    chatAPI: 'search_mode'
  },

  search_context_size: {
    chatAPI: 'search_context_size'
  },

  search_domain_filter: {
    chatAPI: 'search_domain_filter'
  },

  search_recency_filter: {
    chatAPI: 'search_recency_filter'
  },

  return_images: {
    chatAPI: 'return_images'
  },

  return_related_questions: {
    chatAPI: 'return_related_questions'
  },

  stream_mode: {
    chatAPI: 'stream_mode'
  }
};

/**
 * 获取 Perplexity 能力定义
 */
export function getPerplexityCapabilities(): ProviderCapabilities {
  return PerplexityCapabilities;
}
