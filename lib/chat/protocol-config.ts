/**
 * 协议配置和映射
 * 每个 provider 的协议类型、支持的 API 类型（OpenAI 系）、默认接入点统一在此维护
 */

export type ProtocolType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'perplexity'
  | 'ollama'
  | 'bailian'
  | 'zai';

/** OpenAI 兼容 provider 可选的 API：responses（新 Responses API）或 chat（Chat Completions API） */
export type PreferredAPI = 'responses' | 'chat';

/**
 * 单个 provider 的 API 协议与接入点配置
 */
export interface ProviderApiConfig {
  /** 使用的协议类型 */
  protocol: ProtocolType;
  /** 默认 base URL（OpenAI 系为 API 根地址） */
  defaultBaseURL: string;
  /** 仅对 protocol=openai 有效：优先使用的 API，未填则默认 chat */
  preferredAPI?: PreferredAPI;
}

/**
 * 各 provider 支持的 API 协议与默认接入点（单一数据源）
 */
export const PROVIDER_API_CONFIG: Record<string, ProviderApiConfig> = {
  // OpenAI Chat Completions 协议
  openai: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.openai.com/v1',
    preferredAPI: 'responses',
  },
  deepseek: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    preferredAPI: 'chat',
  },
  xai: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.x.ai/v1',
    preferredAPI: 'responses',
  },
  mistral: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.mistral.ai/v1',
    preferredAPI: 'chat',
  },
  openrouter: {
    protocol: 'openai',
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    preferredAPI: 'responses',
  },
  volcengine: {
    protocol: 'openai',
    defaultBaseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    preferredAPI: 'responses',
  },
  moonshot: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.moonshot.cn/v1',
    preferredAPI: 'chat',
  },
  siliconflow: {
    protocol: 'openai',
    defaultBaseURL: 'https://api.siliconflow.cn/v1',
    preferredAPI: 'chat',
  },
  zai: {
    protocol: 'zai',
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    preferredAPI: 'chat',
  },

  // Gemini
  google: {
    protocol: 'gemini',
    defaultBaseURL: 'https://generativelanguage.googleapis.com',
  },

  // Anthropic
  anthropic: {
    protocol: 'anthropic',
    defaultBaseURL: 'https://api.anthropic.com',
  },
  minimax: {
    protocol: 'anthropic',
    defaultBaseURL: 'https://api.minimaxi.com/anthropic',
  },

  // Perplexity
  perplexity: {
    protocol: 'perplexity',
    defaultBaseURL: 'https://api.perplexity.ai',
    preferredAPI: 'chat',
  },

  // Ollama
  ollama: {
    protocol: 'ollama',
    defaultBaseURL: 'http://localhost:11434/v1',
  },

  // DashScope (Bailian)
  bailian: {
    protocol: 'bailian',
    defaultBaseURL: 'https://dashscope.aliyuncs.com/api/v1',
  },
};

/**
 * 获取指定 provider 的完整 API 配置（协议 + 默认接入点 + 可选 preferredAPI）
 */
export function getProviderApiConfig(providerId: string): ProviderApiConfig | null {
  return PROVIDER_API_CONFIG[providerId] ?? null;
}

/**
 * 服务商到协议的映射
 */
export function getProtocolForProvider(providerId: string): ProtocolType {
  const config = PROVIDER_API_CONFIG[providerId];
  if (config) return config.protocol;
  return 'openai';
}

/**
 * 获取 OpenAI 兼容服务商的 API 类型偏好
 * 仅 protocol=openai 时有效；未配置或未知 provider 默认使用 chat
 */
export function getPreferredAPIForProvider(providerId: string): PreferredAPI {
  const config = PROVIDER_API_CONFIG[providerId];
  if (config?.protocol === 'openai' && config.preferredAPI) return config.preferredAPI;
  return 'chat';
}

/**
 * 获取服务商的默认 baseURL
 */
export function getDefaultBaseURLForProvider(providerId: string): string {
  const config = PROVIDER_API_CONFIG[providerId];
  return config?.defaultBaseURL ?? '';
}

/**
 * 统一为 provider 配置填充默认 baseURL（当 config.baseURL 为空时）
 * 用于 check、listModels、call 等场景，确保接入点正确
 */
export function enrichProviderConfigWithDefaults<T extends { baseURL?: string }>(
  providerId: string,
  config: T
): T {
  if (config.baseURL) return config;
  const defaultBaseURL = getDefaultBaseURLForProvider(providerId);
  if (!defaultBaseURL) return config;
  return { ...config, baseURL: defaultBaseURL };
}
