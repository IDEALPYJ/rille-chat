/**
 * xAI 服务商导出
 * 导出 xAI 的所有功能模块
 */

export * from './capabilities';
export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { XAIAdapter } from './adapter';
import { APIAdapter } from '../types';

/**
 * 获取 xAI API 适配器
 * @returns API 适配器实例
 */
export function getXAIAdapter(): APIAdapter {
  return new XAIAdapter();
}
