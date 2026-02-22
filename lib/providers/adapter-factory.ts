/**
 * Provider适配器工厂
 * 根据服务商ID获取对应的适配器
 */

import { APIAdapter } from './types';
import { getOpenAIAdapter } from './openai';
import { getBailianAdapter } from './bailian';
import { getAnthropicAdapter } from './anthropic';
import { getGeminiAdapter } from './gemini';
import { getOpenRouterAdapter } from './openrouter';
import { getPerplexityAdapter } from './perplexity';
import { getXAIAdapter } from './xai';
import { getZaiAdapter } from './zai';
import { getPreferredAPIForProvider } from '@/lib/chat/protocol-config';

/**
 * 获取服务商的API适配器
 * @param providerId 服务商ID
 * @param modelId 模型ID
 * @param forceAPI 强制使用的API类型
 * @returns API适配器实例
 */
export function getProviderAdapter(
  providerId: string,
  modelId: string,
  forceAPI?: 'responses' | 'chat'
): APIAdapter {
  switch (providerId) {
    case 'openai':
    case 'deepseek':
    case 'mistral':
    case 'volcengine':
    case 'moonshot':
    case 'siliconflow':
      return getOpenAIAdapter(modelId, forceAPI ?? getPreferredAPIForProvider(providerId));

    case 'zai':
      return getZaiAdapter();

    case 'xai':
      // xAI 使用专用的 Responses API 适配器
      return getXAIAdapter();

    case 'openrouter':
      // OpenRouter 使用专用的 Responses API 适配器
      return getOpenRouterAdapter();

    case 'bailian':
      return getBailianAdapter();

    case 'anthropic':
    case 'minimax':
      return getAnthropicAdapter();

    case 'google':
      return getGeminiAdapter();

    case 'perplexity':
      return getPerplexityAdapter();

    default:
      // 降级：对于未知的服务商，尝试使用OpenAI适配器
      // 这允许OpenAI兼容的API使用相同的适配器
      return getOpenAIAdapter(modelId, forceAPI);
  }
}
