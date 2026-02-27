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
    };

    // 只有 DALL-E 系列支持 response_format 参数
    // gpt-image 系列总是返回 base64，不支持此参数
    if (!this.isGptImageModel(request.model)) {
      body.response_format = 'url';
    }

    // 处理生成数量
    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    // 处理尺寸 - 优先使用 size，否则使用 aspectRatio
    const sizeValue = request.size || request.aspectRatio;
    if (sizeValue) {
      body.size = this.normalizeSize(sizeValue, request.model);
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
    };

    // 只有 DALL-E 系列支持 response_format 参数
    // gpt-image 系列总是返回 base64，不支持此参数
    if (!this.isGptImageModel(request.model)) {
      body.response_format = 'url';
    }

    if (maskBase64) {
      body.mask = maskBase64;
    }

    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    // 处理尺寸 - 优先使用 size，否则使用 aspectRatio
    const editSizeValue = request.size || request.aspectRatio;
    if (editSizeValue) {
      body.size = this.normalizeSize(editSizeValue, request.model);
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
    };

    // 只有 DALL-E 系列支持 response_format 参数
    // gpt-image 系列总是返回 base64，不支持此参数
    if (!this.isGptImageModel(request.model)) {
      body.response_format = 'url';
    }

    if (request.count && request.count > 1) {
      body.n = Math.min(request.count, this.getMaxN(request.model));
    }

    // 处理尺寸 - 优先使用 size，否则使用 aspectRatio
    const variationSizeValue = request.size || request.aspectRatio;
    if (variationSizeValue) {
      body.size = this.normalizeSize(variationSizeValue, request.model);
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
      const normalizedSize = this.normalizeSize(request.size, model);

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
   * 支持比例值（如 1:1）和像素值（如 1024×1024）
   */
  private normalizeSize(size: string, model: string): string {
    // 如果已经是像素格式（包含数字x数字），直接替换分隔符
    if (/^\d+\s*[×*xX]\s*\d+$/.test(size)) {
      return size.replace(/[×*]/g, 'x').replace(/\s/g, '');
    }

    // 处理比例值（如 1:1, 16:9）
    const ratioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1536x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
      '9:16': '1024x1536',
    };

    // 清理比例值（移除空格）
    const cleanRatio = size.replace(/\s/g, '');

    // 对于 gpt-image 模型，使用 gpt-image 支持的尺寸
    if (this.isGptImageModel(model)) {
      return ratioMap[cleanRatio] || OPENAI_SIZE_LIMITS.GPT_IMAGE_SIZES[0];
    }

    // 对于 dall-e 模型，使用对应的尺寸
    if (model.includes(OPENAI_MODELS.DALL_E_3)) {
      const dalle3Map: Record<string, string> = {
        '1:1': '1024x1024',
        '16:9': '1792x1024',
        '4:3': '1792x1024',
        '3:4': '1024x1792',
        '9:16': '1024x1792',
      };
      return dalle3Map[cleanRatio] || OPENAI_SIZE_LIMITS.DALL_E_3_SIZES[0];
    }

    // 默认使用 dall-e-2 尺寸
    return ratioMap[cleanRatio] || OPENAI_SIZE_LIMITS.DALL_E_2_SIZES[2];
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
