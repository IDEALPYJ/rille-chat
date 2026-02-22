/**
 * Gemini 服务商导出
 */

export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { GeminiAdapter } from './adapter';
import { APIAdapter } from '../types';

export function getGeminiAdapter(): APIAdapter {
  return new GeminiAdapter();
}
