/**
 * OpenAI 响应解析器
 * 解析 OpenAI API 响应为统一的图片 URL 列表
 */

import type { ResponseParser } from '@/lib/providers/base/types';
import { logger } from '@/lib/logger';
import type { OpenAIImageGenerationResponse } from './types';

export class OpenAIResponseParser
  implements ResponseParser<OpenAIImageGenerationResponse>
{
  /**
   * 解析响应获取图片 URL 列表
   */
  parse(response: OpenAIImageGenerationResponse): string[] {
    const images: string[] = [];

    if (!response.data || !Array.isArray(response.data)) {
      logger.warn('OpenAI response missing data array', { response });
      return images;
    }

    for (const item of response.data) {
      if (item.url) {
        images.push(item.url);
        logger.debug('OpenAI image URL extracted', {
          url: item.url.substring(0, 50),
        });
      } else if (item.b64_json) {
        images.push(`data:image/png;base64,${item.b64_json}`);
        logger.debug('OpenAI base64 image extracted');
      }

      if (item.revised_prompt) {
        logger.debug('OpenAI revised prompt', { prompt: item.revised_prompt });
      }
    }

    return images;
  }

  /**
   * 检查响应是否成功
   */
  isSuccess(response: OpenAIImageGenerationResponse): boolean {
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
  parseError(response: OpenAIImageGenerationResponse): string {
    if (response.error?.message) {
      return response.error.message;
    }
    return 'Unknown OpenAI API error';
  }
}
