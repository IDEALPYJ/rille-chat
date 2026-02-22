/**
 * ZAI 响应解析器
 * 解析 ZAI API 响应为统一的图片 URL 列表
 */

import type { ResponseParser } from '@/lib/providers/base/types';
import { logger } from '@/lib/logger';
import type { ZaiImageGenerationResponse } from './types';

export class ZaiResponseParser implements ResponseParser<ZaiImageGenerationResponse> {
  /**
   * 解析响应获取图片 URL 列表
   */
  parse(response: ZaiImageGenerationResponse): string[] {
    const images: string[] = [];

    if (!response.data || !Array.isArray(response.data)) {
      logger.warn('ZAI response missing data array', { response });
      return images;
    }

    for (const item of response.data) {
      if (item.url) {
        images.push(item.url);
        logger.debug('ZAI image URL extracted', { url: item.url.substring(0, 50) });
      } else if (item.b64_json) {
        images.push(`data:image/jpeg;base64,${item.b64_json}`);
        logger.debug('ZAI base64 image extracted');
      }
    }

    return images;
  }

  /**
   * 检查响应是否成功
   */
  isSuccess(response: ZaiImageGenerationResponse): boolean {
    return !!response.data &&
           Array.isArray(response.data) &&
           response.data.length > 0 &&
           (response.data[0].url !== undefined || response.data[0].b64_json !== undefined);
  }

  /**
   * 解析错误信息
   */
  parseError(response: ZaiImageGenerationResponse): string {
    if (response.error?.message) {
      return response.error.message;
    }
    return 'Unknown ZAI API error';
  }
}
