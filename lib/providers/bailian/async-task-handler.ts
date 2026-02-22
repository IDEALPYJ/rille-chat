/**
 * Bailian 异步任务处理器
 * 处理 wan2.6 等模型的异步任务轮询
 */

import { logger } from '@/lib/logger';
import type { BailianAsyncTaskResponse } from './types';
import { BAILIAN_PROVIDER_INFO } from './types';
import type { ContentPart } from '@/lib/types';

export interface AsyncTaskHandlerConfig {
  apiKey: string;
  baseURL?: string;
  maxAttempts?: number;
  interval?: number;
}

/**
 * 流式回调函数类型
 */
export type StreamCallback = (contentParts: ContentPart[]) => void;

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: {
  attempt: number;
  maxAttempts: number;
  elapsedTime: number;
  status: string;
}) => void;

/**
 * Bailian 异步任务处理器
 */
export class BailianAsyncTaskHandler {
  private config: AsyncTaskHandlerConfig;

  constructor(config: AsyncTaskHandlerConfig) {
    this.config = {
      maxAttempts: 90, // 90 次，支持 3 分钟轮询
      interval: 2000, // 2 秒
      ...config,
    };
  }

  /**
   * 处理异步任务
   * @param initialResponse 初始响应数据
   * @returns 图文混排内容片段列表
   */
  async handle(initialResponse: BailianAsyncTaskResponse): Promise<ContentPart[]> {
    const taskId = initialResponse.output?.task_id;

    if (!taskId) {
      throw new Error('No task_id returned from async call');
    }

    logger.info('Starting async task polling', { taskId });

    // 用于累积图文混排内容
    const accumulatedContent: ContentPart[] = [];

    for (let attempt = 0; attempt < this.config.maxAttempts!; attempt++) {
      const taskData = await this.queryTask(taskId);
      const status = taskData.output?.task_status;

      logger.debug('Async task status check', {
        taskId,
        attempt: attempt + 1,
        status,
      });

      if (status === 'SUCCEEDED') {
        // 累积当前响应的内容
        const currentContent = this.extractContentParts(taskData);
        this.mergeContentParts(accumulatedContent, currentContent);

        // 对于图文混排模式，需要检查 finished 字段
        const isFinished = taskData.output?.finished === true;
        if (isFinished) {
          logger.info('Async task completed', { taskId });
          return accumulatedContent;
        }
        // 如果 finished 为 false，继续轮询
        logger.debug('Async task succeeded but not finished, continuing polling', { taskId, finished: taskData.output?.finished });
      }

      if (status === 'FAILED') {
        throw new Error(taskData.message || 'Task failed');
      }

      if (status === 'CANCELED') {
        throw new Error('Task was canceled');
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, this.config.interval));
    }

    throw new Error('Task timeout');
  }

  /**
   * 流式处理异步任务 - 支持实时回调
   * @param initialResponse 初始响应数据
   * @param onUpdate 内容更新回调
   * @param onProgress 进度回调
   * @returns 最终的图文混排内容片段列表
   */
  async handleStreaming(
    initialResponse: BailianAsyncTaskResponse,
    onUpdate?: StreamCallback,
    onProgress?: ProgressCallback
  ): Promise<ContentPart[]> {
    const taskId = initialResponse.output?.task_id;

    if (!taskId) {
      throw new Error('No task_id returned from async call');
    }

    logger.info('Starting async task streaming', { taskId });

    const startTime = Date.now();
    // 用于累积图文混排内容
    const accumulatedContent: ContentPart[] = [];

    for (let attempt = 0; attempt < this.config.maxAttempts!; attempt++) {
      const taskData = await this.queryTask(taskId);
      const status = taskData.output?.task_status;
      const elapsedTime = Date.now() - startTime;

      logger.debug('Async task status check (streaming)', {
        taskId,
        attempt: attempt + 1,
        status,
        elapsedTime: Math.round(elapsedTime / 1000) + 's',
      });

      // 发送进度更新
      if (onProgress) {
        onProgress({
          attempt: attempt + 1,
          maxAttempts: this.config.maxAttempts!,
          elapsedTime,
          status: status || 'UNKNOWN',
        });
      }

      if (status === 'SUCCEEDED') {
        // 累积当前响应的内容
        const currentContent = this.extractContentParts(taskData);
        const hasNewContent = this.mergeContentParts(accumulatedContent, currentContent);

        // 如果有新内容且提供了回调函数，实时通知
        if (hasNewContent && onUpdate) {
          onUpdate([...accumulatedContent]);
        }

        // 对于图文混排模式，需要检查 finished 字段
        const isFinished = taskData.output?.finished === true;
        if (isFinished) {
          logger.info('Async task completed (streaming)', { 
            taskId, 
            totalAttempts: attempt + 1,
            elapsedTime: Math.round(elapsedTime / 1000) + 's',
          });
          return accumulatedContent;
        }
        // 如果 finished 为 false，继续轮询
        logger.debug('Async task succeeded but not finished, continuing polling', { taskId, finished: taskData.output?.finished });
      }

      if (status === 'FAILED') {
        throw new Error(taskData.message || 'Task failed');
      }

      if (status === 'CANCELED') {
        throw new Error('Task was canceled');
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, this.config.interval));
    }

    const totalElapsed = Date.now() - startTime;
    throw new Error(`Task timeout after ${Math.round(totalElapsed / 1000)} seconds`);
  }

  /**
   * 查询任务状态
   * @param taskId 任务ID
   * @returns 任务状态数据
   */
  private async queryTask(taskId: string): Promise<BailianAsyncTaskResponse> {
    const baseURL = this.config.baseURL || BAILIAN_PROVIDER_INFO.defaultBaseURL;
    const url = `${baseURL}/tasks/${taskId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Query task failed! status: ${response.status}`
      );
    }

    return await response.json();
  }

  /**
   * 从异步响应中提取图文混排内容片段
   */
  private extractContentParts(response: BailianAsyncTaskResponse): ContentPart[] {
    const parts: ContentPart[] = [];

    if (response.output?.choices) {
      for (const choice of response.output.choices) {
        if (choice.message?.content) {
          for (const item of choice.message.content) {
            if (item.image) {
              parts.push({ type: 'image', image: item.image });
            } else if (item.text) {
              parts.push({ type: 'text', text: item.text });
            }
          }
        }
      }
    }

    return parts;
  }

  /**
   * 合并内容片段，避免重复
   * 对于文本类型，追加到新文本；对于图片类型，去重添加
   * @returns 是否有新内容被添加
   */
  private mergeContentParts(accumulated: ContentPart[], current: ContentPart[]): boolean {
    const existingImages = new Set(accumulated.filter(p => p.type === 'image').map(p => p.image));
    let hasNewContent = false;

    for (const part of current) {
      if (part.type === 'image') {
        // 图片去重
        if (!existingImages.has(part.image)) {
          accumulated.push(part);
          existingImages.add(part.image);
          hasNewContent = true;
        }
      } else if (part.type === 'text' && part.text) {
        // 文本追加（简单处理：如果最后一个也是文本，则合并；否则添加新文本）
        const lastPart = accumulated[accumulated.length - 1];
        if (lastPart && lastPart.type === 'text' && lastPart.text !== undefined) {
          // 检查文本是否有变化
          const oldText = lastPart.text;
          lastPart.text += part.text;
          if (lastPart.text !== oldText) {
            hasNewContent = true;
          }
        } else {
          accumulated.push(part);
          hasNewContent = true;
        }
      }
    }

    return hasNewContent;
  }
}
