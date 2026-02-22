/**
 * Perplexity 服务商导出
 * 导出 Perplexity 的所有功能模块
 */

export * from './capabilities';
export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { PerplexityAdapter } from './adapter';
import { APIAdapter } from '../types';

/**
 * 获取 Perplexity API 适配器
 * @returns API 适配器实例
 */
export function getPerplexityAdapter(): APIAdapter {
  return new PerplexityAdapter();
}
