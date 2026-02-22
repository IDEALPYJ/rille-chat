/**
 * Bailian (阿里云百炼) 图像生成适配器
 * 支持 wan2.6、qwen-image 系列模型
 */

import { BatchingImageAdapter } from '@/lib/providers/base/image-adapter-base';
import type {
  ImageGenerationRequest,
  ImageEditRequest,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';
import { BailianParameterBuilder } from './parameter-builder';
import { BailianResponseParser } from './response-parser';
import { BailianSizeStrategy } from './size-strategy';
import { BailianAsyncTaskHandler, type StreamCallback } from './async-task-handler';
import type {
  BailianImageGenerationResponse,
  BailianAsyncTaskResponse,
} from './types';
import { BAILIAN_MODELS, BAILIAN_PROVIDER_INFO } from './types';
import type { ContentPart } from '@/lib/types';

export interface BailianAdapterConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

/**
 * SSE 流式响应数据
 */
interface StreamResponse {
  output?: {
    choices?: Array<{
      finish_reason?: string | null;
      message?: {
        content?: Array<{ image?: string; text?: string; type?: string }>;
      };
    }>;
    finished?: boolean;
  };
  usage?: {
    image_count?: number;
  };
}

/**
 * Bailian 图像生成适配器
 */
export class BailianImageAdapter extends BatchingImageAdapter {
  protected requestBuilder = new BailianParameterBuilder();
  protected responseParser = new BailianResponseParser();
  protected sizeStrategy: BailianSizeStrategy;
  protected providerId = BAILIAN_PROVIDER_INFO.id;

  private bailianConfig: BailianAdapterConfig;
  private asyncTaskHandler: BailianAsyncTaskHandler;

  constructor(config: BailianAdapterConfig) {
    super(config);
    this.bailianConfig = config;
    this.sizeStrategy = new BailianSizeStrategy('');
    this.asyncTaskHandler = new BailianAsyncTaskHandler({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  /**
   * 生成图像
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    try {
      this.sizeStrategy = new BailianSizeStrategy(request.model);
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

    const isWan26 = request.model.includes(BAILIAN_MODELS.WAN2_6);
    const hasReferenceImages =
      request.referenceImages && request.referenceImages.length > 0;
    const useAsync = isWan26 && (request.enable_interleave || !hasReferenceImages);

    const body = this.requestBuilder.build(request);
    const url = this.buildApiUrl(useAsync);

    logger.debug('Bailian API request', {
      url,
      model: body.model,
      prompt: body.input.messages[0].content.find((c) => c.text)?.text?.substring(0, 50),
      isWan26,
      useAsync,
      enable_interleave: body.parameters.enable_interleave,
    });

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.bailianConfig.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (useAsync) {
      headers['X-DashScope-Async'] = 'enable';
    }

    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout || 120000); // Bailian 默认 120 秒超时

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = (await response.json()) as
        | BailianImageGenerationResponse
        | BailianAsyncTaskResponse;

      // 异步调用需要轮询获取结果
      if (useAsync) {
        const contentParts = await this.asyncTaskHandler.handle(data as BailianAsyncTaskResponse);
        // 只返回图片 URL
        return contentParts
          .filter(part => part.type === 'image' && part.image)
          .map(part => part.image!);
      }

      // 同步调用直接解析响应
      const images = this.responseParser.parse(data as BailianImageGenerationResponse);

      if (images.length === 0) {
        logger.warn('Bailian response contains no images', { data });
      }

      return images;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout: Bailian API call took too long');
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

      const url = `${this.getBaseURL()}/services/aigc/multimodal-generation/generation`;

      // 构建请求体
      const body = this.requestBuilder.build(request);
      body.parameters.n = request.count || 1;

      logger.debug('Bailian edit request', {
        model: body.model,
        prompt: body.input.messages[0].content.find((c) => c.text)?.text?.substring(0, 50),
        imageCount: request.referenceImages.length,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.bailianConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data: BailianImageGenerationResponse = await response.json();
      const images = this.responseParser.parse(data);

      this.logResponse('edit', images.length);
      return images;
    } catch (error) {
      this.logError('edit', error, request);
      throw this.createError(error, 'edit');
    }
  }

  /**
   * 生成图文混排内容（支持 wan2.6 图文混排模式）
   * @param request 图像生成请求
   * @returns 图文混排内容片段列表
   */
  async generateInterleaved(request: ImageGenerationRequest): Promise<ContentPart[]> {
    try {
      this.sizeStrategy = new BailianSizeStrategy(request.model);
      this.logRequest('generateInterleaved', request);

      const isWan26 = request.model.includes(BAILIAN_MODELS.WAN2_6);
      if (!isWan26) {
        throw new Error('Interleaved generation is only supported for wan2.6 models');
      }

      this.requestBuilder.validate(request);

      const hasReferenceImages = request.referenceImages && request.referenceImages.length > 0;
      const useAsync = request.enable_interleave || !hasReferenceImages;

      const body = this.requestBuilder.build(request);
      const url = this.buildApiUrl(useAsync);

      logger.debug('Bailian interleaved API request', {
        url,
        model: body.model,
        prompt: body.input.messages[0].content.find((c) => c.text)?.text?.substring(0, 50),
        enable_interleave: body.parameters.enable_interleave,
      });

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.bailianConfig.apiKey}`,
        'Content-Type': 'application/json',
      };

      if (useAsync) {
        headers['X-DashScope-Async'] = 'enable';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.timeout || 120000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as BailianAsyncTaskResponse;

        // 异步调用需要轮询获取结果
        const contentParts = await this.asyncTaskHandler.handle(data);

        logger.info('Bailian interleaved generation completed', {
          provider: this.providerId,
          textCount: contentParts.filter(p => p.type === 'text').length,
          imageCount: contentParts.filter(p => p.type === 'image').length,
        });

        return contentParts;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout: Bailian API call took too long');
        }
        throw error;
      }
    } catch (error) {
      this.logError('generateInterleaved', error, request);
      throw this.createError(error, 'generateInterleaved');
    }
  }

  /**
   * 流式生成图文混排内容（支持 wan2.6 图文混排模式）
   * 使用同步流式调用，实时获取文本和图片
   * @param request 图像生成请求
   * @param onUpdate 内容更新回调，在流式输出过程中实时通知新内容
   * @returns 最终的图文混排内容片段列表
   */
  async generateInterleavedStreaming(
    request: ImageGenerationRequest,
    onUpdate?: StreamCallback
  ): Promise<ContentPart[]> {
    try {
      this.sizeStrategy = new BailianSizeStrategy(request.model);
      this.logRequest('generateInterleavedStreaming', request);

      const isWan26 = request.model.includes(BAILIAN_MODELS.WAN2_6);
      if (!isWan26) {
        throw new Error('Interleaved generation is only supported for wan2.6 models');
      }

      this.requestBuilder.validate(request);

      // 图文混排模式使用同步流式调用
      const body = this.requestBuilder.build(request);
      // 强制启用流式输出
      body.parameters.stream = true;
      body.parameters.enable_interleave = true;

      // 使用同步端点
      const url = `${this.getBaseURL()}/services/aigc/multimodal-generation/generation`;

      logger.debug('Bailian interleaved streaming API request', {
        url,
        model: body.model,
        prompt: body.input.messages[0].content.find((c) => c.text)?.text?.substring(0, 50),
        enable_interleave: body.parameters.enable_interleave,
        stream: body.parameters.stream,
      });

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.bailianConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Sse': 'enable', // 启用 SSE 流式输出
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.timeout || 180000); // 3 分钟超时

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        logger.debug('Bailian API response received', {
          status: response.status,
          contentType: response.headers.get('content-type'),
        });

        // 处理 SSE 流
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        const accumulatedContent: ContentPart[] = [];
        let isFinished = false;

        // 解析单个 SSE 事件
        const parseSSEEvent = (eventStr: string): StreamResponse | null => {
          const lines = eventStr.split('\n');
          let dataLine = '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data:')) {
              // 提取 data: 后面的内容（可能有空格也可能没有）
              dataLine = trimmedLine.slice(5).trim();
            }
          }
          
          if (!dataLine || dataLine === '[DONE]') {
            return null;
          }
          
          try {
            return JSON.parse(dataLine);
          } catch (e) {
            logger.warn('Failed to parse SSE data', { dataLine, error: e });
            return null;
          }
        };

        // 处理 SSE 事件
        const processEvent = (event: StreamResponse) => {
          const choice = event.output?.choices?.[0];
          
          if (choice?.message?.content) {
            for (const item of choice.message.content) {
              if (item.image) {
                accumulatedContent.push({ type: 'image', image: item.image });
                if (onUpdate) {
                  onUpdate([...accumulatedContent]);
                }
              } else if (item.text) {
                // 检查是否需要追加到上一个文本
                const lastPart = accumulatedContent[accumulatedContent.length - 1];
                if (lastPart && lastPart.type === 'text') {
                  // 创建新的文本对象，避免修改引用
                  const updatedText = lastPart.text + item.text;
                  accumulatedContent[accumulatedContent.length - 1] = { 
                    type: 'text', 
                    text: updatedText 
                  };
                } else {
                  accumulatedContent.push({ type: 'text', text: item.text });
                }
                if (onUpdate) {
                  onUpdate([...accumulatedContent]);
                }
              }
            }
          }

          // 检查是否结束
          if (choice?.finish_reason === 'stop') {
            return true;
          }
          return false;
        };

        while (!isFinished) {
          const { done, value } = await reader.read();
          if (done) {
            // 处理剩余的 buffer
            if (buffer.trim()) {
              const event = parseSSEEvent(buffer);
              if (event) {
                isFinished = processEvent(event);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // SSE 事件以 \n\n 分隔
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const eventStr of events) {
            if (!eventStr.trim()) continue;
            
            const event = parseSSEEvent(eventStr);
            if (event) {
              isFinished = processEvent(event);
              if (isFinished) break;
            }
          }
        }

        clearTimeout(timeoutId);

        logger.info('Bailian interleaved streaming generation completed', {
          provider: this.providerId,
          textCount: accumulatedContent.filter(p => p.type === 'text').length,
          imageCount: accumulatedContent.filter(p => p.type === 'image').length,
        });

        return accumulatedContent;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout: Bailian API call took too long');
        }
        throw error;
      }
    } catch (error) {
      this.logError('generateInterleavedStreaming', error, request);
      throw this.createError(error, 'generateInterleavedStreaming');
    }
  }

  /**
   * 获取支持的原生批量大小
   */
  protected getNativeBatchSize(): number {
    // Bailian 的批量生成逻辑在 generateBatch 中处理
    // 这里返回 1，让父类循环调用 generateBatch
    return 1;
  }

  /**
   * 构建 API URL (实现抽象方法)
   */
  protected buildUrl(): string {
    return `${this.getBaseURL()}/services/aigc/multimodal-generation/generation`;
  }

  /**
   * 构建 API URL (带异步参数)
   * 注意：Bailian 需要带参数，所以不使用父类的 buildUrl
   */
  private buildApiUrl(useAsync: boolean): string {
    const baseURL = this.getBaseURL();
    if (useAsync) {
      return `${baseURL}/services/aigc/image-generation/generation`;
    }
    return `${baseURL}/services/aigc/multimodal-generation/generation`;
  }

  /**
   * 获取默认 baseURL
   */
  protected getDefaultBaseURL(): string {
    return BAILIAN_PROVIDER_INFO.defaultBaseURL;
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
        'BAILIAN_API_ERROR',
        500,
        this.providerId
      );
    }

    return new ImageGenerationError(
      'Unknown Bailian error',
      'BAILIAN_UNKNOWN_ERROR',
      500,
      this.providerId
    );
  }
}

/**
 * 创建 Bailian 图像适配器
 */
export function createBailianImageAdapter(
  config: BailianAdapterConfig
): BailianImageAdapter {
  return new BailianImageAdapter(config);
}
