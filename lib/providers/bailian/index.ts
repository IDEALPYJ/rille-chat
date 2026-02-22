/**
 * Bailian (阿里云百炼) Provider 统一导出
 */

export { BailianImageAdapter, createBailianImageAdapter } from './image-adapter';
export { BailianParameterBuilder } from './parameter-builder';
export { BailianResponseParser } from './response-parser';
export { BailianSizeStrategy } from './size-strategy';
export { BailianAsyncTaskHandler } from './async-task-handler';
export { BailianAdapter } from './adapter';
export {
  BAILIAN_MODELS,
  BAILIAN_SIZE_LIMITS,
  BAILIAN_PROVIDER_INFO,
  type BailianImageGenerationBody,
  type BailianImageGenerationResponse,
  type BailianAsyncTaskResponse,
  type BailianImageGenerationRequest,
} from './types';

import { BailianAdapter } from './adapter';
import { APIAdapter } from '../types';

export function getBailianAdapter(): APIAdapter {
  return new BailianAdapter();
}
