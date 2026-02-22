/**
 * Chat Completions API 图像生成适配器
 * 适用于使用 Chat Completions API 进行图像生成的模型
 * 如 OpenRouter 的 gpt-5-image、Google 的 Gemini 等
 */

import OpenAI from 'openai';
import {
  ImageGenerationAdapter,
  ImageGenerationRequest,
  ImageGenerationError,
} from '@/lib/image/types';
import { logger } from '@/lib/logger';

export interface ChatCompletionsImageAdapterConfig {
  /** API Key */
  apiKey: string;
  /** Base URL */
  baseURL?: string;
  /** 超时时间 (毫秒) */
  timeout?: number;
}

/**
 * OpenRouter 格式的图像对象
 */
interface OpenRouterImage {
  image_url?: {
    url?: string;
  };
  url?: string;
}

/**
 * 标准格式的图像内容
 */
interface ImageContentPart {
  type: 'image_url';
  image_url?: {
    url?: string;
  };
}

/**
 * 支持图像的 Chat Completion Message
 */
interface ChatCompletionImageMessage {
  images?: OpenRouterImage[];
  content?: string | ImageContentPart[];
}

/**
 * Chat Completions API 图像生成适配器
 */
export class ChatCompletionsImageAdapter implements ImageGenerationAdapter {
  private client: OpenAI;
  private config: ChatCompletionsImageAdapterConfig;

  constructor(config: ChatCompletionsImageAdapterConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout,
    });
  }

  /**
   * 生成图像
   * 使用 Chat Completions API 的 modalities 参数
   * 
   * 设计理念：
   * - 每次只调用一次 API，让模型自己决定返回几张图片
   * - 尊重模型的设计，不强制截取或重复调用
   * - 如果用户需要更多图片，可以再次请求
   */
  async generate(request: ImageGenerationRequest): Promise<string[]> {
    try {
      const { model, prompt, count = 1, size } = request;

      logger.debug('Using Chat Completions API for image generation', { model, count });

      // 构建 Chat Completions API 请求
      // 注意：目前 Chat Completions API 不支持 n 参数来控制生成数量
      // 模型会自己决定返回几张图片
      const requestParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        // 设置 modalities 为 image 和 text，这是图像生成的关键参数
        modalities: ['text', 'image'] as unknown as ('text' | 'audio')[],
        // 可选的图像配置
        ...(size ? {
          image_config: {
            aspect_ratio: this.mapSizeToAspectRatio(size),
          }
        } : {}),
      };
      const response = await this.client.chat.completions.create(requestParams);

      logger.debug('Chat Completions API raw response', { response: JSON.stringify(response, null, 2) });

      // 从响应中提取图像
      const images: string[] = [];

      if ('choices' in response && response.choices && response.choices.length > 0) {
        const message = response.choices[0].message as ChatCompletionImageMessage;

        // 检查 message.images 字段 (OpenRouter 格式)
        if (message.images && Array.isArray(message.images)) {
          for (const image of message.images) {
            if (image.image_url?.url) {
              images.push(image.image_url.url);
            } else if (image.url) {
              images.push(image.url);
            }
          }
        }

        // 也检查 content 中是否包含图像 (标准格式)
        if (message.content && typeof message.content === 'object' && Array.isArray(message.content)) {
          for (const content of message.content) {
            if (content.type === 'image_url' && content.image_url?.url) {
              images.push(content.image_url.url);
            }
          }
        }
      }

      logger.info('Chat Completions API image generation completed', {
        model,
        requestedCount: count,
        actualCount: images.length,
      });

      return images;
    } catch (error: any) {
      logger.error('Chat Completions image generation error', {
        error: error.message,
        model: request.model,
        prompt: request.prompt.substring(0, 50)
      });

      if (error instanceof OpenAI.APIError) {
        throw new ImageGenerationError(
          error.message,
          error.code || 'API_ERROR',
          error.status,
          'openrouter'
        );
      }

      throw new ImageGenerationError(
        error.message || 'Image generation failed',
        'UNKNOWN_ERROR',
        500,
        'openrouter'
      );
    }
  }

  /**
   * 将尺寸映射到宽高比
   */
  private mapSizeToAspectRatio(size: string): string {
    const sizeMap: Record<string, string> = {
      '1024x1024': '1:1',
      '1536x1024': '3:2',
      '1024x1536': '2:3',
    };
    return sizeMap[size] || '1:1';
  }
}
