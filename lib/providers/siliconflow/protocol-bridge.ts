/**
 * SiliconFlow 协议桥接适配器
 * 将新的 Provider 层适配器桥接到旧的 Protocol 接口
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { SiliconFlowAdapter } from './adapter';
import { siliconflowModelConfigs } from '@/lib/data/models/siliconflow';
import { logger } from '@/lib/logger';

export class SiliconFlowProtocolBridge implements ProtocolAdapter {
  private adapter: SiliconFlowAdapter;

  constructor() {
    this.adapter = new SiliconFlowAdapter();
  }

  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig, extra, reasoning } = args;

    try {
      const modelConfig = siliconflowModelConfigs.find(m => m.id === model);
      if (!modelConfig) {
        logger.warn(`Model config not found for ${model}, using default config`);
        yield {
          type: 'error',
          message: `Model configuration not found for: ${model}`
        };
        return;
      }

      const translatorInput: TranslatorInput = {
        modelConfig,
        messages,
        userSettings: settings,
        reasoning,
        extra: extra as Record<string, any> | undefined
      };

      yield* this.adapter.call(translatorInput, providerConfig);

    } catch (error: any) {
      logger.error('SiliconFlow protocol bridge error', error);
      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error
      };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    return this.adapter.check(config);
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    return this.adapter.listModels(config);
  }
}
