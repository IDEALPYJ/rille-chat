/**
 * OpenAI 参数构建器
 * 将通用请求转换为 OpenAI 特定的请求体
 */

import type { ImageGenerationRequest } from '@/lib/image/types';
import type { RequestBuilder } from '@/lib/providers/base/types';
import type {
  OpenAIImageGenerationBody,
  OpenAIImageEditBody,
  OpenAIImageVariationBody,
} from './types';
import { OPENAI_MODELS, OPENAI_SIZE_LIMITS } from './types';

export class OpenAIParameterBuilder
  implements RequestBuilder<OpenAIImageGenerationBody>
{
  /**
   * 构建 OpenAI 图像生成请求体
   */
  build(request: ImageGenerationRequest): OpenAIImageGenerationBody {
    const body: OpenAIImageGenerationBody = {
      model: request.model,
      prompt: request.prompt,
      response_format: 'url',
    };

    // 处理生成数量
    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    // 处理尺寸
    if (request.size) {
      body.size = this.normalizeSize(request.size);
    }

    // 处理质量参数
    if (request.quality) {
      body.quality = this.resolveQuality(request.model, request.quality);
    }

    // gpt-image 特有参数
    if (this.isGptImageModel(request.model)) {
      if (request.background) {
        body.background = request.background;
      }
      if (request.output_format) {
        body.output_format = request.output_format;
      }
      if (request.output_compression !== undefined) {
        body.output_compression = request.output_compression;
      }
      if (request.moderation) {
        body.moderation = request.moderation;
      }
    }

    // dall-e-3 特有参数
    if (request.model.includes(OPENAI_MODELS.DALL_E_3)) {
      // style 参数在 OpenAIImageGenerationRequest 中定义
      const openAIRequest = request as { style?: 'vivid' | 'natural' };
      if (openAIRequest.style) {
        body.style = openAIRequest.style;
      }
    }

    return body;
  }

  /**
   * 构建编辑请求体
   */
  buildEdit(
    request: ImageGenerationRequest,
    imageBase64: string,
    maskBase64?: string
  ): OpenAIImageEditBody {
    const body: OpenAIImageEditBody = {
      model: request.model,
      prompt: request.prompt,
      image: imageBase64,
      response_format: 'url',
    };

    if (maskBase64) {
      body.mask = maskBase64;
    }

    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    if (request.size) {
      body.size = this.normalizeSize(request.size);
    }

    return body;
  }

  /**
   * 构建变体请求体
   */
  buildVariation(
    request: ImageGenerationRequest,
    imageBase64: string
  ): OpenAIImageVariationBody {
    const body: OpenAIImageVariationBody = {
      model: request.model,
      image: imageBase64,
      response_format: 'url',
    };

    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    if (request.size) {
      body.size = this.normalizeSize(request.size);
    }

    return body;
  }

  /**
   * 验证请求参数
   */
  validate(request: ImageGenerationRequest): void {
    const model = request.model;

    // 验证尺寸
    if (request.size) {
      const validSizes = this.getValidSizes(model);
      const normalizedSize = this.normalizeSize(request.size);

      if (!this.isGptImageModel(model) && !validSizes.includes(normalizedSize)) {
        throw new Error(
          `Invalid size ${request.size} for model ${model}. Valid sizes: ${validSizes.join(', ')}`
        );
      }
    }

    // 验证数量
    if (request.count) {
      const maxN = this.getMaxN(model);
      if (request.count > maxN) {
        throw new Error(
          `Model ${model} supports maximum ${maxN} images per request`
        );
      }
    }
  }

  /**
   * 标准化尺寸格式
   */
  private normalizeSize(size: string): string {
    return size.replace(/[×*]/g, 'x');
  }

  /**
   * 解析质量参数
   */
  private resolveQuality(
    model: string,
    quality: string
  ): 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto' {
    // gpt-image 支持 low/medium/high/auto
    if (this.isGptImageModel(model)) {
      const validQualities = ['low', 'medium', 'high', 'auto'];
      if (validQualities.includes(quality)) {
        return quality as 'low' | 'medium' | 'high' | 'auto';
      }
      return 'auto';
    }

    // dall-e 支持 standard/hd
    if (quality === 'high' || quality === 'hd') {
      return 'hd';
    }
    return 'standard';
  }

  /**
   * 获取模型支持的最大生成数量
   */
  private getMaxN(model: string): number {
    if (model.includes(OPENAI_MODELS.DALL_E_3)) {
      return 1; // dall-e-3 只支持 n=1
    }
    if (this.isGptImageModel(model)) {
      return 10; // gpt-image 支持最多 10 张
    }
    return 10; // dall-e-2 支持最多 10 张
  }

  /**
   * 获取模型支持的尺寸列表
   */
  private getValidSizes(model: string): string[] {
    if (model.includes(OPENAI_MODELS.DALL_E_2)) {
      return [...OPENAI_SIZE_LIMITS.DALL_E_2_SIZES];
    }
    if (model.includes(OPENAI_MODELS.DALL_E_3)) {
      return [...OPENAI_SIZE_LIMITS.DALL_E_3_SIZES];
    }
    if (this.isGptImageModel(model)) {
      return [...OPENAI_SIZE_LIMITS.GPT_IMAGE_SIZES];
    }
    return [OPENAI_SIZE_LIMITS.DEFAULT];
  }

  /**
   * 判断是否为 gpt-image 模型
   */
  private isGptImageModel(model: string): boolean {
    return (
      model.includes(OPENAI_MODELS.GPT_IMAGE_1) ||
      model.includes(OPENAI_MODELS.GPT_IMAGE_1_5) ||
      model.includes(OPENAI_MODELS.CHATGPT_IMAGE)
    );
  }
}
