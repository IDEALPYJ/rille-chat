/**
 * Provider 基础类型定义
 * 所有图像生成提供商共享的类型
 */

import type {
  ImageGenerationRequest,
} from '@/lib/image/types';

/**
 * 请求构建器接口
 * 将通用请求转换为提供商特定的请求体
 */
export interface RequestBuilder<TRequestBody = unknown, TRequest = ImageGenerationRequest> {
  /**
   * 构建请求体
   */
  build(request: TRequest): TRequestBody;

  /**
   * 验证请求参数
   */
  validate?(request: TRequest): void;
}

/**
 * 响应解析器接口
 * 解析提供商特定的响应为统一的图片 URL 列表
 */
export interface ResponseParser<TResponse = unknown> {
  /**
   * 解析响应获取图片 URL 列表
   */
  parse(response: TResponse): string[];

  /**
   * 检查响应是否成功
   */
  isSuccess?(response: TResponse): boolean;

  /**
   * 解析错误信息
   */
  parseError?(response: TResponse): string;
}

/**
 * 尺寸策略接口
 * 处理不同提供商的尺寸格式和限制
 */
export interface SizeStrategy {
  /**
   * 将宽高比解析为具体尺寸
   */
  resolve(aspectRatio: string): string;

  /**
   * 获取默认尺寸
   */
  getDefaultSize(): string;

  /**
   * 获取支持的尺寸列表
   */
  getSupportedSizes?(): string[];

  /**
   * 验证尺寸是否有效
   */
  validate?(size: string): boolean;
}

/**
 * 图片处理器接口
 * 处理 base64/URL 到提供商需要的格式
 */
export interface ImageProcessor<TOutput = unknown> {
  /**
   * 处理单张图片
   */
  process(image: string): Promise<TOutput>;

  /**
   * 处理多张参考图片
   */
  processMultiple?(images: string[]): Promise<TOutput[]>;
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  /**
   * 处理错误并转换为统一的 ImageGenerationError
   */
  handle(error: unknown, operation: string): Error;
}

/**
 * 基础适配器配置
 */
export interface BaseAdapterConfig {
  /** API Key */
  apiKey: string;
  /** Base URL (可选) */
  baseURL?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
}

/**
 * 提供商信息
 */
export interface ProviderInfo {
  /** Provider ID */
  id: string;
  /** Provider 显示名称 */
  name: string;
  /** 默认 Base URL */
  defaultBaseURL?: string;
}
