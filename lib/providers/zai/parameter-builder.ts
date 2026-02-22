/**
 * ZAI 参数构建器
 * 将通用请求转换为 ZAI 特定的请求体
 */

import type { ImageGenerationRequest } from '@/lib/image/types';
import type { RequestBuilder } from '@/lib/providers/base/types';
import type { ZaiImageGenerationBody } from './types';
import { ZAI_MODELS } from './types';

export class ZaiParameterBuilder implements RequestBuilder<ZaiImageGenerationBody> {
  /**
   * 构建 ZAI 图像生成请求体
   */
  build(request: ImageGenerationRequest): ZaiImageGenerationBody {
    const body: ZaiImageGenerationBody = {
      model: request.model,
      prompt: request.prompt,
    };

    // 处理尺寸参数
    if (request.size) {
      body.size = this.normalizeSize(request.size);
    }

    // 处理质量参数
    // glm-image 仅支持 hd，cogview 支持 standard/hd
    if (request.quality) {
      body.quality = this.resolveQuality(request.model, request.quality);
    }

    // 处理水印参数
    if (request.watermark !== undefined) {
      body.watermark_enabled = request.watermark;
    }

    return body;
  }

  /**
   * 验证请求参数
   */
  validate(request: ImageGenerationRequest): void {
    if (request.size) {
      const size = this.normalizeSize(request.size);
      if (!this.isValidSize(request.model, size)) {
        throw new Error(
          `Invalid size ${size}. ${this.getSizeValidationMessage(request.model)}`
        );
      }
    }
  }

  /**
   * 标准化尺寸格式
   * 将中文 × 或 * 替换为英文 x
   */
  private normalizeSize(size: string): string {
    return size.replace(/[×*]/g, 'x');
  }

  /**
   * 解析质量参数
   * - glm-image 仅支持 hd
   * - cogview 支持 standard/hd
   */
  private resolveQuality(
    model: string,
    quality: string
  ): 'standard' | 'hd' {
    // glm-image 强制使用 hd
    if (model.includes(ZAI_MODELS.GLM_IMAGE)) {
      return 'hd';
    }

    // cogview 支持 standard 或 hd
    return quality === 'hd' ? 'hd' : 'standard';
  }

  /**
   * 验证尺寸是否有效
   */
  private isValidSize(model: string, size: string): boolean {
    const normalizedSize = this.normalizeSize(size);
    const match = normalizedSize.match(/^(\d+)x(\d+)$/);

    if (!match) {
      return false;
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    const MIN = 512;
    const MAX = 2048;
    const STEP_GLM = 32;
    const STEP_COGVIEW = 16;

    // 检查范围
    if (width < MIN || width > MAX || height < MIN || height > MAX) {
      return false;
    }

    // 检查步长
    const step = model.includes(ZAI_MODELS.GLM_IMAGE) ? STEP_GLM : STEP_COGVIEW;
    return width % step === 0 && height % step === 0;
  }

  /**
   * 获取尺寸验证错误信息
   */
  private getSizeValidationMessage(model: string): string {
    const MIN = 512;
    const MAX = 2048;
    const STEP_GLM = 32;
    const STEP_COGVIEW = 16;

    const step = model.includes(ZAI_MODELS.GLM_IMAGE) ? STEP_GLM : STEP_COGVIEW;
    return `Size must be between ${MIN}-${MAX} and divisible by ${step}.`;
  }
}
