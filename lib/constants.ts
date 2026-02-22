/**
 * 应用常量定义
 * 统一管理模型名称、角色名称、提供商ID等魔法字符串
 */

/**
 * 消息角色
 */
export const MESSAGE_ROLES = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  DATA: "data",
} as const;

export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];

/**
 * 消息状态
 */
export const MESSAGE_STATUS = {
  PENDING: "pending",
  STREAMING: "streaming",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type MessageStatus = typeof MESSAGE_STATUS[keyof typeof MESSAGE_STATUS];

/**
 * 常用模型名称
 */
export const MODELS = {
  GPT_3_5_TURBO: "gpt-3.5-turbo",
  GPT_4O: "gpt-4o",
  GPT_4O_MINI: "gpt-4o-mini",
  GPT_4_TURBO: "gpt-4-turbo",
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",
} as const;

/**
 * 模型特征标识（用于判断模型是否支持某些功能）
 */
export const MODEL_FEATURES = {
  REASONING: ["reasoner", "o1", "thinking"],
} as const;

/**
 * 文件状态
 */
export const FILE_STATUS = {
  PROCESSING: "processing",
  COMPLETED: "completed",
  ERROR: "error",
} as const;

export type FileStatus = typeof FILE_STATUS[keyof typeof FILE_STATUS];

/**
 * 用户角色
 */
export const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

/**
 * 文件上传相关常量
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_SIZE_MB: 20,
  ALLOWED_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-zip-compressed",
    "application/octet-stream",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/webm",
    "audio/ogg",
  ] as const,
  ALLOWED_EXTENSIONS: [
    '.txt', '.md', '.js', '.ts', '.py', '.pdf', '.doc', '.docx', 
    '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', 
    '.jpg', '.jpeg', '.png', '.gif', '.webp', 
    '.wav', '.mp3', '.webm', '.ogg'
  ] as const,
} as const;

/**
 * UI 相关常量
 */
export const UI = {
  DEFAULT_INPUT_HEIGHT: 120, // 默认输入框高度 (px)
  INPUT_PADDING_BOTTOM: 32, // 输入框底部 padding (px)
  TOOLBAR_HEIGHT: 56, // 工具栏高度 (px)
  OBJECT_URL_CLEANUP_INTERVAL: 30000, // Object URL 清理间隔 (ms)
} as const;

/**
 * MCP 工具相关常量
 */
export const MCP = {
  MAX_TOOL_RESULT_SIZE: 1024 * 1024, // 1MB
  TOOL_TIMEOUT: 30000, // 30秒
} as const;

/**
 * 临时聊天相关常量
 */
export const TEMP_CHAT = {
  STORAGE_KEY: "rille-temp-chat",
} as const;

/**
 * 支持的 Web 搜索提供商
 */
export const SUPPORTED_WEB_SEARCH_PROVIDERS = [
  "tavily", "bing", "google", "anspire", "bocha", "brave",
  "exa", "firecrawl", "jina", "kagi", "search1api",
  "searxng", "perplexity", "serpapi"
] as const;

/**
 * 向量维度常量
 */
export const VECTOR_DIMENSIONS = {
  // 当前数据库列支持的向量维度（默认 1024 维）
  TARGET: 1024,
  // 常见的向量模型维度
  TEXT_EMBEDDING_V3: 1024,
  TEXT_EMBEDDING_V4: 1024,
  TEXT_EMBEDDING_3_SMALL: 1536,
  TEXT_EMBEDDING_3_LARGE: 3072,
  QWEN2_5_VL_EMBEDDING: 1024,
} as const;

/**
 * 文件处理相关常量
 */
export const FILE_PROCESSING = {
  // Embedding 处理的最大文件大小（10MB）
  EMBEDDING_MAX_SIZE: 10 * 1024 * 1024,
  EMBEDDING_MAX_SIZE_MB: 10,
  // 文件名最大长度（Linux 通常限制 255 字节，我们限制为 200 字节以留出安全余量）
  MAX_FILENAME_LENGTH: 200,
  // 文本分块参数
  TEXT_CHUNK_SIZE: 500, // tokens
  TEXT_CHUNK_OVERLAP: 50, // tokens
} as const;

/**
 * 模型定价配置（每百万tokens的价格，单位：美元）
 * 支持通配符匹配，如 "gpt-4o*" 会匹配所有以 "gpt-4o" 开头的模型
 * 
 * 注意：现在价格信息优先从模型配置文件中读取 (lib/data/models/*.ts)
 * 此配置仅作为后备方案，当模型配置文件中没有价格信息时使用
 */
export interface ModelPricing {
  model: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  enabled: boolean;
}

export const MODEL_PRICING: ModelPricing[] = [
  // 后备定价配置，当模型配置文件中没有定义价格时使用
  // OpenAI 模型
  { model: 'gpt-3.5-turbo*', inputPricePerMillion: 0.50, outputPricePerMillion: 1.50, enabled: true },
  { model: 'gpt-4o*', inputPricePerMillion: 5.00, outputPricePerMillion: 15.00, enabled: true },
  { model: 'gpt-4o-mini*', inputPricePerMillion: 0.15, outputPricePerMillion: 0.60, enabled: true },
  { model: 'gpt-4-turbo*', inputPricePerMillion: 10.00, outputPricePerMillion: 30.00, enabled: true },
  // DeepSeek 模型
  { model: 'deepseek-chat*', inputPricePerMillion: 0.14, outputPricePerMillion: 0.28, enabled: true },
  { model: 'deepseek-reasoner*', inputPricePerMillion: 0.28, outputPricePerMillion: 1.10, enabled: true },
] as const;
