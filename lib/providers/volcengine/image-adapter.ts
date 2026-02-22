/**
 * Volcengine (火山引擎) 图像生成适配器
 * 支持 Seedream 系列模型
 */

import { BatchingImageAdapter } from '@/lib/providers/base/image-adapter-base';
import type {
  ImageGenerationRequest,
  ImageEditRequest,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';
import { VolcengineParameterBuilder } from './parameter-builder';
import { VolcengineResponseParser } from './response-parser';
import { VolcengineSizeStrategy } from './size-strategy';
import type { VolcengineImageGenerationResponse } from './types';
import { VOLCENGINE_PROVIDER_INFO } from './types';

export interface VolcengineAdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * Volcengine 图像生成适配器
 */
export class VolcengineImageAdapter extends BatchingImageAdapter {
  protected requestBuilder = new VolcengineParameterBuilder();
  protected responseParser = new VolcengineResponseParser();
  protected sizeStrategy: VolcengineSizeStrategy;
  protected providerId = VOLCENGINE_PROVIDER_INFO.id;

  private volcengineConfig: VolcengineAdapterConfig;

  constructor(config: VolcengineAdapterConfig) {
    super(config);
    this.volcengineConfig = config;
    this.sizeStrategy = new VolcengineSizeStrategy();
  }

  /**
   * 生成图像
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    try {
      return await super.generate(request);
    } catch (error) {
      this.logError('generate', error, request);
      throw this.createError(error, 'generate');
    }
  }

  /**
   * 批量生成图像（单次 API 调用）
   */
  protected async generateBatch(
    request: ImageGenerationRequest
  ): Promise<string[]> {
    this.requestBuilder.validate(request);

    const body = this.requestBuilder.build(request);
    const url = this.buildUrl();

    logger.debug('Volcengine API request', {
      url,
      model: body.model,
      prompt: body.prompt.substring(0, 50),
      n: body.n,
      size: body.size,
    });

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout || 60000); // 默认 60 秒超时

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.volcengineConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: VolcengineImageGenerationResponse = await response.json();

      // 解析响应
      const images = this.responseParser.parse(data);

      if (images.length === 0) {
        logger.warn('Volcengine response contains no images', { data });
      }

      logger.info('Volcengine image generation completed', {
        model: body.model,
        requestedCount: body.n,
        actualCount: images.length,
      });

      return images;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Volcengine API call took too long');
      }
      throw error;
    }
  }

  /**
   * 编辑图像（图生图）
   */
  async edit(request: ImageEditRequest): Promise<string[]> {
    try {
      this.logRequest('edit', request);

      if (!request.referenceImages || request.referenceImages.length === 0) {
        throw new Error('Edit request requires at least one reference image');
      }

      const images = await this.generate(request);

      this.logResponse('edit', images.length);
      return images;
    } catch (error) {
      this.logError('edit', error, request);
      throw this.createError(error, 'edit');
    }
  }

  /**
   * 获取支持的原生批量大小
   */
  protected getNativeBatchSize(): number {
    // Volcengine 支持通过 n 参数批量生成
    return 10;
  }

  /**
   * 构建 API URL
   */
  protected buildUrl(): string {
    return `${this.getBaseURL()}/images/generations`;
  }

  /**
   * 获取默认 baseURL
   */
  protected getDefaultBaseURL(): string {
    return VOLCENGINE_PROVIDER_INFO.defaultBaseURL;
  }

  /**
   * 创建错误对象
   */
  protected createError(error: unknown, _operation: string): Error {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationError } = require('@/lib/image/types');

    if (error instanceof Error) {
      return new ImageGenerationError(
        error.message,
        'VOLCENGINE_API_ERROR',
        500,
        this.providerId
      );
    }

    return new ImageGenerationError(
      'Unknown Volcengine error',
      'VOLCENGINE_UNKNOWN_ERROR',
      500,
      this.providerId
    );
  }
}

/**
 * 创建 Volcengine 图像适配器
 */
export function createVolcengineImageAdapter(
  config: VolcengineAdapterConfig
): VolcengineImageAdapter {
  return new VolcengineImageAdapter(config);
}
