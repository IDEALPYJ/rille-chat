/**
 * OpenAI协议桥接适配器
 * 将新的Provider层适配器桥接到旧的Protocol接口
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { TranslatorInput } from '../types';
import { getOpenAIAdapter } from './index';
import { openaiModelConfigs } from '@/lib/data/models/openai';
import { logger } from '@/lib/logger';

/**
 * OpenAI协议桥接适配器
 * 实现旧的ProtocolAdapter接口，内部使用新的Provider层
 */
export class OpenAIProtocolBridge implements ProtocolAdapter {
  /**
   * 执行 API 调用并返回统一格式的流
   */
  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig, extra, reasoning } = args;

    try {
      // 查找模型配置
      const modelConfig = openaiModelConfigs.find(m => m.id === model);
      if (!modelConfig) {
        logger.warn(`Model config not found for ${model}, using default config`);
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

      // 确定使用哪个API
      const forceAPI = (extra as any)?.forceAPI as 'responses' | 'chat' | undefined;
      
      // 获取适配器
      const adapter = getOpenAIAdapter(model, forceAPI);

      // 调用新适配器
      yield* adapter.call(translatorInput, providerConfig);
      
    } catch (error: any) {
      logger.error('OpenAI protocol bridge error', error);
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
    const adapter = getOpenAIAdapter('gpt-4o'); // 使用任意模型进行检查
    return adapter.check(config);
  }

  /**
   * 列出可用模型
   */
  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const adapter = getOpenAIAdapter('gpt-4o');
    return adapter.listModels(config);
  }
}
