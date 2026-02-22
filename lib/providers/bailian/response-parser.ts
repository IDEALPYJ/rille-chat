/**
 * Bailian 响应解析器
 * 解析 Bailian API 响应为统一的图片 URL 列表
 */

import type { ResponseParser } from '@/lib/providers/base/types';
import { logger } from '@/lib/logger';
import type {
  BailianImageGenerationResponse,
  BailianAsyncTaskResponse,
} from './types';

export class BailianResponseParser
  implements
    ResponseParser<BailianImageGenerationResponse | BailianAsyncTaskResponse>
{
  /**
   * 解析同步响应获取图片 URL 列表
   */
  parse(response: BailianImageGenerationResponse): string[] {
    const images: string[] = [];

    if (response.output?.choices?.[0]?.message?.content) {
      const content = response.output.choices[0].message.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.image) {
            images.push(item.image);
            logger.debug('Bailian image URL extracted', {
              url: item.image.substring(0, 50),
            });
          }
        }
      }
    }

    return images;
  }

  /**
   * 解析异步响应获取图片 URL 列表
   */
  parseAsync(response: BailianAsyncTaskResponse): string[] {
    const images: string[] = [];

    if (response.output?.choices) {
      for (const choice of response.output.choices) {
        if (choice.message?.content) {
          for (const item of choice.message.content) {
            if (item.image) {
              images.push(item.image);
              logger.debug('Bailian async image URL extracted', {
                url: item.image.substring(0, 50),
              });
            }
          }
        }
      }
    }

    return images;
  }

  /**
   * 检查同步响应是否成功
   */
  isSuccess(response: BailianImageGenerationResponse): boolean {
    return !!(
      response.output?.choices?.[0]?.message?.content &&
      Array.isArray(response.output.choices[0].message.content) &&
      response.output.choices[0].message.content.length > 0
    );
  }

  /**
   * 检查异步任务是否完成
   */
  isTaskCompleted(response: BailianAsyncTaskResponse): boolean {
    return response.output?.task_status === 'SUCCEEDED';
  }

  /**
   * 检查异步任务是否失败
   */
  isTaskFailed(response: BailianAsyncTaskResponse): boolean {
    const status = response.output?.task_status;
    return status === 'FAILED' || status === 'CANCELED';
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(
    response: BailianAsyncTaskResponse
  ): 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | undefined {
    return response.output?.task_status;
  }

  /**
   * 获取任务 ID
   */
  getTaskId(response: BailianAsyncTaskResponse): string | undefined {
    return response.output?.task_id;
  }

  /**
   * 解析错误信息
   */
  parseError(
    response:
      | BailianImageGenerationResponse
      | BailianAsyncTaskResponse
  ): string {
    if ('message' in response && response.message) {
      return response.message;
    }
    return 'Unknown Bailian API error';
  }
}
