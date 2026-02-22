/**
 * ZAI (智谱AI) 图像生成适配器
 * 支持 glm-image、cogview-4、cogview-3-flash 模型
 */

import { BatchingImageAdapter } from '@/lib/providers/base/image-adapter-base';
import type {
  ImageGenerationRequest,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';
import { ZaiParameterBuilder } from './parameter-builder';
import { ZaiResponseParser } from './response-parser';
import { ZaiSizeStrategy } from './size-strategy';
import type { ZaiImageGenerationResponse } from './types';
import { ZAI_PROVIDER_INFO } from './types';

export interface ZaiAdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * ZAI 图像生成适配器
 */
export class ZaiImageAdapter extends BatchingImageAdapter {
  protected requestBuilder = new ZaiParameterBuilder();
  protected responseParser = new ZaiResponseParser();
  protected sizeStrategy: ZaiSizeStrategy;
  protected providerId = ZAI_PROVIDER_INFO.id;

  private zaiConfig: ZaiAdapterConfig;

  constructor(config: ZaiAdapterConfig) {
    super(config);
    this.zaiConfig = config;
    // 延迟初始化 sizeStrategy，需要 model 信息
    this.sizeStrategy = new ZaiSizeStrategy('');
  }

  /**
   * 生成图像
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    try {
      // 更新 sizeStrategy 的 model
      this.sizeStrategy = new ZaiSizeStrategy(request.model);

      // 调用父类的批量处理逻辑
      return await super.generate(request);
    } catch (error) {
      this.logError('generate', error, request);
      throw this.createError(error, 'generate');
    }
  }

  /**
   * 批量生成图像（单次 API 调用）
   * 由父类 BatchingImageAdapter 调用
   */
  protected async generateBatch(request: ImageGenerationRequest): Promise<string[]> {
    // 验证参数
    this.requestBuilder.validate(request);

    // 构建请求体
    const body = this.requestBuilder.build(request);
    const url = this.buildUrl();

    logger.debug('ZAI API request', {
      url,
      model: body.model,
      prompt: body.prompt.substring(0, 50),
      size: body.size,
      quality: body.quality,
    });

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout || 60000); // 默认 60 秒超时

    try {
      // 发送请求
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.zaiConfig.apiKey}`,
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

      const data: ZaiImageGenerationResponse = await response.json();

      // 解析响应
      const images = this.responseParser.parse(data);

      if (images.length === 0) {
        logger.warn('ZAI response contains no images', { data });
      }

      return images;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: ZAI API call took too long');
      }
      throw error;
    }
  }

  /**
   * 获取支持的原生批量大小
   * ZAI 目前不支持原生批量生成
   */
  protected getNativeBatchSize(): number {
    return 1;
  }

  /**
   * 构建 API URL
   */
  protected buildUrl(): string {
    return `${this.getBaseURL()}/paas/v4/images/generations`;
  }

  /**
   * 获取默认 baseURL
   */
  protected getDefaultBaseURL(): string {
    return ZAI_PROVIDER_INFO.defaultBaseURL;
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
        'ZAI_API_ERROR',
        500,
        this.providerId
      );
    }

    return new ImageGenerationError(
      'Unknown ZAI error',
      'ZAI_UNKNOWN_ERROR',
      500,
      this.providerId
    );
  }
}

/**
 * 创建 ZAI 图像适配器
 */
export function createZaiImageAdapter(config: ZaiAdapterConfig): ZaiImageAdapter {
  return new ZaiImageAdapter(config);
}
