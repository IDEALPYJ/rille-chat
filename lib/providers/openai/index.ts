/**
 * OpenAI Provider 统一导出
 * 包含聊天适配器和图像生成适配器
 */

// 聊天功能导出
export * from './capabilities';
export * from './translator';
export * from './responses-adapter';
export * from './chat-adapter';
export * from './protocol-bridge';

// 图像生成功能导出
export { OpenAIImageAdapter, createOpenAIImageAdapter } from './image-adapter';
export { OpenAIParameterBuilder } from './parameter-builder';
export { OpenAIResponseParser } from './response-parser';
export { OpenAISizeStrategy } from './size-strategy';
export { OpenAIImageProcessor } from './image-processor';
export {
  OPENAI_MODELS,
  OPENAI_SIZE_LIMITS,
  OPENAI_PROVIDER_INFO,
  type OpenAIImageGenerationBody,
  type OpenAIImageEditBody,
  type OpenAIImageVariationBody,
  type OpenAIImageGenerationResponse,
  type OpenAIImageGenerationRequest,
} from './types';

import { ResponsesAdapter } from './responses-adapter';
import { ChatAdapter } from './chat-adapter';
import { APIAdapter } from '../types';

/**
 * 获取OpenAI API适配器 (聊天功能)
 * @param modelId 模型ID
 * @param forceAPI 强制使用的API类型
 * @returns API适配器实例
 */
export function getOpenAIAdapter(
  modelId: string,
  forceAPI?: 'responses' | 'chat'
): APIAdapter {
  // 优先使用指定的API
  if (forceAPI === 'chat') {
    return new ChatAdapter();
  }

  // 默认使用Responses API
  return new ResponsesAdapter();
}
