/**
 * 协议适配器接口定义
 * 所有协议适配器都应实现此接口
 */

import { ProviderConfig, ReasoningSettings } from '@/lib/types';
import { UnifiedStreamEvent, UnifiedMessage, CommonSettings } from './unified-types';

/**
 * 协议调用参数
 */
export interface BaseCallArgs {
  messages: UnifiedMessage[];
  model: string;
  settings: CommonSettings;
  providerConfig: ProviderConfig;
  providerId?: string; // 服务商ID（用于查询推理配置）
  reasoning?: ReasoningSettings; // 推理强度设置
  extra?: unknown; // 协议特有设置（如 Perplexity 的搜索选项）
}

/**
 * 检查结果
 */
export interface CheckResult {
  success: boolean;
  error?: string;
}

/**
 * 模型信息
 */
export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  created?: number;
  contextLength?: number;
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  supported_parameters?: string[];
  features?: {
    vision?: boolean;
    text?: boolean;
    toolCall?: boolean;
    deepThinking?: boolean;
    webSearch?: boolean;
    imageGeneration?: boolean;
  };
}

/**
 * 协议适配器接口
 * 所有协议适配器都应实现此接口
 */
export interface ProtocolAdapter {
  /**
   * 执行 API 调用并返回统一格式的流
   * @param args 调用参数
   * @returns 统一格式的流事件
   */
  call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent>;

  /**
   * 检查 API 连接是否正常
   * @param config 提供商配置
   * @returns 检查结果
   */
  check(config: ProviderConfig): Promise<CheckResult>;

  /**
   * 列出可用模型
   * @param config 提供商配置
   * @returns 模型列表
   */
  listModels(config: ProviderConfig): Promise<ModelInfo[]>;
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

/**
 * 聊天请求体
 */
export interface ChatRequestBody {
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
