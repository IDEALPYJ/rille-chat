import { ComponentType } from 'react'
import {
  OpenAI,
  Anthropic,
  Google,
  Meta,
  Mistral,
  DeepSeek,
  Perplexity,
  Spark,
  Minimax,
  Moonshot,
  Zhipu,
  SiliconCloud,
  OpenRouter,
  AlibabaCloud,
  Doubao,
  Volcengine,
  Qwen,
  Gemma,
  ByteDance,
  XAI,
  Ollama,
  Yi,
  Claude,
  Kimi,
  Grok,
  Gemini
} from '@lobehub/icons'

/**
 * 图标映射配置接口
 */
export interface IconMappingConfig {
  providerMappings: Record<string, ComponentType<any>>
  avatarMappings: Record<string, ComponentType<any>>
}

/**
 * 服务商ID到图标的映射
 * 用于根据服务商配置的ID字段查找对应的Lobehub图标组件
 */
export const providerMappings: Record<string, ComponentType<any>> = {
  aliyun: AlibabaCloud,
  anthropic: Anthropic,
  bailian: AlibabaCloud,
  deepseek: DeepSeek,
  gemini: Gemini,
  google: Google,
  minimax: Minimax,
  mistral: Mistral,
  moonshot: Moonshot,
  openai: OpenAI,
  openrouter: OpenRouter,
  perplexity: Perplexity,
  siliconflow: SiliconCloud,
  volcengine: Volcengine,
  xai: XAI,
  zai: Zhipu,
  // 协议支持
  ollama: Ollama,
}

/**
 * 模型avatar字段到图标的映射
 * 用于根据模型配置的avatar字段查找对应的Lobehub图标组件
 */
export const avatarMappings: Record<string, ComponentType<any>> = {
  // 主要模型品牌
  claude: Claude,
  gemini: Gemini,
  gemma: Gemma,
  gpt: OpenAI,
  glm: Zhipu,
  kimi: Kimi,
  qwen: Qwen,
  doubao: Doubao,
  grok: Grok,
  perplexity: Perplexity,
  mistral: Mistral,
  deepseek: DeepSeek,
  llama: Meta,
  minimax: Minimax,
  abab: Minimax,
  spark: Spark,
  // 服务商（用于兼容）
  aliyun: AlibabaCloud,
  anthropic: Anthropic,
  google: Google,
  openai: OpenAI,
  moonshot: Moonshot,
  zhipu: Zhipu,
  siliconflow: SiliconCloud,
  siliconcloud: SiliconCloud,
  openrouter: OpenRouter,
  volcengine: Volcengine,
  xai: XAI,
  bailian: AlibabaCloud,
  zai: Zhipu,
  // 其他
  lingyi: Yi,
  yi: Yi,  // 零一万物
  tencent: ByteDance,
}

/**
 * 所有已配置的服务商ID列表
 */
export const supportedProviders = Object.keys(providerMappings)

/**
 * 所有已配置的avatar值列表
 */
export const supportedAvatars = Object.keys(avatarMappings)

/**
 * 根据服务商ID查找对应的图标组件
 * @param providerId 服务商ID
 * @returns 图标组件，如果未找到返回null
 */
export function getIconByProvider(providerId: string): ComponentType<any> | null {
  if (!providerId) return null
  const lowerProviderId = providerId.toLowerCase()
  return providerMappings[lowerProviderId] || null
}

/**
 * 根据avatar值查找对应的图标组件
 * @param avatar 模型avatar值
 * @returns 图标组件，如果未找到返回null
 */
export function getIconByAvatar(avatar: string): ComponentType<any> | null {
  if (!avatar) return null
  const lowerAvatar = avatar.toLowerCase()
  return avatarMappings[lowerAvatar] || null
}

/**
 * 根据模型 ID 推断可能的 avatar（用于无 avatar 时的兜底）
 * 仅当模型 ID 明确包含某品牌关键词且该 avatar 已配置时才返回
 */
export function getAvatarFromModelId(modelId: string): string | undefined {
  if (!modelId || typeof modelId !== 'string') return undefined
  const lower = modelId.toLowerCase()
  // 按品牌关键词匹配，优先更具体的匹配
  const modelIdToAvatar: Array<{ pattern: string | RegExp; avatar: string }> = [
    { pattern: 'qwen', avatar: 'qwen' },
    { pattern: 'wan', avatar: 'qwen' },  // wan2.6-image 等 wanx 系列模型使用 qwen 图标
    { pattern: 'z-image', avatar: 'qwen' },  // z-image-turbo 等模型使用 qwen 图标
    { pattern: 'gpt', avatar: 'gpt' },
    { pattern: 'claude', avatar: 'claude' },
    { pattern: 'gemini', avatar: 'gemini' },
    { pattern: 'kimi', avatar: 'kimi' },
    { pattern: 'deepseek', avatar: 'deepseek' },
    { pattern: 'doubao', avatar: 'doubao' },
    { pattern: 'seedream', avatar: 'doubao' },  // seedream 系列模型使用 doubao 图标
    { pattern: 'grok', avatar: 'grok' },
    { pattern: 'glm', avatar: 'glm' },
    { pattern: 'cogview', avatar: 'glm' },  // cogview 系列模型使用 glm 图标
    { pattern: 'minimax', avatar: 'minimax' },
    { pattern: 'abab', avatar: 'minimax' },  // abab 系列模型使用 minimax 图标
    { pattern: 'moonshot', avatar: 'moonshot' },
    { pattern: 'mistral', avatar: 'mistral' },
    { pattern: 'perplexity', avatar: 'perplexity' },
    { pattern: 'spark', avatar: 'spark' },
    { pattern: 'llama', avatar: 'llama' },
    { pattern: 'gemma', avatar: 'gemma' },
    { pattern: 'yi', avatar: 'yi' },  // 零一万物模型
  ]
  for (const { pattern, avatar } of modelIdToAvatar) {
    if (typeof pattern === 'string' && lower.includes(pattern) && avatarMappings[avatar]) return avatar
  }
  return undefined
}

/**
 * 查找图标组件（优先使用avatar，其次从 modelId 推断 avatar，最后使用 provider）
 * @param avatar 模型avatar值
 * @param provider 服务商ID
 * @param modelId 可选，模型 ID，用于在无 avatar 时推断品牌图标
 * @returns 图标组件，如果未找到返回null
 */
export function getIcon(avatar?: string, provider?: string, modelId?: string): ComponentType<any> | null {
  // 优先使用 avatar
  if (avatar) {
    const iconByAvatar = getIconByAvatar(avatar)
    if (iconByAvatar) return iconByAvatar
  }

  // 无 avatar 时根据 modelId 推断
  if (modelId) {
    const inferredAvatar = getAvatarFromModelId(modelId)
    if (inferredAvatar) {
      const iconByAvatar = getIconByAvatar(inferredAvatar)
      if (iconByAvatar) return iconByAvatar
    }
  }

  // 最后使用 provider
  if (provider) {
    const iconByProvider = getIconByProvider(provider)
    if (iconByProvider) return iconByProvider
  }

  return null
}

/**
 * 检查是否支持指定的服务商ID
 * @param providerId 服务商ID
 */
export function isSupportedProvider(providerId: string): boolean {
  return supportedProviders.includes(providerId.toLowerCase())
}

/**
 * 检查是否支持指定的avatar值
 * @param avatar avatar值
 */
export function isSupportedAvatar(avatar: string): boolean {
  return supportedAvatars.includes(avatar.toLowerCase())
}
