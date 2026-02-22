/**
 * DashScope (Bailian) 协议桥接
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { BailianAdapter } from './adapter';
import { bailianModelConfigs } from '@/lib/data/models/bailian';
import { logger } from '@/lib/logger';

export class BailianProtocolBridge implements ProtocolAdapter {
    private adapter = new BailianAdapter();

    async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
        const { messages, model, settings, providerConfig, extra, reasoning } = args;

        try {
            // 查找模型配置
            const modelConfig = bailianModelConfigs.find(m => m.id === model);
            if (!modelConfig) {
                logger.warn(`Model config not found for ${model}`);
                yield {
                    type: 'error',
                    message: `Model configuration not found for: ${model}`
                };
                return;
            }

            // 构建翻译器输入
            const translatorInput: TranslatorInput = {
                modelConfig,
                messages,
                userSettings: settings,
                reasoning,
                extra: extra as Record<string, any>
            };

            // 调用适配器
            yield* this.adapter.call(translatorInput, providerConfig);

        } catch (error: any) {
            logger.error('Bailian protocol bridge error', error);
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
