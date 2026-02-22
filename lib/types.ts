// Re-export specific types from model.ts to avoid conflicts
import {
  ModelConfig as BaseModelConfig,
  ModelParameter as BaseModelParameter,
  PricingItem as BasePricingItem,
  PricingTier as BasePricingTier
} from './types/model';

export type ModelParameter = BaseModelParameter;
export type PricingTier = BasePricingTier;
export type PricingItem = BasePricingItem;

// Extend the BaseModelConfig for backward compatibility if needed, 
// or just re-export it if it covers everything. 
// Based on previous content, it seems we need to keep some legacy fields.
export interface ModelConfig extends BaseModelConfig {
  name?: string;
  enabled: boolean;

  // === 保留：向后兼容旧数据 ===
  contextLength?: number;  // 旧格式，兼容 contextWindow
  description?: string;
  created?: number;
  inputPrice?: number;
  outputPrice?: number;
  architecture?: any;
  top_provider?: any;
  supported_parameters?: string[];
  purpose?: 'chat' | 'image_generation' | 'video_generation';

  // === 向后兼容的特性标记 (推导属性通常在运行时处理，但在类型中保留以便 TS 检查) ===
  deepThinking?: boolean;
  webSearch?: boolean;
  toolCall?: boolean;

  // vectorDimensions & baseURL were present in lib/types.ts but not in lib/types/model.ts
  vectorDimensions?: number;
  baseURL?: string;

  // Overwrite optional fields from BaseModelConfig that might be required here or different
  // (Currently seem compatible)
}

export interface OpenRouterModel {
  id: string;
  canonical_slug: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search: string;
    internal_reasoning: string;
    input_cache_read: string;
    input_cache_write: string;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
  per_request_limits: Record<string, unknown> | null;
  supported_parameters: string[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt?: string | Date;
}

export interface McpToolCallInfo {
  toolCallId: string; // OpenAI tool call id
  pluginId: string;
  pluginName: string;
  pluginIcon: string | null;
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error?: string;
  duration?: number;
  status: 'pending' | 'completed' | 'error';
}

/**
 * 图文混排内容片段
 * 用于图像生成模型的图文混排输出
 */
export interface ContentPart {
  type: 'text' | 'image';
  text?: string;      // type='text' 时使用
  image?: string;     // type='image' 时使用 (图片URL)
}

export interface Message {
  id?: string;
  role: 'system' | 'user' | 'assistant' | 'data';
  content: string;
  contentParts?: Array<Record<string, unknown>>; // 结构化消息内容
  reasoning_content?: string;
  search_results?: string;
  retrieval_chunks?: string; // 文档检索结果（JSON格式）
  mcp_tool_calls?: McpToolCallInfo[]; // 兼容性保留
  attachments?: Attachment[];
  // --- 语音消息 ---
  isVoiceInput?: boolean; // 是否为语音输入
  audioUrl?: string; // 原始语音文件 URL
  audioDuration?: number; // 语音时长（秒）
  // --- Tree Structure ---
  parentId?: string | null;
  childrenIds?: string[];
  // --- Metadata ---
  createdAt?: string | Date;
  updatedAt?: string | Date;
  model?: string;
  provider?: string;
  modelAvatar?: string; // 模型头像，从模型配置读取
  status?: 'pending' | 'streaming' | 'completed' | 'error';
  error?: string;
  errorCode?: string;
  // --- Token Usage ---
  input_tokens?: number;
  output_tokens?: number;
  input_cache_tokens?: number;
  output_cache_tokens?: number;
  total_tokens?: number;
  cost?: number;
  // --- Request Parameters (for regeneration) ---
  requestParams?: Record<string, unknown>;
}

export interface Session {
  id: string;
  title: string;
  userId: string;
  projectId?: string | null;
  currentLeafId?: string | null;
  messageCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  messages?: Message[];
  project?: Project;
}

export interface Project {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  memoryIsolated: boolean;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count?: {
    sessions: number;
    files: number;
  };
}

export interface File {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  status: 'processing' | 'completed' | 'error';
  tokens: number;
  userId: string;
  projectId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseURL?: string;
  model?: string;
  models?: ModelConfig[];
  checkModel?: string;
}

export interface VectorProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseURL?: string;
  models?: ModelConfig[];
  checkModel?: string;
}

export interface SearchProviderConfig {
  apiKey?: string;
  baseURL?: string;
  enabled?: boolean;
  searchDepth?: string;
  extractDepth?: string;
  cx?: string;
  defaultNum?: number;
  defaultLanguage?: string;
  defaultCountry?: string;
  safeSearch?: string;
  subscriptionKey?: string;
  endpoint?: string;
  market?: string;
  includeAnswer?: boolean;
  maxResults?: number;
  topK?: number;
  freshness?: string;
  count?: number;
  summary?: boolean;
  country?: string;
  searchType?: string;
  type?: string;
  category?: string;
  numResults?: number;
  mode?: string;
  searchBaseUrl?: string;
  readBaseUrl?: string;
  apiToken?: string;
  engine?: string;
  summaryType?: string;
  language?: string;
  cache?: boolean;
  searchService?: string;
  crawlResults?: number;
  timeRange?: string;
  instanceUrl?: string;
  categories?: string;
  engines?: string;
  outputFormat?: string;
  location?: string;
  noCache?: boolean;
  [key: string]: unknown;
}

export interface SearchConfig {
  activeProvider: string;
  enabled: boolean;
  providers: Record<string, SearchProviderConfig>;
}

// Legacy TavilyConfig for backward compatibility
export interface TavilyConfig {
  enabled: boolean;
  apiKey: string;
  searchDepth?: "basic" | "advanced";
  extractDepth?: "basic" | "advanced";
}

export interface MemoryConfig {
  enabled: boolean;
  notifyOnUpdate: boolean;
  maxContextTokens: number;
  
  /**
   * 记忆提取模型（LLM）- 必需
   * 格式: "provider:model"
   * 用于从对话中提取记忆、分类、判重
   */
  extractionModel: string;
  
  /**
   * Embedding 模型 - 可选
   * 格式: "provider:model"
   * 如果设置，使用向量检索模式
   * 如果未设置，使用关键词检索模式
   */
  embeddingModel?: string;
  
  /**
   * 检索策略
   * - recency: 优先最近记忆
   * - relevance: 优先相关记忆（需要 embedding）
   * - hybrid: 混合评分（语义+时效+重要性）
   */
  strategy: "recency" | "relevance" | "hybrid";
}

export interface ContextLimitConfig {
  enabled: boolean;
  maxMessages: number;
  compress: boolean;
  compressModel: string;
}

export interface VoiceProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  voice?: string; // TTS voice selection
  [key: string]: unknown;
}

export interface VoiceConfig {
  input: {
    mode: "browser" | "ai";
    provider?: string; // STT provider id
    providers?: Record<string, VoiceProviderConfig>;
  };
  output: {
    provider?: string; // TTS provider id
    providers?: Record<string, VoiceProviderConfig>;
  };
}

export interface UserSettings {
  providers?: {
    [key: string]: ProviderConfig;
  };
  vectorProviders?: {
    [key: string]: VectorProviderConfig;
  };
  search?: SearchConfig | {
    // Legacy format for backward compatibility
    tavily?: TavilyConfig;
  };
  theme?: "light" | "dark" | "system";
  zoom?: number;
  fontSize?: number;
  compactMode?: boolean;
  showQuote?: boolean;
  memory?: MemoryConfig;
  autoRename?: boolean;
  autoRenameModel?: string;
  contextLimit?: ContextLimitConfig;
  voice?: VoiceConfig;
  enabledMcpPlugins?: string[]; // 全局启用的MCP插件ID列表
  inputCompletion?: {
    enabled: boolean;
    model: string;
  };
}

/**
 * 推理设置
 */
export type ReasoningSettings = {
  enabled: boolean; // 是否开启深度思考
  effort?: string | number; // 推理强度值（由 REASONING_CONFIG 决定类型）
  effort_mode?: 'adaptive' | 'effort' | 'budget'; // 推理强度设置模式 (用于 Opus 4.5 等多模式模型)
};

export interface AdvancedSettings {
  temperature?: number;
  topP?: number;
  topK?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  seed?: number;
  stopSequences?: string[];
  verbosity?: string;
  context_1m?: string;
  reasoning?: ReasoningSettings;
  // Compaction 上下文压缩参数 (Claude Opus 4.6+)
  compaction?: string;
  compaction_trigger?: number;
  // OpenRouter 等服务商特有的搜索参数
  engine?: string;
  search_strategy?: number;
  max_results?: number;
  // Perplexity 特有参数
  search_type?: 'fast' | 'pro' | 'auto';
  search_mode?: 'web' | 'academic' | 'sec';
  search_context_size?: 'low' | 'medium' | 'high';
  // Zai 智谱AI 特有参数
  search_engine?: string;
}

export interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * 向量检索结果中的 chunk
 */
export interface RetrievalChunk {
  id: string;
  content: string;
  tokenCount: number;
  fileId: string;
  fileName?: string;
  similarity: number;
}
