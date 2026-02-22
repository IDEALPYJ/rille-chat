/**
 * 图像生成适配器基础抽象类
 * 所有提供商适配器的基类
 */

import type {
  ImageGenerationAdapter,
  ImageGenerationRequest,
  ImageEditRequest,
  ImageGenerationError,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';
import type {
  RequestBuilder,
  ResponseParser,
  SizeStrategy,
  BaseAdapterConfig,
} from './types';

/**
 * 基础适配器抽象类
 * 提供通用的日志记录和错误处理功能
 */
export abstract class BaseImageAdapter implements ImageGenerationAdapter {
  /** 请求构建器 */
  protected abstract requestBuilder: RequestBuilder;

  /** 响应解析器 */
  protected abstract responseParser: ResponseParser;

  /** 尺寸策略 */
  protected abstract sizeStrategy: SizeStrategy;

  /** 适配器配置 */
  protected config: BaseAdapterConfig;

  /** 提供商 ID */
  protected abstract providerId: string;

  constructor(config: BaseAdapterConfig) {
    this.config = config;
  }

  /**
   * 生成图像
   * 子类必须实现
   */
  abstract generate(request: ImageGenerationRequest): Promise<string[]>;

  /**
   * 编辑图像（可选实现）
   */
  edit?(request: ImageEditRequest): Promise<string[]>;

  /**
   * 生成图像变体（可选实现）
   */
  variations?(request: ImageGenerationRequest): Promise<string[]>;

  /**
   * 统一的日志记录 - 请求
   */
  protected logRequest(operation: string, request: ImageGenerationRequest): void {
    logger.debug(`${this.constructor.name} ${operation}`, {
      provider: this.providerId,
      model: request.model,
      prompt: request.prompt.substring(0, 50),
      count: request.count,
    });
  }

  /**
   * 统一的日志记录 - 响应
   */
  protected logResponse(operation: string, count: number): void {
    logger.info(`${this.constructor.name} ${operation} completed`, {
      provider: this.providerId,
      count,
    });
  }

  /**
   * 统一的日志记录 - 错误
   */
  protected logError(operation: string, error: unknown, request: ImageGenerationRequest): void {
    logger.error(`${this.constructor.name} ${operation} error`, {
      provider: this.providerId,
      model: request.model,
      prompt: request.prompt.substring(0, 50),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * 处理错误
   * 子类可以覆盖此方法以提供特定的错误处理
   */
  protected handleError(error: unknown, operation: string): never {
    throw this.createError(error, operation);
  }

  /**
   * 创建统一的错误对象
   * 子类必须实现
   */
  protected abstract createError(error: unknown, operation: string): ImageGenerationError;

  /**
   * 获取完整的 API URL
   */
  protected abstract buildUrl(): string;

  /**
   * 获取默认的 baseURL
   */
  protected abstract getDefaultBaseURL(): string;

  /**
   * 获取最终使用的 baseURL
   */
  protected getBaseURL(): string {
    return this.config.baseURL || this.getDefaultBaseURL();
  }
}

/**
 * 批量生成策略
 * 用于处理不支持原生批量生成的模型
 */
export abstract class BatchingImageAdapter extends BaseImageAdapter {
  /**
   * 批量生成图像
   * 子类实现单次 API 调用
   */
  protected abstract generateBatch(request: ImageGenerationRequest): Promise<string[]>;

  /**
   * 获取支持的原生批量大小
   * 默认返回 1（不支持原生批量）
   */
  protected getNativeBatchSize(): number {
    return 1;
  }

  /**
   * 生成图像（带批量处理逻辑）
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    const nativeBatchSize = this.getNativeBatchSize();
    const targetCount = Math.min(request.count || 1, 8); // 限制最大 8 张

    // 支持原生批量，直接调用
    if (nativeBatchSize > 1 && targetCount <= nativeBatchSize) {
      this.logRequest('generate (native batch)', request);
      const images = await this.generateBatch(request);
      this.logResponse('generate', images.length);
      return images;
    }

    // 不支持原生批量，循环生成
    this.logRequest('generate (sequential)', request);
    const images: string[] = [];

    for (let i = 0; i < targetCount; i++) {
      const batchImages = await this.generateBatch({
        ...request,
        count: 1,
      });
      images.push(...batchImages);
    }

    this.logResponse('generate', images.length);
    return images;
  }
}
