/**
 * Anthropic 服务商导出
 */

export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { AnthropicAdapter } from './adapter';
import { APIAdapter } from '../types';

export function getAnthropicAdapter(): APIAdapter {
  return new AnthropicAdapter();
}
