/**
 * SiliconFlow 服务商导出
 * 导出 SiliconFlow 的所有功能模块
 */

export * from './capabilities';
export * from './translator';
export * from './adapter';
export * from './protocol-bridge';

import { SiliconFlowAdapter } from './adapter';
import { APIAdapter } from '../types';

export function getSiliconFlowAdapter(): APIAdapter {
  return new SiliconFlowAdapter();
}
