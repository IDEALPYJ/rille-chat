/**
 * OpenAI 图像生成能力定义
 * 定义 OpenAI Image API 的图像生成能力
 */

import { ProviderImageCapabilities, ImageModelCapabilities } from '@/lib/image/types';

/**
 * GPT Image 1.5 模型能力
 */
const GPTImage15Capabilities: ImageModelCapabilities = {
  features: ['image_generation', 'image_edit', 'mask_edit', 'multi_reference', 'streaming'],
  parameters: {
    quality: {
      type: 'select',
      options: ['low', 'medium', 'high'],
      default: 'medium',
    },
    size: {
      type: 'select',
      options: ['1024x1024', '1024x1536', '1536x1024'],
      default: '1024x1024',
    },
    background: {
      type: 'select',
      options: ['transparent', 'opaque', 'auto'],
      default: 'auto',
    },
    output_format: {
      type: 'select',
      options: ['png', 'jpeg', 'webp'],
      default: 'png',
    },
    n: {
      type: 'number',
      min: 1,
      max: 10,
      default: 1,
    },
    input_fidelity: {
      type: 'select',
      options: ['low', 'high'],
      default: 'low',
    },
  },
  maxReferenceImages: 16,
  supportsMask: true,
};

/**
 * GPT Image 1 模型能力
 */
const GPTImage1Capabilities: ImageModelCapabilities = {
  features: ['image_generation', 'image_edit', 'mask_edit', 'multi_reference', 'streaming'],
  parameters: {
    quality: {
      type: 'select',
      options: ['low', 'medium', 'high'],
      default: 'medium',
    },
    size: {
      type: 'select',
      options: ['1024x1024', '1024x1536', '1536x1024'],
      default: '1024x1024',
    },
    n: {
      type: 'number',
      min: 1,
      max: 10,
      default: 1,
    },
    input_fidelity: {
      type: 'select',
      options: ['low', 'high'],
      default: 'low',
    },
  },
  maxReferenceImages: 16,
  supportsMask: true,
};

/**
 * GPT Image 1 Mini 模型能力
 */
const GPTImage1MiniCapabilities: ImageModelCapabilities = {
  features: ['image_generation', 'image_edit', 'mask_edit', 'multi_reference', 'streaming'],
  parameters: {
    quality: {
      type: 'select',
      options: ['low', 'medium', 'high'],
      default: 'medium',
    },
    size: {
      type: 'select',
      options: ['1024x1024', '1024x1536', '1536x1024'],
      default: '1024x1024',
    },
    n: {
      type: 'number',
      min: 1,
      max: 10,
      default: 1,
    },
    input_fidelity: {
      type: 'select',
      options: ['low', 'high'],
      default: 'low',
    },
  },
  maxReferenceImages: 16,
  supportsMask: true,
};

/**
 * ChatGPT Image Latest 模型能力 (与 GPT Image 1.5 相同)
 */
const ChatGPTImageLatestCapabilities: ImageModelCapabilities = {
  ...GPTImage15Capabilities,
};

/**
 * OpenAI 图像生成能力配置
 * 仅支持原生 OpenAI Image API 的模型
 */
export const OpenAIImageCapabilities: ProviderImageCapabilities = {
  providerId: 'openai',
  apiType: 'openai-image',
  models: {
    // GPT Image 1.5 系列
    'gpt-image-1.5-2025-12-16': GPTImage15Capabilities,
    'gpt-image-1.5': GPTImage15Capabilities,

    // ChatGPT Image Latest
    'chatgpt-image-latest': ChatGPTImageLatestCapabilities,

    // GPT Image 1 系列
    'gpt-image-1': GPTImage1Capabilities,
    'gpt-image-1-2025-04-23': GPTImage1Capabilities,

    // GPT Image 1 Mini 系列
    'gpt-image-1-mini': GPTImage1MiniCapabilities,
    'gpt-image-1-mini-2025-10-06': GPTImage1MiniCapabilities,
  },
  features: [
    'image_generation',
    'image_edit',
    'mask_edit',
    'multi_reference',
    'streaming',
    'variations',
    'quality_control',
    'background_transparency',
    'output_format_selection',
    'input_fidelity',
  ],
};

/**
 * 获取指定模型的能力配置
 * @param modelId 模型ID
 * @returns 模型能力配置，如果未找到则返回 null
 */
export function getOpenAIImageModelCapabilities(modelId: string): ImageModelCapabilities | null {
  // 精确匹配
  if (OpenAIImageCapabilities.models[modelId]) {
    return OpenAIImageCapabilities.models[modelId];
  }
  
  // 模糊匹配（处理版本号变化）
  for (const [key, capabilities] of Object.entries(OpenAIImageCapabilities.models)) {
    if (modelId.includes(key.replace(/-\d{4}-\d{2}-\d{2}$/, ''))) {
      return capabilities;
    }
  }
  
  return null;
}

/**
 * 检查模型是否支持图像生成
 * @param modelId 模型ID
 * @returns 是否支持
 */
export function isOpenAIImageModel(modelId: string): boolean {
  return getOpenAIImageModelCapabilities(modelId) !== null;
}

/**
 * 检查模型是否支持图像编辑
 * @param modelId 模型ID
 * @returns 是否支持
 */
export function supportsImageEdit(modelId: string): boolean {
  const capabilities = getOpenAIImageModelCapabilities(modelId);
  return capabilities?.features.includes('image_edit') ?? false;
}

/**
 * 检查模型是否支持遮罩编辑
 * @param modelId 模型ID
 * @returns 是否支持
 */
export function supportsMaskEdit(modelId: string): boolean {
  const capabilities = getOpenAIImageModelCapabilities(modelId);
  return capabilities?.supportsMask ?? false;
}

/**
 * 获取模型支持的最大参考图片数量
 * @param modelId 模型ID
 * @returns 最大参考图片数量
 */
export function getMaxReferenceImages(modelId: string): number {
  const capabilities = getOpenAIImageModelCapabilities(modelId);
  return capabilities?.maxReferenceImages ?? 0;
}

export default OpenAIImageCapabilities;
