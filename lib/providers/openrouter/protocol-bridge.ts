/**
 * OpenRouter 协议桥接
 * 处理旧版协议到新版 Responses API 的转换
 */

import { ModelConfig } from '@/lib/types/model';
import { ChatMessage, ChatRequestBody } from '@/lib/chat/protocols/base-protocol';
import { TranslatorInput } from '../types';
import { logger } from '@/lib/logger';

/**
 * 旧版请求参数
 */
export interface LegacyOpenRouterRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  response_format?: any;
  plugins?: any[];
  provider?: any;
}

/**
 * 协议桥接类
 */
export class OpenRouterProtocolBridge {
  /**
   * 将旧版请求转换为新版 TranslatorInput
   */
  static convertLegacyRequest(
    legacyRequest: LegacyOpenRouterRequest,
    modelConfig: ModelConfig
  ): TranslatorInput {
    logger.info('Converting legacy OpenRouter request', {
      model: legacyRequest.model,
      hasMessages: !!legacyRequest.messages,
      hasTools: !!legacyRequest.tools,
      hasPlugins: !!legacyRequest.plugins
    });

    // 提取用户设置
    const userSettings: Record<string, any> = {};

    if (legacyRequest.temperature !== undefined) {
      userSettings.temperature = legacyRequest.temperature;
    }

    if (legacyRequest.top_p !== undefined) {
      userSettings.top_p = legacyRequest.top_p;
    }

    if (legacyRequest.max_tokens !== undefined) {
      userSettings.max_output_tokens = legacyRequest.max_tokens;
    }

    // 提取额外参数
    const extra: Record<string, any> = {};

    // 处理 tools -> enabledTools
    let enabledTools: string[] | undefined;
    if (legacyRequest.tools && legacyRequest.tools.length > 0) {
      enabledTools = legacyRequest.tools
        .filter((tool: any) => tool.type === 'function')
        .map((tool: any) => tool.name)
        .filter((name: string) => modelConfig.builtinTools?.includes(name));

      // 保留原始 tools 定义
      extra.tools = legacyRequest.tools;
    }

    // 处理 plugins
    if (legacyRequest.plugins && legacyRequest.plugins.length > 0) {
      extra.plugins = legacyRequest.plugins;

      // 检查是否有 web search plugin
      const hasWebSearchPlugin = legacyRequest.plugins.some(
        (p: any) => p.id === 'web'
      );

      if (hasWebSearchPlugin && !enabledTools?.includes('web_search')) {
        enabledTools = enabledTools || [];
        enabledTools.push('web_search');
      }
    }

    // 处理 provider 配置
    if (legacyRequest.provider) {
      extra.provider = legacyRequest.provider;
    }

    // 处理 tool_choice
    if (legacyRequest.tool_choice) {
      extra.tool_choice = legacyRequest.tool_choice;
    }

    // 处理 response_format -> structured_outputs
    let enabledFeatures: string[] | undefined;
    if (legacyRequest.response_format) {
      enabledFeatures = ['structured_outputs'];
      extra.json_schema = legacyRequest.response_format.schema;
      extra.json_mode = legacyRequest.response_format.type === 'json_object';
    }

    const translatorInput: TranslatorInput = {
      modelConfig,
      messages: legacyRequest.messages || [],
      userSettings,
      enabledTools,
      enabledFeatures,
      extra
    };

    return translatorInput;
  }

  /**
   * 从旧版 ChatRequestBody 转换
   */
  static convertFromChatRequestBody(
    body: ChatRequestBody,
    modelConfig: ModelConfig
  ): TranslatorInput {
    const legacyRequest: LegacyOpenRouterRequest = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      top_p: body.top_p,
      max_tokens: body.max_tokens,
      stream: body.stream,
      tools: body.tools,
      tool_choice: body.tool_choice,
      response_format: body.response_format
    };

    return this.convertLegacyRequest(legacyRequest, modelConfig);
  }

  /**
   * 检测请求是否为旧版格式
   */
  static isLegacyRequest(request: any): boolean {
    // 如果请求包含 messages 数组但没有 input 字段，认为是旧版格式
    if (request.messages && !request.input) {
      return true;
    }

    // 如果包含新版特有的字段，认为是新版格式
    if (request.input || request.instructions || request.reasoning) {
      return false;
    }

    return false;
  }

  /**
   * 转换模型 ID 格式
   * OpenRouter 使用 provider/model 格式
   */
  static normalizeModelId(modelId: string): string {
    // 如果已经是正确格式，直接返回
    if (modelId.includes('/')) {
      return modelId;
    }

    // 尝试推断 provider
    const provider = this.inferProviderFromModelId(modelId);
    if (provider) {
      return `${provider}/${modelId}`;
    }

    return modelId;
  }

  /**
   * 从模型 ID 推断 provider
   */
  private static inferProviderFromModelId(modelId: string): string | null {
    const lowerModelId = modelId.toLowerCase();

    if (lowerModelId.startsWith('gpt-') || lowerModelId.startsWith('o1') || lowerModelId.startsWith('o3') || lowerModelId.startsWith('o4')) {
      return 'openai';
    }

    if (lowerModelId.startsWith('claude-')) {
      return 'anthropic';
    }

    if (lowerModelId.startsWith('gemini-')) {
      return 'google';
    }

    if (lowerModelId.startsWith('mistral-') || lowerModelId.startsWith('ministral-')) {
      return 'mistralai';
    }

    if (lowerModelId.startsWith('grok-')) {
      return 'x-ai';
    }

    if (lowerModelId.startsWith('deepseek-')) {
      return 'deepseek';
    }

    if (lowerModelId.startsWith('qwen-') || lowerModelId.startsWith('qwen3-')) {
      return 'qwen';
    }

    if (lowerModelId.startsWith('kimi-')) {
      return 'moonshotai';
    }

    if (lowerModelId.startsWith('glm-')) {
      return 'z-ai';
    }

    if (lowerModelId.startsWith('minimax-')) {
      return 'minimax';
    }

    if (lowerModelId.startsWith('sonar')) {
      return 'perplexity';
    }

    return null;
  }
}

/**
 * 导出便捷函数
 */
export function convertLegacyRequest(
  legacyRequest: LegacyOpenRouterRequest,
  modelConfig: ModelConfig
): TranslatorInput {
  return OpenRouterProtocolBridge.convertLegacyRequest(legacyRequest, modelConfig);
}

export function isLegacyRequest(request: any): boolean {
  return OpenRouterProtocolBridge.isLegacyRequest(request);
}

export function normalizeModelId(modelId: string): string {
  return OpenRouterProtocolBridge.normalizeModelId(modelId);
}
