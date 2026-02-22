/**
 * OpenAI 图片处理器
 * 处理 base64/URL 到 OpenAI API 需要的格式
 */

import type { ImageProcessor } from '@/lib/providers/base/types';
import { logger } from '@/lib/logger';

/**
 * OpenAI 图片处理器
 * 将图片转换为 base64 格式
 */
export class OpenAIImageProcessor implements ImageProcessor<string> {
  /**
   * 处理单张图片
   * 将 URL 或 base64 转换为 OpenAI 需要的 base64 格式
   */
  async process(image: string): Promise<string> {
    // 如果已经是 base64 格式，直接返回
    if (image.startsWith('data:image')) {
      // 提取 base64 部分
      const base64Match = image.match(/^data:image\/[^;]+;base64,(.+)$/);
      if (base64Match) {
        return base64Match[1];
      }
      return image;
    }

    // 如果是 URL，下载并转换为 base64
    if (image.startsWith('http')) {
      return await this.downloadAndConvertToBase64(image);
    }

    // 假设已经是纯 base64 字符串
    return image;
  }

  /**
   * 处理多张参考图片
   */
  async processMultiple(images: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const image of images) {
      try {
        const processed = await this.process(image);
        results.push(processed);
      } catch (error) {
        logger.error('Failed to process image', {
          image: image.substring(0, 50),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
    return results;
  }

  /**
   * 下载图片并转换为 base64
   */
  private async downloadAndConvertToBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url, { timeout: 30000 } as RequestInit);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      logger.debug('Image downloaded and converted to base64', {
        url: url.substring(0, 50),
        size: base64.length,
      });

      return base64;
    } catch (error) {
      logger.error('Failed to download image', {
        url: url.substring(0, 50),
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 将 base64 转换为 File 对象
   * 用于 FormData 上传
   */
  base64ToFile(base64: string, filename: string = 'image.png'): File {
    // 如果包含 data URI 前缀，移除它
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 检测 MIME 类型
    let mimeType = 'image/png';
    if (base64Data.charAt(0) === '/') {
      mimeType = 'image/jpeg';
    } else if (base64Data.charAt(0) === 'R') {
      mimeType = 'image/gif';
    } else if (base64Data.charAt(0) === 'i') {
      mimeType = 'image/png';
    } else if (base64Data.charAt(0) === 'U') {
      mimeType = 'image/webp';
    }

    // 创建 Blob
    const blob = new Blob([buffer], { type: mimeType });

    // 创建 File
    return new File([blob], filename, { type: mimeType });
  }
}
