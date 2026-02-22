/**
 * OpenAI 图像生成类型定义
 */

import type { ImageGenerationRequest } from '@/lib/image/types';

/**
 * OpenAI 支持的模型
 */
export const OPENAI_MODELS = {
  DALL_E_2: 'dall-e-2',
  DALL_E_3: 'dall-e-3',
  GPT_IMAGE_1: 'gpt-image-1',
  GPT_IMAGE_1_5: 'gpt-image-1.5',
  CHATGPT_IMAGE: 'chatgpt-image',
} as const;

/**
 * OpenAI 尺寸常量
 */
export const OPENAI_SIZE_LIMITS = {
  DEFAULT: '1024x1024',
  DALL_E_2_SIZES: ['256x256', '512x512', '1024x1024'],
  DALL_E_3_SIZES: ['1024x1024', '1792x1024', '1024x1792'],
  GPT_IMAGE_SIZES: ['1024x1024', '1536x1024', '1024x1536'],
} as const;

/**
 * OpenAI 图像生成请求体
 */
export interface OpenAIImageGenerationBody {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto';
  response_format?: 'url' | 'b64_json';
  style?: 'vivid' | 'natural';
  user?: string;
  // gpt-image 特有参数
  background?: 'transparent' | 'opaque' | 'auto';
  output_format?: 'png' | 'jpeg' | 'webp';
  output_compression?: number;
  moderation?: 'auto' | 'low';
}

/**
 * OpenAI 图像编辑请求体
 */
export interface OpenAIImageEditBody {
  model: string;
  prompt: string;
  image: string; // base64
  mask?: string; // base64
  n?: number;
  size?: string;
  response_format?: 'url' | 'b64_json';
  user?: string;
}

/**
 * OpenAI 图像变体请求体
 */
export interface OpenAIImageVariationBody {
  model: string;
  image: string; // base64
  n?: number;
  size?: string;
  response_format?: 'url' | 'b64_json';
  user?: string;
}

/**
 * OpenAI API 响应
 */
export interface OpenAIImageGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message: string;
    type?: string;
    code?: string;
  };
  created?: number;
}

/**
 * OpenAI 特有的请求参数
 */
export interface OpenAIImageGenerationRequest extends ImageGenerationRequest {
  style?: 'vivid' | 'natural';
  user?: string;
}

/**
 * OpenAI 提供商信息
 */
export const OPENAI_PROVIDER_INFO = {
  id: 'openai',
  name: 'OpenAI',
  defaultBaseURL: 'https://api.openai.com/v1',
} as const;
