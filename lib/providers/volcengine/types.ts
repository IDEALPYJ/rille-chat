/**
 * Volcengine (火山引擎) 图像生成类型定义
 */

import type { ImageGenerationRequest } from '@/lib/image/types';

/**
 * Volcengine 支持的模型
 */
export const VOLCENGINE_MODELS = {
  SEEDREAM_4_5: 'seedream-4.5',
  SEEDREAM_4_0: 'seedream-4.0',
} as const;

/**
 * Volcengine 尺寸常量
 */
export const VOLCENGINE_SIZE_LIMITS = {
  DEFAULT: '1024x1024',
  RESOLUTION_PRESETS: ['1k', '2k', '4k'] as string[],
  MIN_WIDTH: 480,
  MAX_WIDTH: 16384,
  MIN_HEIGHT: 480,
  MAX_HEIGHT: 16384,
};

/**
 * Volcengine 图像生成请求体
 */
export interface VolcengineImageGenerationBody {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  image?: string | string[];
  watermark?: boolean;
  response_format?: 'url' | 'b64_json';
  sequential_image_generation?: 'auto' | 'disabled';
  sequential_image_generation_options?: {
    max_images?: number;
  };
  optimize_prompt_options?: {
    mode: 'standard' | 'fast';
  };
  stream?: boolean;
}

/**
 * Volcengine API 响应
 */
export interface VolcengineImageGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    size?: string;
    error?: {
      message: string;
      code: string;
    };
  }>;
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * Volcengine 特有的请求参数
 */
export interface VolcengineImageGenerationRequest extends ImageGenerationRequest {
  resolution?: '1k' | '2k' | '4k';
  resolution_width?: number;
  resolution_height?: number;
  sequential_image_generation?: 'auto' | 'disabled';
  optimize_prompt_options?: 'standard' | 'fast';
}

/**
 * Volcengine 提供商信息
 */
export const VOLCENGINE_PROVIDER_INFO = {
  id: 'volcengine',
  name: '火山引擎',
  defaultBaseURL: 'https://ark.cn-beijing.volces.com/api/v3',
} as const;
