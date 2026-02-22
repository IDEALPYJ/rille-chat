/**
 * Provider 常量配置
 * 集中管理所有 Provider 相关的常量，避免魔法字符串散落在各处
 */

/**
 * 使用 Provider 层协议的服务商列表
 * 这些服务商使用新的 Provider 适配层（Translator + Adapter 模式）
 */
export const PROVIDER_LAYER_PROTOCOLS = [
  'openai',
  'bailian',
  'anthropic',
  'gemini',
  'moonshot',
  'perplexity',
  'zai',
] as const;

/**
 * Provider 层协议类型
 */
export type ProviderLayerProtocol = typeof PROVIDER_LAYER_PROTOCOLS[number];

/**
 * 检查某个 Provider ID 是否使用 Provider 层协议
 * @param providerId Provider ID
 * @returns 是否使用 Provider 层协议
 */
export function isProviderLayerProtocol(providerId: string): providerId is ProviderLayerProtocol {
  return PROVIDER_LAYER_PROTOCOLS.includes(providerId as ProviderLayerProtocol);
}

/**
 * OpenAI 兼容的服务商列表
 * 这些服务商可以使用 OpenAI 适配器
 */
export const OPENAI_COMPATIBLE_PROVIDERS = [
  'openai',
  'deepseek',
  'mistral',
  'volcengine',
  'moonshot',
  'siliconflow',
] as const;

/**
 * OpenAI 兼容 Provider 类型
 */
export type OpenAICompatibleProvider = typeof OPENAI_COMPATIBLE_PROVIDERS[number];

/**
 * 检查某个 Provider ID 是否是 OpenAI 兼容的
 * @param providerId Provider ID
 * @returns 是否是 OpenAI 兼容
 */
export function isOpenAICompatible(providerId: string): providerId is OpenAICompatibleProvider {
  return OPENAI_COMPATIBLE_PROVIDERS.includes(providerId as OpenAICompatibleProvider);
}

/**
 * 图像生成 Provider 列表
 */
export const IMAGE_GENERATION_PROVIDERS = [
  'openai',
  'bailian',
  'volcengine',
  'zai',
] as const;

/**
 * 图像生成 Provider 类型
 */
export type ImageGenerationProvider = typeof IMAGE_GENERATION_PROVIDERS[number];

/**
 * 默认 Provider ID
 */
export const DEFAULT_PROVIDER = 'openai';

/**
 * 默认图像生成模型
 */
export const DEFAULT_IMAGE_MODEL = 'dall-e-3';
