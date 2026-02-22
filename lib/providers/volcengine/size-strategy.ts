/**
 * Volcengine 尺寸策略
 * 处理 Volcengine 特定的尺寸格式和限制
 */

import type { SizeStrategy } from '@/lib/providers/base/types';
import { VOLCENGINE_SIZE_LIMITS } from './types';

export class VolcengineSizeStrategy implements SizeStrategy {
  /**
   * 解析宽高比为具体尺寸
   * Volcengine 支持直接传递分辨率预设 (1k, 2k, 4k) 或具体尺寸
   */
  resolve(aspectRatio: string): string {
    // 如果是分辨率预设，直接返回
    if (['1k', '2k', '4k'].includes(aspectRatio)) {
      return aspectRatio;
    }

    // 否则解析为具体尺寸
    const ratioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1536x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
      '9:16': '1024x1536',
    };

    return ratioMap[aspectRatio] || VOLCENGINE_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取默认尺寸
   */
  getDefaultSize(): string {
    return VOLCENGINE_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取支持的尺寸列表
   */
  getSupportedSizes(): string[] {
    return [
      ...VOLCENGINE_SIZE_LIMITS.RESOLUTION_PRESETS,
      '1024x1024',
      '1536x1024',
      '1024x1536',
    ];
  }

  /**
   * 验证尺寸是否有效
   */
  validate(size: string): boolean {
    // 检查是否是分辨率预设
    if (VOLCENGINE_SIZE_LIMITS.RESOLUTION_PRESETS.includes(size)) {
      return true;
    }

    // 检查是否是具体尺寸
    const match = size.match(/^(\d+)x(\d+)$/);
    if (!match) {
      return false;
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    return (
      width >= VOLCENGINE_SIZE_LIMITS.MIN_WIDTH &&
      width <= VOLCENGINE_SIZE_LIMITS.MAX_WIDTH &&
      height >= VOLCENGINE_SIZE_LIMITS.MIN_HEIGHT &&
      height <= VOLCENGINE_SIZE_LIMITS.MAX_HEIGHT
    );
  }
}
