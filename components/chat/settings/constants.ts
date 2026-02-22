import { ModelConfig } from "@/lib/types"
import { ProviderConfig } from "./types"
import { getProtocolForProvider, getDefaultBaseURLForProvider } from "@/lib/chat/protocol-config"
import { modelProviders } from "@/lib/data/model-providers/model-providers"

// 从 model-providers.ts 动态生成服务商列表
export const INITIAL_PROVIDERS = modelProviders.map(p => ({
  id: p.id,
  name: p.id,
  icon: p.avatar
}))

/**
 * @deprecated 该配置已完全废弃，现在使用 loadModelConfigsForProvider() 从 lib/data/models 动态加载
 * 保留空对象仅为避免破坏现有代码
 */
export const DEFAULT_PROVIDER_MODELS: Record<string, ModelConfig[]> = {
}

/**
 * 默认checkModel映射（仅保留有模型配置文件的服务商）
 * 用于连接测试时选择默认模型
 */
const DEFAULT_CHECK_MODELS: Record<string, string> = {
  anthropic: "",
  bailian: "",
  deepseek: "",
  google: "",
  minimax: "MiniMax-M2.1",
  mistral: "mistral-small-latest",
  moonshot: "kimi-k2-turbo-preview",
  openai: "",
  openrouter: "",
  perplexity: "",
  siliconflow: "",
  volcengine: "",
  xai: "",
  zai: "",
}

/**
 * 创建初始的providers配置
 */
export function createInitialProviders(): Record<string, ProviderConfig> {
  const providers: Record<string, ProviderConfig> = {}
  
  for (const provider of INITIAL_PROVIDERS) {
    const protocol = getProtocolForProvider(provider.id)
    const defaultBaseURL = getDefaultBaseURLForProvider(provider.id)
    const defaultCheckModel = DEFAULT_CHECK_MODELS[provider.id] || ""
    
    const baseConfig = {
      enabled: false,
      models: [],
      checkModel: defaultCheckModel || undefined,
    }
    
    switch (protocol) {
      case 'openai':
      case 'anthropic':
      case 'gemini':
      case 'perplexity':
      case 'bailian':
      case 'zai':
        providers[provider.id] = {
          protocol,
          apiKey: '',
          baseURL: defaultBaseURL || undefined,
          ...baseConfig,
        }
        break
      case 'ollama':
        providers[provider.id] = {
          protocol: 'ollama',
          baseURL: defaultBaseURL || 'http://localhost:11434/v1',
          ...baseConfig,
        }
        break
    }
  }
  
  return providers
}

export const CONTEXT_LENGTH_PRESETS = [
  4096,      // 4K
  8192,      // 8K
  16384,     // 16K
  32768,     // 32K
  65536,     // 64K
  131072,    // 128K
  200000,    // 200K
  262144,    // 256K
  1048576,   // 1M
  2097152    // 2M
]
