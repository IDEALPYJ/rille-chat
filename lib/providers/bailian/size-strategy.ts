/**
 * Bailian 尺寸策略
 * 处理 Bailian 特定的尺寸格式和限制
 */

import type { SizeStrategy } from '@/lib/providers/base/types';
import { BAILIAN_MODELS, BAILIAN_SIZE_LIMITS } from './types';

export class BailianSizeStrategy implements SizeStrategy {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * 解析宽高比为具体尺寸
   */
  resolve(aspectRatio: string): string {
    const ratioMap = BAILIAN_SIZE_LIMITS.RATIO_MAP;
    return ratioMap[aspectRatio] || this.getDefaultSize();
  }

  /**
   * 获取默认尺寸
   */
  getDefaultSize(): string {
    if (this.model.includes(BAILIAN_MODELS.Z_IMAGE)) {
      return BAILIAN_SIZE_LIMITS.DEFAULT_Z_IMAGE;
    }
    if (this.model.includes(BAILIAN_MODELS.QWEN_IMAGE)) {
      return BAILIAN_SIZE_LIMITS.DEFAULT_QWEN;
    }
    return BAILIAN_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取支持的尺寸列表
   */
  getSupportedSizes(): string[] {
    return Object.values(BAILIAN_SIZE_LIMITS.RATIO_MAP);
  }

  /**
   * 验证尺寸是否有效
   */
  validate(size: string): boolean {
    const normalizedSize = size.replace(/[×x]/g, '*');
    const supportedSizes = this.getSupportedSizes();
    return supportedSizes.includes(normalizedSize);
  }

  /**
   * 标准化尺寸格式
   * 将中文 × 或英文 x 转换为 *
   */
  normalizeSize(size: string): string {
    return size.replace(/[×x]/g, '*');
  }
}
