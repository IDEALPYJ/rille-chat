/**
 * Anthropic 协议桥接
 * 实现 ProtocolAdapter，内部委托给 AnthropicAdapter
 */

import { ProviderConfig } from '@/lib/types';
import {
  ProtocolAdapter,
  BaseCallArgs,
  CheckResult,
  ModelInfo,
} from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { AnthropicAdapter } from './adapter';
import { loadModelConfigsForProvider } from '@/lib/data/models';
import { logger } from '@/lib/logger';

export class AnthropicProtocolBridge implements ProtocolAdapter {
  private adapter = new AnthropicAdapter();

  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig, extra, reasoning, providerId } = args;

    try {
      const provider = providerId || 'anthropic';
      const modelConfigs = await loadModelConfigsForProvider(provider);
      const modelConfig = modelConfigs.find((m) => m.id === model);

      if (!modelConfig) {
        logger.warn(`Model config not found for ${model}`);
        yield { type: 'error', message: `Model configuration not found for: ${model}` };
        return;
      }

      const translatorInput: TranslatorInput = {
        modelConfig,
        messages,
        userSettings: settings,
        reasoning,
        extra: extra as Record<string, any>,
      };

      yield* this.adapter.call(translatorInput, providerConfig);
    } catch (error: any) {
      logger.error('Anthropic protocol bridge error', error);
      yield { type: 'error', message: error.message || 'Unknown error', raw: error };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    return this.adapter.check(config);
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    return this.adapter.listModels(config);
  }
}
