/**
 * Bailian (阿里云百炼) 图像生成类型定义
 */

import type { ImageGenerationRequest } from '@/lib/image/types';

/**
 * Bailian 支持的模型
 */
export const BAILIAN_MODELS = {
  WAN2_6: 'wan2.6',
  QWEN_IMAGE: 'qwen-image',
  QWEN_IMAGE_EDIT: 'qwen-image-edit',
  QWEN_IMAGE_MAX: 'qwen-image-max',
  QWEN_IMAGE_EDIT_MAX: 'qwen-image-edit-max',
  Z_IMAGE: 'z-image',
} as const;

/**
 * Bailian 尺寸常量
 */
export const BAILIAN_SIZE_LIMITS = {
  DEFAULT: '1024*1024',
  DEFAULT_QWEN: '1328*1328',
  DEFAULT_Z_IMAGE: '1024*1536',
  RATIO_MAP: {
    '16:9': '1664*928',
    '4:3': '1472*1104',
    '1:1': '1328*1328',
    '3:4': '1104*1472',
    '9:16': '928*1664',
  } as Record<string, string>,
} as const;

/**
 * Bailian 图像生成请求体
 */
export interface BailianImageGenerationBody {
  model: string;
  input: {
    messages: Array<{
      role: 'user';
      content: Array<{ image?: string; text?: string }>;
    }>;
  };
  parameters: {
    size?: string;
    negative_prompt?: string;
    prompt_extend?: boolean;
    watermark?: boolean;
    seed?: number;
    enable_interleave?: boolean;
    max_images?: number;
    n?: number;
    stream?: boolean;
  };
}

/**
 * Bailian API 响应 (同步)
 */
export interface BailianImageGenerationResponse {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string; text?: string }>;
      };
    }>;
  };
  message?: string;
}

/**
 * Bailian 异步任务响应
 */
export interface BailianAsyncTaskResponse {
  output?: {
    task_id?: string;
    task_status?: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
    finished?: boolean;
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string; text?: string }>;
      };
    }>;
  };
  message?: string;
}

/**
 * Bailian 特有的请求参数
 */
export interface BailianImageGenerationRequest extends ImageGenerationRequest {
  enable_interleave?: boolean;
  max_images?: number;
  n?: number;
}

/**
 * Bailian 提供商信息
 */
export const BAILIAN_PROVIDER_INFO = {
  id: 'bailian',
  name: '阿里云百炼',
  defaultBaseURL: 'https://dashscope.aliyuncs.com/api/v1',
} as const;
