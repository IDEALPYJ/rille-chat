/**
 * 图像生成适配器工厂 (API类型驱动)
 * 根据模型的apiType创建对应的图像生成适配器
 */

import {
  ImageGenerationAdapter,
  ImageGenerationRequest,
  ImageGenerationError,
} from './types';
import { createOpenAIImageAdapter } from '@/lib/providers/openai';
import { createBailianImageAdapter } from '@/lib/providers/bailian';
import { ChatCompletionsImageAdapter } from '@/lib/providers/shared/chat-completions-image-adapter';
import { createVolcengineImageAdapter } from '@/lib/providers/volcengine';
import { createZaiImageAdapter } from '@/lib/providers/zai';
import { logger } from '@/lib/logger';
import { getModelById } from '@/lib/data/models';

/**
 * 适配器工厂配置
 */
export interface AdapterFactoryConfig {
  /** Provider ID */
  providerId: string;
  /** API Key */
  apiKey: string;
  /** Base URL (可选) */
  baseURL?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
}

/**
 * 根据apiType获取图像生成适配器
 * @param apiType API类型
 * @param config 适配器配置
 * @returns 图像生成适配器实例
 */
export function getImageGenerationAdapterByApiType(
  apiType: string,
  config: AdapterFactoryConfig
): ImageGenerationAdapter {
  const { apiKey, baseURL, timeout } = config;

  logger.debug('Creating image generation adapter by apiType', { apiType });

  switch (apiType) {
    // OpenAI原生Image API
    case 'openai:image-generations':
      return createOpenAIImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    // 使用Chat Completions API进行图像生成
    case 'openai:chat-completions':
      return new ChatCompletionsImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    // 阿里云万相图像生成
    case 'aliyun:wanx-generation':
      return createBailianImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    // Google Gemini图像生成
    case 'google:gemini-generate':
      // Gemini图像生成也使用Chat Completions兼容方式
      return new ChatCompletionsImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    // Volcengine 图像生成
    case 'volcengine:image-generations':
      return createVolcengineImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    // ZAI (智谱AI) 图像生成
    case 'zai:image-generations':
      return createZaiImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });

    default:
      logger.warn(`Unknown apiType ${apiType}, falling back to OpenAI adapter`);
      return createOpenAIImageAdapter({
        apiKey,
        baseURL,
        timeout,
      });
  }
}

/**
 * 获取图像生成适配器
 * 根据模型ID查找对应的apiType，然后创建适配器
 * @param modelId 模型ID
 * @param config 适配器工厂配置
 * @returns 图像生成适配器实例
 */
export async function getImageGenerationAdapter(
  modelId: string,
  config: AdapterFactoryConfig
): Promise<ImageGenerationAdapter> {
  const model = await getModelById(modelId);
  
  if (!model) {
    logger.warn(`Model ${modelId} not found, falling back to OpenAI adapter`);
    return createOpenAIImageAdapter({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout,
    });
  }

  if (!model.apiType) {
    logger.warn(`Model ${modelId} has no apiType, falling back to OpenAI adapter`);
    return createOpenAIImageAdapter({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout,
    });
  }

  return getImageGenerationAdapterByApiType(model.apiType, config);
}

/**
 * 检查模型是否支持图像生成
 * @param modelId 模型ID
 * @returns 是否支持
 */
export async function isImageGenerationSupported(modelId: string): Promise<boolean> {
  const model = await getModelById(modelId);

  if (!model) {
    return false;
  }

  // 检查modelType是否为image
  if (model.modelType === 'image') {
    return true;
  }

  // 或者检查features是否包含image_generation
  if (model.features?.includes('image_generation')) {
    return true;
  }

  // 检查modalities.output是否包含image
  if (model.modalities?.output?.includes('image')) {
    return true;
  }

  return false;
}

/**
 * 图像生成服务
 * 封装适配器创建和调用逻辑
 */
export class ImageGenerationService {
  private adapter: ImageGenerationAdapter | null = null;
  private config: AdapterFactoryConfig;
  private modelId: string;
  private initialized: boolean = false;

  constructor(modelId: string, config: AdapterFactoryConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  /**
   * 初始化适配器
   */
  async init(): Promise<void> {
    if (!this.initialized) {
      this.adapter = await getImageGenerationAdapter(this.modelId, this.config);
      this.initialized = true;
    }
  }

  /**
   * 生成图像
   * @param request 图像生成请求
   * @returns 生成的图片 URL 列表
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    if (!this.adapter) {
      throw new ImageGenerationError(
        'Adapter not initialized',
        'ADAPTER_NOT_INITIALIZED',
        500,
        this.config.providerId
      );
    }

    try {
      // 添加模型信息到请求
      const enrichedRequest = {
        ...request,
        model: this.modelId,
        provider: this.config.providerId,
      };

      return await this.adapter.generate(enrichedRequest);
    } catch (error) {
      logger.error('Image generation service error', {
        error: error instanceof Error ? error.message : String(error),
        provider: this.config.providerId,
        model: this.modelId,
      });
      throw error;
    }
  }

  /**
   * 编辑图像
   * @param request 图像编辑请求
   * @returns 编辑后的图片 URL 列表
   */
  async edit(request: ImageGenerationRequest & { referenceImages: string[] }): Promise<string[]> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    if (!this.adapter) {
      throw new ImageGenerationError(
        'Adapter not initialized',
        'ADAPTER_NOT_INITIALIZED',
        500,
        this.config.providerId
      );
    }

    try {
      if (!this.adapter.edit) {
        throw new ImageGenerationError(
          `Model ${this.modelId} does not support image editing`,
          'EDIT_NOT_SUPPORTED',
          400,
          this.config.providerId
        );
      }

      const enrichedRequest = {
        ...request,
        model: this.modelId,
        provider: this.config.providerId,
      };

      return await this.adapter.edit(enrichedRequest);
    } catch (error) {
      logger.error('Image edit service error', {
        error: error instanceof Error ? error.message : String(error),
        provider: this.config.providerId,
        model: this.modelId,
      });
      throw error;
    }
  }

  /**
   * 生成图像变体
   * @param request 图像生成请求
   * @returns 生成的图片 URL 列表
   */
  async variations(request: ImageGenerationRequest): Promise<string[]> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    if (!this.adapter) {
      throw new ImageGenerationError(
        'Adapter not initialized',
        'ADAPTER_NOT_INITIALIZED',
        500,
        this.config.providerId
      );
    }

    try {
      if (!this.adapter.variations) {
        throw new ImageGenerationError(
          `Model ${this.modelId} does not support image variations`,
          'VARIATIONS_NOT_SUPPORTED',
          400,
          this.config.providerId
        );
      }

      const enrichedRequest = {
        ...request,
        model: this.modelId,
        provider: this.config.providerId,
      };

      return await this.adapter.variations(enrichedRequest);
    } catch (error) {
      logger.error('Image variations service error', {
        error: error instanceof Error ? error.message : String(error),
        provider: this.config.providerId,
        model: this.modelId,
      });
      throw error;
    }
  }
}

/**
 * 创建图像生成服务
 * @param modelId 模型ID
 * @param config 适配器工厂配置
 * @returns ImageGenerationService 实例
 */
export function createImageGenerationService(
  modelId: string,
  config: AdapterFactoryConfig
): ImageGenerationService {
  return new ImageGenerationService(modelId, config);
}

export default ImageGenerationService;
