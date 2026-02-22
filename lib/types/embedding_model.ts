/**
 * Embedding 模型类型定义
 * 与 Chat 模型的 ModelConfig 保持一致的结构
 */

export type EmbeddingModality = 'text' | 'image' | 'video';

export type EmbeddingApiType =
  | 'openai:embeddings'
  | 'aliyun:text-embeddings'
  | 'aliyun:multimodal-embeddings'
  | 'volcengine:multimodal-embeddings'
  | 'zai:embeddings'
  | 'gemini:embeddings'
  | 'openrouter:embeddings'
  | 'ollama:embeddings';

export type Currency = 'USD' | 'CNY';
export type PricingUnit = '1M_tokens' | '1K_tokens' | 'per_image' | 'per_minute';

export interface PricingTier {
  rate: number;
  condition?: Record<string, [number, number | 'infinity']> | string;
}

export interface PricingItem {
  type: 'text' | 'image' | 'video';
  name: 'input' | 'output';
  unit: PricingUnit;
  tiers: PricingTier[];
}

/**
 * 向量维度配置
 */
export interface VectorDimensions {
  /**
   * 支持的所有维度
   */
  dimensions: number[];
  /**
   * 默认维度
   */
  default: number;
}

/**
 * Embedding 模型配置
 */
export interface EmbeddingModelConfig {
  id: string;
  displayName: string;
  avatar?: string;
  provider: string;
  releasedAt?: string;

  /**
   * API 类型，格式: provider:api-name
   * 用于路由到正确的适配器实现
   */
  apiType: EmbeddingApiType;

  /**
   * 模型类型
   * - text: 纯文本 embedding
   * - multimodal: 多模态 embedding（支持图片、视频）
   */
  modelType: 'text' | 'multimodal';

  /**
   * 向量维度配置
   * 支持多个可选维度，可指定默认值
   */
  vectorDimensions: VectorDimensions;

  /**
   * 支持的模态类型
   */
  modalities: {
    input: EmbeddingModality[];
  };

  /**
   * 计费信息
   */
  pricing?: {
    currency: Currency;
    items: PricingItem[];
  };

  /**
   * 默认 Base URL
   */
  baseURL?: string;

  /**
   * 最大输入长度（tokens）
   */
  maxInputTokens?: number;

  /**
   * 批量处理的最大数量
   */
  maxBatchSize?: number;
}

/**
 * Embedding Provider 配置
 */
export interface EmbeddingProviderConfig {
  id: string;
  name: string;
  avatar: string;
  description?: string;
}
