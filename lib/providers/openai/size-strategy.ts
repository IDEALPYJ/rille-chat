/**
 * OpenAI 尺寸策略
 * 处理 OpenAI 特定的尺寸格式和限制
 */

import type { SizeStrategy } from '@/lib/providers/base/types';
import { OPENAI_MODELS, OPENAI_SIZE_LIMITS } from './types';

export class OpenAISizeStrategy implements SizeStrategy {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  /**
   * 解析宽高比为具体尺寸
   */
  resolve(aspectRatio: string): string {
    const ratioMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1536x1024',
      '4:3': '1536x1024',
      '3:4': '1024x1536',
      '9:16': '1024x1536',
    };

    return ratioMap[aspectRatio] || OPENAI_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取默认尺寸
   */
  getDefaultSize(): string {
    return OPENAI_SIZE_LIMITS.DEFAULT;
  }

  /**
   * 获取支持的尺寸列表
   */
  getSupportedSizes(): string[] {
    if (this.model.includes(OPENAI_MODELS.DALL_E_2)) {
      return [...OPENAI_SIZE_LIMITS.DALL_E_2_SIZES];
    }
    if (this.model.includes(OPENAI_MODELS.DALL_E_3)) {
      return [...OPENAI_SIZE_LIMITS.DALL_E_3_SIZES];
    }
    if (this.isGptImageModel(this.model)) {
      return [...OPENAI_SIZE_LIMITS.GPT_IMAGE_SIZES];
    }
    return [OPENAI_SIZE_LIMITS.DEFAULT];
  }

  /**
   * 验证尺寸是否有效
   */
  validate(size: string): boolean {
    const normalizedSize = size.replace(/[×*]/g, 'x');
    const supportedSizes = this.getSupportedSizes();
    return supportedSizes.includes(normalizedSize);
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
