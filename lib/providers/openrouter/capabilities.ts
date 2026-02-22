/**
 * OpenRouter 能力定义
 * 定义 OpenRouter 支持的参数、工具和特性
 */

import { ProviderCapabilities, ParameterConflictRules } from '../types';

/**
 * OpenRouter 能力配置
 */
export const openrouterCapabilities: ProviderCapabilities = {
  apiType: 'responses',

  parameters: {
    // 基础参数
    temperature: {
      type: 'number',
      range: [0, 2],
      description: 'Sampling temperature'
    },
    top_p: {
      type: 'number',
      range: [0, 1],
      description: 'Nucleus sampling parameter'
    },
    top_k: {
      type: 'number',
      description: 'Top-k sampling parameter'
    },
    max_output_tokens: {
      type: 'number',
      description: 'Maximum number of tokens to generate'
    },
    presence_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Presence penalty'
    },
    frequency_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Frequency penalty'
    },
    stop: {
      type: 'array',
      description: 'Stop sequences'
    },

    // OpenRouter 特有参数
    engine: {
      type: 'enum',
      enum: ['native', 'exa', 'auto'],
      description: 'Web search engine provider'
    },

    verbosity: {
      type: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Response verbosity level'
    },

    // Provider 路由参数
    provider_order: {
      type: 'array',
      description: 'Provider preference order'
    },
    provider_only: {
      type: 'array',
      description: 'Allowed providers only'
    },
    provider_ignore: {
      type: 'array',
      description: 'Providers to ignore'
    },

    // Plugin 参数
    max_results: {
      type: 'number',
      description: 'Maximum web search results'
    },
    search_prompt: {
      type: 'string',
      description: 'Custom search prompt'
    },
    auto_router: {
      type: 'boolean',
      description: 'Enable auto-router plugin'
    }
  },

  builtinTools: {
    web_search: {
      apiFormat: {
        type: 'web_search_preview'
      },
      options: ['max_results', 'engine', 'search_prompt'],
      description: 'Web search capability via OpenRouter plugins'
    },

    code_interpreter: {
      apiFormat: {
        type: 'code_interpreter'
      },
      options: ['container'],
      description: 'Code execution environment'
    },

    file_search: {
      apiFormat: {
        type: 'file_search'
      },
      options: ['vector_store_ids'],
      description: 'File search capability'
    },

    image_generation: {
      apiFormat: {
        type: 'image_generation'
      },
      description: 'Image generation capability'
    }
  },

  features: [
    'streaming',
    'function_calling',
    'reasoning',
    'structured_outputs',
    'web_search',
    'image_input',
    'file_input'
  ],

  parameterConflictRules: {
    // 当启用 reasoning 时，某些参数可能不可用
    reasoning: [
      {
        when: { reasoning_enabled: true },
        hide: ['temperature', 'top_p']
      }
    ]
  } as ParameterConflictRules
};

/**
 * OpenRouter 支持的模型系列
 */
export const openrouterModelFamilies = [
  'openai',
  'anthropic',
  'google',
  'mistral',
  'x-ai',
  'perplexity',
  'deepseek',
  'qwen',
  'moonshotai',
  'z-ai',
  'minimax'
];

/**
 * OpenRouter provider 名称映射
 */
export const openrouterProviderMapping: Record<string, string> = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'google': 'Google',
  'mistral': 'Mistral',
  'xai': 'xAI',
  'x-ai': 'xAI',
  'perplexity': 'Perplexity',
  'deepseek': 'DeepSeek',
  'qwen': 'Alibaba',
  'moonshotai': 'Moonshot AI',
  'moonshot': 'Moonshot AI',
  'z-ai': 'Z.AI',
  'zai': 'Z.AI',
  'minimax': 'Minimax',
  'exa': 'Exa'
};

/**
 * 获取 OpenRouter provider 名称
 */
export function getOpenRouterProviderName(engine: string): string | null {
  return openrouterProviderMapping[engine] || null;
}

/**
 * OpenRouter 插件配置
 */
export interface OpenRouterPluginConfig {
  id: string;
  enabled?: boolean;
  max_results?: number;
  engine?: string;
  search_prompt?: string;
}

/**
 * OpenRouter provider 配置
 */
export interface OpenRouterProviderConfig {
  order?: string[];
  only?: string[];
  ignore?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: 'allow' | 'deny';
  quantizations?: string[];
  sort?: 'price' | 'throughput' | 'latency';
  max_price?: {
    prompt?: string;
    completion?: string;
  };
}
