/**
 * 统一的Embedding服务
 * 根据provider和model自动选择对应的实现
 */

import { logger } from "@/lib/logger";
import { EmbeddingConfig, EmbeddingInput } from "./types";
import { EmbeddingProvider } from "./types";
import { OpenAIEmbeddingProvider } from "./providers/openai-provider";
import { AliyunTextEmbeddingProvider } from "./providers/aliyun-text-provider";
import { AliyunVisionEmbeddingProvider } from "./providers/aliyun-vision-provider";
import { VolcengineVisionEmbeddingProvider } from "./providers/volcengine-vision-provider";
import { OllamaEmbeddingProvider } from "./providers/ollama-provider";
import { GeminiEmbeddingProvider } from "./providers/gemini-provider";
import { ZAIEmbeddingProvider } from "./providers/zai-provider";
import {
  getEmbeddingModelById,
  isMultimodalModel,
} from "@/lib/data/embedding-models";

/**
 * Provider 实现映射
 * 将 apiType 映射到具体的 Provider 实现类
 */
const PROVIDER_IMPLEMENTATION_MAP: Record<string, new () => EmbeddingProvider> = {
  "openai": OpenAIEmbeddingProvider,
  "aliyun-text": AliyunTextEmbeddingProvider,
  "aliyun-vision": AliyunVisionEmbeddingProvider,
  "volcengine-vision": VolcengineVisionEmbeddingProvider,
  "openrouter": OpenAIEmbeddingProvider,  // OpenRouter 使用 OpenAI 兼容格式
  "ollama": OllamaEmbeddingProvider,
  "gemini": GeminiEmbeddingProvider,
  "zai": ZAIEmbeddingProvider,  // Zai 使用专门的 provider
};

/**
 * 获取embedding provider实例
 */
function getProvider(providerType: string): EmbeddingProvider {
  const ProviderClass = PROVIDER_IMPLEMENTATION_MAP[providerType];

  if (ProviderClass) {
    return new ProviderClass();
  }

  // 默认使用OpenAI格式（兼容其他provider）
  logger.warn("Unknown provider type, using OpenAI format", { providerType });
  return new OpenAIEmbeddingProvider();
}

/**
 * Embedding服务类
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;
  private config: EmbeddingConfig;
  private isMultimodal: boolean;

  constructor(config: EmbeddingConfig) {
    this.config = config;
    // 注意：这里使用同步方式初始化，因为构造函数不能是异步的
    // 实际的 provider 类型判断会在第一次调用时完成
    const { provider: providerType, isMultimodal } = this.getProviderTypeSync(config.model, config.provider);
    this.isMultimodal = isMultimodal;
    this.provider = getProvider(providerType);
  }

  /**
   * 同步获取 provider 类型（用于构造函数）
   * 优先使用硬编码映射，避免异步操作
   */
  private getProviderTypeSync(modelId: string, configProvider: string): { provider: string; isMultimodal: boolean } {
    // 检查是否是多模态模型
    const isMultimodal = isMultimodalModel(modelId);
    const providerLower = configProvider.toLowerCase();

    if (providerLower === "openai") {
      return { provider: "openai", isMultimodal: false };
    }

    if (providerLower === "aliyun" || providerLower === "dashscope") {
      return {
        provider: isMultimodal ? "aliyun-vision" : "aliyun-text",
        isMultimodal
      };
    }

    if (providerLower === "volcengine" || providerLower === "doubao") {
      return { provider: "volcengine-vision", isMultimodal: true };
    }

    if (providerLower === "ollama") {
      return { provider: "ollama", isMultimodal: false };
    }

    if (providerLower === "openrouter") {
      return { provider: "openrouter", isMultimodal: false };
    }

    if (providerLower === "zai") {
      return { provider: "zai", isMultimodal: false };
    }

    if (providerLower === "gemini") {
      return { provider: "gemini", isMultimodal: false };
    }

    return { provider: "openai", isMultimodal: false };
  }

  /**
   * 获取单个文本的embedding
   */
  async getEmbedding(text: string): Promise<number[]> {
    return this.provider.getEmbedding(text, this.config);
  }

  /**
   * 批量获取文本embeddings
   */
  async getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    return this.provider.getEmbeddingsBatch(texts, this.config);
  }

  /**
   * 获取多模态embedding
   */
  async getMultimodalEmbedding(input: EmbeddingInput): Promise<number[]> {
    if (!this.provider.getMultimodalEmbedding) {
      throw new Error(`Provider ${this.config.provider} does not support multimodal embedding`);
    }
    return this.provider.getMultimodalEmbedding(input, this.config);
  }

  /**
   * 批量获取多模态embeddings
   */
  async getMultimodalEmbeddingsBatch(inputs: EmbeddingInput[]): Promise<number[][]> {
    if (!this.provider.getMultimodalEmbeddingsBatch) {
      throw new Error(`Provider ${this.config.provider} does not support multimodal embedding`);
    }
    return this.provider.getMultimodalEmbeddingsBatch(inputs, this.config);
  }

  /**
   * 检查是否支持多模态
   */
  supportsMultimodal(): boolean {
    return this.isMultimodal && !!this.provider.getMultimodalEmbedding;
  }
}

/**
 * 创建Embedding服务实例
 */
export function createEmbeddingService(config: EmbeddingConfig): EmbeddingService {
  return new EmbeddingService(config);
}

/**
 * 获取模型配置（异步）
 * 用于需要获取完整模型信息的场景
 */
export async function getEmbeddingModelConfig(modelId: string) {
  return getEmbeddingModelById(modelId);
}
