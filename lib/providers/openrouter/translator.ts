/**
 * OpenRouter 参数翻译器
 * 将模型层配置翻译为 OpenRouter Responses API 参数
 */

import {
  TranslatorInput,
  ResponsesAPIParams,
  ResponseInputItem,
  ParameterTranslator
} from '../types';
import { OpenAIResponsesTranslator } from '../openai/translator';
import { logger } from '@/lib/logger';

/**
 * OpenRouter Responses API 参数翻译器
 * 基于 OpenAI Responses API，添加 OpenRouter 特有功能
 */
export class OpenRouterTranslator implements ParameterTranslator<TranslatorInput, ResponsesAPIParams> {
  private baseTranslator: OpenAIResponsesTranslator;

  constructor() {
    this.baseTranslator = new OpenAIResponsesTranslator();
  }

  /**
   * 完整翻译流程
   */
  translate(input: TranslatorInput): ResponsesAPIParams {
    // 使用基础翻译器处理通用参数
    const params = this.baseTranslator.translate(input);

    // OpenRouter 特有处理
    this.translateWebSearch(input, params);
    this.translateProviderRouting(input, params);
    this.translatePlugins(input, params);
    this.translateModelId(input, params);

    logger.info('OpenRouter translation complete', {
      model: params.model,
      hasPlugins: !!params.plugins,
      hasTools: !!params.tools,
      hasReasoning: !!params.reasoning
    });

    return params;
  }

  /**
   * 翻译 Web Search 配置
   * OpenRouter 使用 plugins 参数而非标准 tools
   */
  private translateWebSearch(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.enabledTools || input.enabledTools.length === 0) {
      return;
    }

    // 检查是否启用了 web_search
    if (!input.enabledTools.includes('web_search')) {
      return;
    }

    // 检查模型是否支持 web_search
    if (!input.modelConfig.builtinTools?.includes('web_search')) {
      logger.warn(`Model ${input.modelConfig.id} does not support web_search`);
      return;
    }

    // 初始化 plugins 数组
    if (!params.plugins) {
      params.plugins = [];
    }

    // 检查模型是否有 engine 参数配置
    const hasEngineParam = input.modelConfig.parameters?.some(p => p.id === 'engine');

    // 获取 engine 参数 - 优先从 extra 获取，其次从 userSettings 获取
    // 如果模型没有 engine 参数配置，默认使用 'exa'（因为这类模型不支持 native）
    const engine = input.extra?.engine
      || input.userSettings?.engine
      || (hasEngineParam ? 'native' : 'exa');
    const maxResults = input.extra?.max_results
      || input.userSettings?.max_results
      || 3;

    // 添加 web search plugin
    const webSearchPlugin: any = {
      id: 'web',
      max_results: maxResults,
      engine: engine
    };

    // 添加 search_prompt 如果提供
    if (input.extra?.search_prompt) {
      webSearchPlugin.search_prompt = input.extra.search_prompt;
    }

    params.plugins.push(webSearchPlugin);

    logger.info('Added OpenRouter web search plugin', {
      engine,
      maxResults
    });
  }

  /**
   * 翻译 Provider 路由配置
   * OpenRouter 支持通过 provider 参数指定后端提供商
   */
  private translateProviderRouting(input: TranslatorInput, params: ResponsesAPIParams): void {
    const engine = input.extra?.engine;

    // 如果 engine 不是 native，需要配置 provider 路由
    if (engine && engine !== 'native' && engine !== 'auto') {
      const providerName = this.mapEngineToProvider(engine);

      if (providerName) {
        params.provider = {
          order: [providerName]
        };

        logger.info('Configured OpenRouter provider routing', {
          engine,
          provider: providerName
        });
      }
    }

    // 处理其他 provider 配置
    if (input.extra?.provider) {
      params.provider = {
        ...params.provider,
        ...input.extra.provider
      };
    }
  }

  /**
   * 翻译其他 Plugins
   */
  private translatePlugins(input: TranslatorInput, params: ResponsesAPIParams): void {
    // 处理额外的 plugins
    if (input.extra?.plugins) {
      if (!params.plugins) {
        params.plugins = [];
      }

      for (const plugin of input.extra.plugins) {
        // 避免重复添加 web plugin
        if (plugin.id === 'web' && params.plugins.some((p: any) => p.id === 'web')) {
          continue;
        }
        params.plugins.push(plugin);
      }
    }

    // 处理 auto-router plugin
    if (input.extra?.auto_router !== false) {
      if (!params.plugins) {
        params.plugins = [];
      }

      // 检查是否已存在 auto-router
      if (!params.plugins.some((p: any) => p.id === 'auto-router')) {
        params.plugins.push({
          id: 'auto-router',
          enabled: true
        });
      }
    }
  }

  /**
   * 翻译模型 ID
   * OpenRouter 使用特定的模型 ID 格式
   */
  private translateModelId(input: TranslatorInput, params: ResponsesAPIParams): void {
    // OpenRouter 的模型 ID 已经在 modelConfig.id 中定义
    // 格式如: "openai/gpt-5.2", "anthropic/claude-opus-4.5" 等
    // 不需要额外转换

    // 如果启用了 web_search 且使用 :online 变体
    if (input.enabledTools?.includes('web_search') && input.extra?.use_online_variant) {
      params.model = `${params.model}:online`;
      logger.info('Using online variant for model', { model: params.model });
    }
  }

  /**
   * 将 engine 参数映射到 OpenRouter provider 名称
   */
  private mapEngineToProvider(engine: string): string | null {
    const engineToProvider: Record<string, string> = {
      'exa': 'Exa',
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'mistral': 'Mistral',
      'xai': 'xAI',
      'deepseek': 'DeepSeek',
      'perplexity': 'Perplexity'
    };

    return engineToProvider[engine] || null;
  }

  /**
   * 翻译输入消息 - 重写以支持 OpenRouter 特有格式
   */
  private translateInputMessages(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.messages || input.messages.length === 0) {
      return;
    }

    const inputItems: ResponseInputItem[] = [];

    for (const msg of input.messages) {
      // 系统消息单独处理，放到 instructions 中
      if (msg.role === 'system') {
        if (!params.instructions) {
          params.instructions = '';
        }
        params.instructions += (params.instructions ? '\n\n' : '') +
          (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
        continue;
      }

      // 处理用户和助手消息
      if (msg.role === 'user' || msg.role === 'assistant') {
        const item: ResponseInputItem = {
          role: msg.role,
          content: this.translateMessageContent(msg.content)
        };

        inputItems.push(item);
      }
    }

    if (inputItems.length > 0) {
      params.input = inputItems;
    }
  }

  /**
   * 翻译消息内容
   */
  private translateMessageContent(content: any): any {
    if (typeof content === 'string') {
      return [
        {
          type: 'input_text',
          text: content
        }
      ];
    }

    if (Array.isArray(content)) {
      return content.map(part => {
        if (typeof part === 'string') {
          return { type: 'input_text', text: part };
        }
        if (part.type === 'text') {
          return { type: 'input_text', text: part.text };
        }
        if (part.type === 'image_url') {
          return {
            type: 'input_image',
            image_url: part.image_url?.url || part.image_url,
            detail: part.image_url?.detail || 'auto'
          };
        }
        return part;
      });
    }

    return content;
  }
}

/**
 * 创建 OpenRouter 翻译器实例
 */
export function createOpenRouterTranslator(): OpenRouterTranslator {
  return new OpenRouterTranslator();
}
