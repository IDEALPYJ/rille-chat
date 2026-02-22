import { ModelConfig } from "@/lib/types"

// 第一类协议：apiKey + baseURL
type ApiKeyProviderConfig = {
  protocol: 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'zai' | 'bailian'
  name?: string
  apiKey: string
  baseURL?: string
  enabled: boolean
  models: ModelConfig[]
  checkModel?: string
}

// 第二类协议：ollama
type OllamaProviderConfig = {
  protocol: 'ollama'
  name?: string
  baseURL: string
  enabled: boolean
  models: ModelConfig[]
  checkModel?: string
}

export type ProviderConfig = 
  | ApiKeyProviderConfig
  | OllamaProviderConfig

// 类型守卫函数
export function isApiKeyConfig(config: ProviderConfig): config is ApiKeyProviderConfig {
  return config.protocol === 'openai' ||
         config.protocol === 'anthropic' ||
         config.protocol === 'gemini' ||
         config.protocol === 'perplexity' ||
         config.protocol === 'zai' ||
         config.protocol === 'bailian'
}

export function isOllamaConfig(config: ProviderConfig): config is OllamaProviderConfig {
  return config.protocol === 'ollama'
}

/**
 * 根据providerId和协议类型创建默认的ProviderConfig
 */
export function createDefaultProviderConfig(
  providerId: string,
  protocol: 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'ollama' | 'bailian' | 'zai',
  defaultBaseURL?: string,
  defaultCheckModel?: string
): ProviderConfig {
  const baseConfig = {
    enabled: false,
    models: [],
    checkModel: defaultCheckModel,
  };

  switch (protocol) {
    case 'openai':
    case 'anthropic':
    case 'gemini':
    case 'perplexity':
    case 'bailian':
    case 'zai':
      return {
        protocol,
        apiKey: '',
        baseURL: defaultBaseURL,
        ...baseConfig,
      } as ProviderConfig;
    case 'ollama':
      return {
        protocol: 'ollama',
        baseURL: defaultBaseURL || 'http://localhost:11434/v1',
        ...baseConfig,
      } as ProviderConfig;
  }
}

export type SearchProviderConfig = {
  apiKey?: string
  baseURL?: string
  enabled?: boolean
  searchDepth?: string
  extractDepth?: string
  cx?: string
  defaultNum?: number
  defaultLanguage?: string
  defaultCountry?: string
  safeSearch?: string
  subscriptionKey?: string
  endpoint?: string
  market?: string
  includeAnswer?: boolean
  maxResults?: number
  topK?: number
  freshness?: string
  count?: number
  summary?: boolean
  country?: string
  searchType?: string
  type?: string
  category?: string
  numResults?: number
  mode?: string
  searchBaseUrl?: string
  readBaseUrl?: string
  apiToken?: string
  engine?: string
  summaryType?: string
  language?: string
  cache?: boolean
  searchService?: string
  crawlResults?: number
  timeRange?: string
  instanceUrl?: string
  categories?: string
  engines?: string
  outputFormat?: string
  location?: string
  noCache?: boolean
  [key: string]: unknown
}

export type SearchConfig = {
  activeProvider: string
  enabled: boolean
  providers: Record<string, SearchProviderConfig>
}

export type VoiceProviderConfig = {
  apiKey?: string
  baseURL?: string
  model?: string
  voice?: string // TTS voice selection
  [key: string]: unknown
}

export type VoiceConfig = {
  input: {
    mode: "browser" | "ai"
    provider?: string // STT provider id
    providers?: Record<string, VoiceProviderConfig>
  }
  output: {
    provider?: string // TTS provider id
    providers?: Record<string, VoiceProviderConfig>
  }
}

export type VectorProviderConfig = {
  apiKey: string
  enabled: boolean
  models: ModelConfig[]
  checkModel?: string
}

export type SettingsState = {
  providers: Record<string, ProviderConfig>
  vectorProviders?: Record<string, VectorProviderConfig>
  search: SearchConfig
  theme: "light" | "dark" | "system"
  language: "zh" | "en"
  zoom: number
  fontSize: number
  compactMode: boolean
  showQuote: boolean
  autoRename: boolean
  autoRenameModel: string
  contextLimit: {
    enabled: boolean
    maxMessages: number
    compress: boolean
    compressModel: string
  }
  memory: {
    enabled: boolean
    notifyOnUpdate: boolean
    maxContextTokens: number
    
    /**
     * 记忆提取模型（LLM）- 必需
     * 格式: "provider:model"
     * 用于从对话中提取记忆、分类、判重
     */
    extractionModel: string
    
    /**
     * Embedding 模型 - 可选
     * 格式: "provider:model"
     * 如果设置，使用向量检索模式
     * 如果未设置，使用关键词检索模式
     */
    embeddingModel?: string
    
    /**
     * 检索策略
     * - recency: 优先最近记忆
     * - relevance: 优先相关记忆（需要 embedding）
     * - hybrid: 混合评分（语义+时效+重要性）
     */
    strategy: "recency" | "relevance" | "hybrid"
  }
  inputCompletion: {
    enabled: boolean
    model: string
  }
  sendShortcut?: "enter" | "ctrl-enter"
  voice: VoiceConfig
  // 默认模型设置
  defaultChatModel?: string
  defaultImageModel?: string
  defaultVectorModel?: string
}
