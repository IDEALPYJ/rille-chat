/**
 * ZAI 尺寸策略
 * 处理 ZAI 特定的尺寸格式和限制
 */

import type { SizeStrategy } from '@/lib/providers/base/types';
import { ZAI_SIZE_LIMITS, ZAI_MODELS } from './types';

export class ZaiSizeStrategy implements SizeStrategy {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * 解析宽高比为具体尺寸
   * ZAI 直接接收尺寸字符串，只需标准化格式
   */
  resolve(aspectRatio: string): string {
    // 将中文 × 或 * 替换为英文 x
    return aspectRatio.replace(/[×*]/g, 'x');
  }

  /**
   * 获取默认尺寸
   */
  getDefaultSize(): string {
    if (this.model.includes(ZAI_MODELS.GLM_IMAGE)) {
      return ZAI_SIZE_LIMITS.DEFAULT_GLM;
    }
    return ZAI_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取支持的尺寸列表
   */
  getSupportedSizes(): string[] {
    const sizes: string[] = [];
    const step = this.model.includes(ZAI_MODELS.GLM_IMAGE)
      ? ZAI_SIZE_LIMITS.STEP_GLM
      : ZAI_SIZE_LIMITS.STEP_COGVIEW;

    for (let w = ZAI_SIZE_LIMITS.MIN; w <= ZAI_SIZE_LIMITS.MAX; w += step) {
      for (let h = ZAI_SIZE_LIMITS.MIN; h <= ZAI_SIZE_LIMITS.MAX; h += step) {
        sizes.push(`${w}x${h}`);
      }
    }

    return sizes;
  }

  /**
   * 验证尺寸是否有效
   */
  validate(size: string): boolean {
    const normalizedSize = size.replace(/[×*]/g, 'x');
    const match = normalizedSize.match(/^(\d+)x(\d+)$/);

    if (!match) {
      return false;
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    // 检查范围
    if (
      width < ZAI_SIZE_LIMITS.MIN ||
      width > ZAI_SIZE_LIMITS.MAX ||
      height < ZAI_SIZE_LIMITS.MIN ||
      height > ZAI_SIZE_LIMITS.MAX
    ) {
      return false;
    }

    // 检查步长
    const step = this.model.includes(ZAI_MODELS.GLM_IMAGE)
      ? ZAI_SIZE_LIMITS.STEP_GLM
      : ZAI_SIZE_LIMITS.STEP_COGVIEW;

    return width % step === 0 && height % step === 0;
  }

  /**
   * 获取分辨率范围
   */
  getResolutionRange(): { min: number; max: number; step: number } {
    return {
      min: ZAI_SIZE_LIMITS.MIN,
      max: ZAI_SIZE_LIMITS.MAX,
      step: this.model.includes(ZAI_MODELS.GLM_IMAGE)
        ? ZAI_SIZE_LIMITS.STEP_GLM
        : ZAI_SIZE_LIMITS.STEP_COGVIEW,
    };
  }
}
