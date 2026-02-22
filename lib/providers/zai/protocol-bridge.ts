/**
 * Zai (智谱AI) 协议桥接
 * 将新的 Provider 层适配器桥接到旧的 Protocol 接口
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { ZaiAdapter } from './adapter';
import { zaiModelConfigs } from '@/lib/data/models/zai';
import { logger } from '@/lib/logger';

export class ZaiProtocolBridge implements ProtocolAdapter {
    private adapter = new ZaiAdapter();

    async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
        const { messages, model, settings, providerConfig, extra, reasoning } = args;

        try {
            // 查找模型配置
            const modelConfig = zaiModelConfigs.find(m => m.id === model);
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
                extra: extra as Record<string, any> | undefined
            };

            // 调用适配器
            yield* this.adapter.call(translatorInput, providerConfig);

        } catch (error: any) {
            logger.error('Zai protocol bridge error', error);
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
