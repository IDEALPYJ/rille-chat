/**
 * Volcengine 响应解析器
 * 解析 Volcengine API 响应为统一的图片 URL 列表
 */

import type { ResponseParser } from '@/lib/providers/base/types';
import { logger } from '@/lib/logger';
import type { VolcengineImageGenerationResponse } from './types';

export class VolcengineResponseParser
  implements ResponseParser<VolcengineImageGenerationResponse>
{
  /**
   * 解析响应获取图片 URL 列表
   */
  parse(response: VolcengineImageGenerationResponse): string[] {
    const images: string[] = [];

    if (!response.data || !Array.isArray(response.data)) {
      logger.warn('Volcengine response missing data array', { response });
      return images;
    }

    for (const item of response.data) {
      if (item.url) {
        images.push(item.url);
        logger.info('Volcengine image generated', {
          url: item.url.substring(0, 50),
          size: item.size,
        });
      } else if (item.b64_json) {
        images.push(`data:image/jpeg;base64,${item.b64_json}`);
        logger.debug('Volcengine base64 image extracted');
      } else if (item.error) {
        logger.warn('Volcengine partial generation failed', {
          error: item.error,
        });
      }
    }

    return images;
  }

  /**
   * 检查响应是否成功
   */
  isSuccess(response: VolcengineImageGenerationResponse): boolean {
    return (
      !!response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0 &&
      (response.data[0].url !== undefined ||
        response.data[0].b64_json !== undefined)
    );
  }

  /**
   * 解析错误信息
   */
  parseError(response: VolcengineImageGenerationResponse): string {
    if (response.error?.message) {
      return response.error.message;
    }

    // 检查部分失败的情况
    if (response.data && Array.isArray(response.data)) {
      const errors = response.data
        .filter((item) => item.error)
        .map((item) => item.error?.message)
        .filter(Boolean);

      if (errors.length > 0) {
        return `Partial failures: ${errors.join(', ')}`;
      }
    }

    return 'Unknown Volcengine API error';
  }
}
