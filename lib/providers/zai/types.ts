/**
 * ZAI (智谱AI) 图像生成类型定义
 */

import type { ImageGenerationRequest } from '@/lib/image/types';

/**
 * ZAI 支持的模型
 */
export const ZAI_MODELS = {
  GLM_IMAGE: 'glm-image',
  COGVIEW_4: 'cogview-4',
  COGVIEW_3_FLASH: 'cogview-3-flash',
} as const;

/**
 * ZAI 尺寸常量
 */
export const ZAI_SIZE_LIMITS = {
  MIN: 512,
  MAX: 2048,
  STEP_GLM: 32,
  STEP_COGVIEW: 16,
  DEFAULT: '1024x1024',
  DEFAULT_GLM: '1280x1280',
} as const;

/**
 * ZAI 图像生成请求体
 */
export interface ZaiImageGenerationBody {
  model: string;
  prompt: string;
  size?: string;
  quality?: 'standard' | 'hd';
  watermark_enabled?: boolean;
}

/**
 * ZAI API 响应
 */
export interface ZaiImageGenerationResponse {
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
  error?: {
    message: string;
    code: string;
  };
}

/**
 * ZAI 特有的请求参数
 * 注意：quality 使用 ZAI 特定的枚举值
 */
export interface ZaiImageGenerationRequest extends Omit<ImageGenerationRequest, 'quality'> {
  quality?: 'standard' | 'hd';
  watermark?: boolean;
}

/**
 * ZAI 提供商信息
 */
export const ZAI_PROVIDER_INFO = {
  id: 'zai',
  name: '智谱AI',
  defaultBaseURL: 'https://open.bigmodel.cn/api',
} as const;
