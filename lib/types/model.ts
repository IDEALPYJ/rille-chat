// 模态类型
export type Modality = 'text' | 'image' | 'video' | 'audio';
// 货币类型
export type Currency = 'USD' | 'CNY';
// 计费单位类型
export type PricingUnit = '1M_tokens' | '1K_tokens' | 'per_image' | 'per_minute' | '1K_web_search';

// 参数类型
export type ParameterType = 'select' | 'number' | 'boolean';

export interface ModelParameter {
  id: string;
  type: ParameterType;

  options?: string[];

  min?: number;
  max?: number;
  step?: number;

  default: string | number | boolean;

  visibleWhen?: Record<string, string | number | boolean | string[]>;

  /**
   * API 字段映射路径
   * 示例: "temperature", "reasoning.effort", "metadata.verbosity"
   */
  mapping?: string;

  /**
   * 指令映射表 (针对非原生 API 参数)
   * 示例: { "low": "Keep it concise.", "high": "Be verbose." }
   */
  instruction_map?: Record<string, string>;

  /** 是否禁用 */
  disabled?: boolean;

  /** 禁用原因 */
  disabledReason?: string;
}

// 计费阶梯
export interface PricingTier {
  rate: number;
  condition?: Record<string, [number, number | 'infinity']> | string;
}

// 计费项定义
export interface PricingItem {
  type: 'text' | 'thinking' | 'image' | 'audio' | 'tools';
  name: 'input' | 'output' | 'cacheRead' | 'cacheWrite' | 'web_search';
  unit: PricingUnit;
  tiers: PricingTier[];
}

export interface ReasoningConfig {
  readonly?: boolean;
  defaultEnabled: boolean;

  intensity?: {
    // 支持的模式列表
    supportedModes: string[];

    // 当支持 adaptive 模式时的配置 (Claude Opus 4.6+)
    adaptive?: {
      options: string[] | Array<{ value: string; label: string }>;
      default: string;
      mapping?: string; // API 字段映射路径
      baseParams?: Record<string, any>; // 开启该功能所需的基础参数
    };

    // 当支持 effort 模式时的配置
    effort?: {
      options: string[] | Array<{ value: string; label: string }>;
      default: string;
      mapping?: string; // API 字段映射路径
      baseParams?: Record<string, any>; // 开启该功能所需的基础参数
    };

    // 当支持 budget 模式时的配置
    budget?: {
      min: number;
      max: number;
      step?: number;
      default: number;
      mapping?: string; // API 字段映射路径
      baseParams?: Record<string, any>; // 开启该功能所需的基础参数
    };
  };
}

// 支持的API类型
export type ApiType =
  // OpenAI API系列
  | 'openai:chat-completions'
  | 'openai:responses'
  | 'openai:image-generations'
  // Anthropic API
  | 'anthropic:messages'
  // Google API
  | 'google:gemini-generate'
  // 阿里云API
  | 'aliyun:qwen-chat'
  | 'aliyun:wanx-generation'
  // Volcengine API
  | 'volcengine:image-generations'
  // Zai API
  | 'zai:image-generations'
  // Ollama API
  | 'ollama:embeddings';

// 模型配置定义
export interface ModelConfig {
  id: string;
  displayName: string;
  avatar?: string;
  releasedAt?: string;
  knowledgeCutoff?: string;
  modelType: 'chat' | 'research' | 'image';

  /**
   * API类型，格式: creator:api-name
   * 用于路由到正确的适配器实现
   * 例如: openai:chat-completions, anthropic:messages
   */
  apiType: ApiType;

  // 规格
  contextWindow?: number;
  maxOutput?: number;

  // 计费
  pricing?: {
    currency: Currency;
    items: PricingItem[];
  };

  // 模态类型
  modalities: {
    input: Modality[];
    output: Modality[];
  };

  // 模型能力
  features: string[];

  // 内置工具
  builtinTools?: string[];

  // 推理配置
  reasoning?: ReasoningConfig;

  // 可调节参数
  parameters?: ModelParameter[];
}