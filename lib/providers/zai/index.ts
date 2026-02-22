/**
 * ZAI (智谱AI) Provider 统一导出
 */

export { ZaiImageAdapter, createZaiImageAdapter } from './image-adapter';
export { ZaiParameterBuilder } from './parameter-builder';
export { ZaiResponseParser } from './response-parser';
export { ZaiSizeStrategy } from './size-strategy';
export { ZaiAdapter } from './adapter';
export {
  ZAI_MODELS,
  ZAI_SIZE_LIMITS,
  ZAI_PROVIDER_INFO,
  type ZaiImageGenerationBody,
  type ZaiImageGenerationResponse,
  type ZaiImageGenerationRequest,
} from './types';

import { ZaiAdapter } from './adapter';
import { APIAdapter } from '../types';

export function getZaiAdapter(): APIAdapter {
  return new ZaiAdapter();
}
