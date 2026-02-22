/**
 * xAI 协议桥接适配器
 * 将新的 Provider 层适配器桥接到旧的 Protocol 接口
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { XAIAdapter } from './adapter';
import { xaiModelConfigs } from '@/lib/data/models/xai';
import { logger } from '@/lib/logger';

/**
 * xAI 协议桥接适配器
 * 实现旧的 ProtocolAdapter 接口，内部使用新的 Provider 层
 */
export class XAIProtocolBridge implements ProtocolAdapter {
  private adapter: XAIAdapter;

  constructor() {
    this.adapter = new XAIAdapter();
  }

  /**
   * 执行 API 调用并返回统一格式的流
   */
  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig, extra, reasoning } = args;

    try {
      // 查找模型配置
      const modelConfig = xaiModelConfigs.find(m => m.id === model);
      if (!modelConfig) {
        logger.warn(`xAI model config not found for ${model}, using default config`);
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

      // 调用 xAI 适配器
      yield* this.adapter.call(translatorInput, providerConfig);

    } catch (error: any) {
      logger.error('xAI protocol bridge error', error);
      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error
      };
    }
  }

  /**
   * 检查 API 连接是否正常
   */
  async check(config: ProviderConfig): Promise<CheckResult> {
    return this.adapter.check(config);
  }

  /**
   * 列出可用模型
   */
  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    return this.adapter.listModels(config);
  }
}
