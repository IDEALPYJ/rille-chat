/**
 * Bailian 参数构建器
 * 将通用请求转换为 Bailian 特定的请求体
 */

import type { ImageGenerationRequest } from '@/lib/image/types';
import type { RequestBuilder } from '@/lib/providers/base/types';
import type { BailianImageGenerationBody } from './types';
import { BAILIAN_MODELS } from './types';

export class BailianParameterBuilder
  implements RequestBuilder<BailianImageGenerationBody>
{
  /**
   * 构建 Bailian 图像生成请求体
   */
  build(request: ImageGenerationRequest): BailianImageGenerationBody {
    const isWan26 = request.model.includes(BAILIAN_MODELS.WAN2_6);
    const hasReferenceImages =
      request.referenceImages && request.referenceImages.length > 0;

    // 构建消息内容
    const content: Array<{ image?: string; text?: string }> = [];

    // 添加参考图片（如果提供了）
    if (hasReferenceImages) {
      for (const image of request.referenceImages!) {
        content.push({ image });
      }
    }

    // 添加文本提示词
    content.push({ text: request.prompt });

    // 构建请求体
    const body: BailianImageGenerationBody = {
      model: request.model,
      input: {
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      },
      parameters: {},
    };

    // 添加可选参数
    if (request.size) {
      body.parameters.size = this.normalizeSize(request.size);
    }

    if (request.negative_prompt) {
      body.parameters.negative_prompt = request.negative_prompt;
    }

    if (request.prompt_extend !== undefined) {
      body.parameters.prompt_extend = request.prompt_extend;
    }

    if (request.watermark !== undefined) {
      body.parameters.watermark = request.watermark;
    }

    if (request.seed !== undefined) {
      body.parameters.seed = request.seed;
    }

    // wan2.6 特有参数
    if (isWan26) {
      // 无参考图时必须启用 enable_interleave
      const enableInterleave = request.enable_interleave === true || !hasReferenceImages;
      body.parameters.enable_interleave = enableInterleave;

      // 图文混排模式需要启用流式输出
      if (enableInterleave) {
        body.parameters.stream = true;
        // 图文混排模式下必须设置 max_images，默认值为 5
        body.parameters.max_images = request.count || request.max_images || 5;
      }

      // 图像编辑模式下使用 n 参数
      if (!enableInterleave && request.count && request.count > 1) {
        body.parameters.n = request.count;
      }
    } else if (hasReferenceImages && request.count && request.count > 1) {
      // qwen-image-edit 使用 n 参数
      body.parameters.n = request.count;
    }

    return body;
  }

  /**
   * 验证请求参数
   */
  validate(request: ImageGenerationRequest): void {
    // Bailian 的尺寸格式为 width*height
    if (request.size) {
      const normalizedSize = this.normalizeSize(request.size);
      const match = normalizedSize.match(/^(\d+)\*(\d+)$/);

      if (!match) {
        throw new Error(
          `Invalid size format: ${request.size}. Expected format: width*height (e.g., 1024*1024)`
        );
      }
    }
  }

  /**
   * 标准化尺寸格式
   * 将中文 × 或英文 x 转换为 *
   */
  private normalizeSize(size: string): string {
    return size.replace(/[×x]/g, '*');
  }

  /**
   * 判断是否为 wan2.6 模型
   */
  isWan26(model: string): boolean {
    return model.includes(BAILIAN_MODELS.WAN2_6);
  }

  /**
   * 判断是否支持原生批量生成
   */
  supportsNativeBatch(request: ImageGenerationRequest): boolean {
    const isWan26 = request.model.includes(BAILIAN_MODELS.WAN2_6);
    const hasReferenceImages =
      !!(request.referenceImages && request.referenceImages.length > 0);

    // wan2.6 支持 max_images 参数
    // qwen-image-edit 支持 n 参数
    return isWan26 || hasReferenceImages;
  }

  /**
   * 获取最大原生批量大小
   */
  getMaxNativeBatch(model: string): number {
    if (model.includes(BAILIAN_MODELS.WAN2_6)) {
      return 5; // wan2.6 最多 5 张
    }
    if (model.includes(BAILIAN_MODELS.QWEN_IMAGE_EDIT)) {
      return 6; // qwen-image-edit 最多 6 张
    }
    return 1;
  }
}
