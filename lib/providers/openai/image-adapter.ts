/**
 * OpenAI 图像生成适配器
 * 支持 dall-e-2、dall-e-3、gpt-image 系列模型
 */

import { BatchingImageAdapter } from '@/lib/providers/base/image-adapter-base';
import type {
  ImageGenerationRequest,
  ImageEditRequest,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';
import { OpenAIParameterBuilder } from './parameter-builder';
import { OpenAIResponseParser } from './response-parser';
import { OpenAISizeStrategy } from './size-strategy';
import { OpenAIImageProcessor } from './image-processor';
import type { OpenAIImageGenerationResponse } from './types';
import { OPENAI_PROVIDER_INFO } from './types';

export interface OpenAIAdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * OpenAI 图像生成适配器
 */
export class OpenAIImageAdapter extends BatchingImageAdapter {
  protected requestBuilder = new OpenAIParameterBuilder();
  protected responseParser = new OpenAIResponseParser();
  protected sizeStrategy: OpenAISizeStrategy;
  protected providerId = OPENAI_PROVIDER_INFO.id;

  private openaiConfig: OpenAIAdapterConfig;
  private imageProcessor = new OpenAIImageProcessor();

  constructor(config: OpenAIAdapterConfig) {
    super(config);
    this.openaiConfig = config;
    this.sizeStrategy = new OpenAISizeStrategy('');
  }

  /**
   * 生成图像
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    try {
      this.sizeStrategy = new OpenAISizeStrategy(request.model);
      return await super.generate(request);
    } catch (error) {
      this.logError('generate', error, request);
      throw this.createError(error, 'generate');
    }
  }

  /**
   * 批量生成图像（单次 API 调用）
   */
  protected async generateBatch(request: ImageGenerationRequest): Promise<string[]> {
    this.requestBuilder.validate(request);

    const body = this.requestBuilder.build(request);
    const url = this.buildUrl('/images/generations');

    logger.debug('OpenAI API request', {
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
          Authorization: `Bearer ${this.openaiConfig.apiKey}`,
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

      const data: OpenAIImageGenerationResponse = await response.json();
      const images = this.responseParser.parse(data);

      if (images.length === 0) {
        logger.warn('OpenAI response contains no images', { data });
      }

      return images;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: OpenAI API call took too long');
      }
      // 记录详细的 fetch 错误信息
      if (error instanceof Error) {
        logger.error('OpenAI fetch error', {
          error: error.message,
          errorName: error.name,
          url,
          model: body.model,
        });
      }
      throw error;
    }
  }

  /**
   * 编辑图像
   */
  async edit(request: ImageEditRequest): Promise<string[]> {
    try {
      this.logRequest('edit', request);

      if (!request.referenceImages || request.referenceImages.length === 0) {
        throw new Error('Edit request requires at least one reference image');
      }

      // 处理参考图片
      const imageBase64 = await this.imageProcessor.process(
        request.referenceImages[0]
      );

      // 处理遮罩（如果有）
      let maskBase64: string | undefined;
      if (request.mask) {
        maskBase64 = await this.imageProcessor.process(request.mask);
      }

      // 构建请求体
      const body = this.requestBuilder.buildEdit(
        request,
        imageBase64,
        maskBase64
      );
      const url = this.buildUrl('/images/edits');

      // 使用 FormData 上传
      const formData = new FormData();
      formData.append('model', body.model);
      formData.append('prompt', body.prompt);
      formData.append(
        'image',
        this.imageProcessor.base64ToFile(body.image, 'image.png')
      );

      if (body.mask) {
        formData.append(
          'mask',
          this.imageProcessor.base64ToFile(body.mask, 'mask.png')
        );
      }

      if (body.n) {
        formData.append('n', body.n.toString());
      }

      if (body.size) {
        formData.append('size', body.size);
      }

      // 只有 DALL-E 系列支持 response_format 参数
      // gpt-image 系列总是返回 base64，不支持此参数
      const isGptImageModel = body.model.includes('gpt-image') ||
                               body.model.includes('chatgpt-image');
      if (!isGptImageModel) {
        formData.append('response_format', 'url');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiConfig.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: OpenAIImageGenerationResponse = await response.json();
      const images = this.responseParser.parse(data);

      this.logResponse('edit', images.length);
      return images;
    } catch (error) {
      this.logError('edit', error, request);
      throw this.createError(error, 'edit');
    }
  }

  /**
   * 生成图像变体
   */
  async variations(request: ImageGenerationRequest): Promise<string[]> {
    try {
      this.logRequest('variations', request);

      if (!request.referenceImages || request.referenceImages.length === 0) {
        throw new Error('Variations request requires at least one reference image');
      }

      // 处理参考图片
      const imageBase64 = await this.imageProcessor.process(
        request.referenceImages[0]
      );

      // 构建请求体
      const body = this.requestBuilder.buildVariation(request, imageBase64);
      const url = this.buildUrl('/images/variations');

      // 使用 FormData 上传
      const formData = new FormData();
      formData.append('model', body.model);
      formData.append(
        'image',
        this.imageProcessor.base64ToFile(body.image, 'image.png')
      );

      if (body.n) {
        formData.append('n', body.n.toString());
      }

      if (body.size) {
        formData.append('size', body.size);
      }

      // 只有 DALL-E 系列支持 response_format 参数
      // gpt-image 系列总是返回 base64，不支持此参数
      const isGptImageModel = body.model.includes('gpt-image') ||
                               body.model.includes('chatgpt-image');
      if (!isGptImageModel) {
        formData.append('response_format', 'url');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiConfig.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: OpenAIImageGenerationResponse = await response.json();
      const images = this.responseParser.parse(data);

      this.logResponse('variations', images.length);
      return images;
    } catch (error) {
      this.logError('variations', error, request);
      throw this.createError(error, 'variations');
    }
  }

  /**
   * 获取支持的原生批量大小
   */
  protected getNativeBatchSize(): number {
    // dall-e-3 只支持 n=1
    // dall-e-2 支持最多 n=10
    // gpt-image 支持最多 n=10
    return 10;
  }

  /**
   * 构建 API URL
   * 注意：OpenAI 需要带路径参数，所以覆盖父类方法
   */
  protected buildUrl(path?: string): string {
    return `${this.getBaseURL()}${path || '/images/generations'}`;
  }

  /**
   * 获取默认 baseURL
   */
  protected getDefaultBaseURL(): string {
    return OPENAI_PROVIDER_INFO.defaultBaseURL;
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
        'OPENAI_API_ERROR',
        500,
        this.providerId
      );
    }

    return new ImageGenerationError(
      'Unknown OpenAI error',
      'OPENAI_UNKNOWN_ERROR',
      500,
      this.providerId
    );
  }
}

/**
 * 创建 OpenAI 图像适配器
 */
export function createOpenAIImageAdapter(
  config: OpenAIAdapterConfig
): OpenAIImageAdapter {
  return new OpenAIImageAdapter(config);
}
