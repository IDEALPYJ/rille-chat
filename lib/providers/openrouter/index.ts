/**
 * OpenRouter 服务商导出
 * 导出 OpenRouter 的所有功能模块
 */

export * from './capabilities';
export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { OpenRouterAdapter } from './adapter';
import { APIAdapter } from '../types';

/**
 * 获取 OpenRouter API 适配器
 * @returns API 适配器实例
 */
export function getOpenRouterAdapter(): APIAdapter {
  return new OpenRouterAdapter();
}
