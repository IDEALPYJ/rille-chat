/**
 * 服务商层通用类型定义
 * 定义参数翻译器、API适配器等的通用接口
 */

import { ModelConfig } from '@/lib/types/model';
import { ProviderConfig } from '@/lib/types';
import { UnifiedStreamEvent, UnifiedMessage, CommonSettings } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo } from '@/lib/chat/protocols/base-protocol';

/**
 * 翻译器输入
 * 包含从上层传递下来的所有配置信息
 */
export interface TranslatorInput {
  /** 模型配置(来自模型层) */
  modelConfig: ModelConfig;

  /** 用户消息 */
  messages: UnifiedMessage[];

  /** 用户设置的参数值 */
  userSettings: CommonSettings;

  /** 启用的工具列表 */
  enabledTools?: string[];

  /** 启用的特性列表 */
  enabledFeatures?: string[];

  /** 推理设置 */
  reasoning?: {
    enabled: boolean;
    effort?: string | number;
    effort_mode?: 'adaptive' | 'effort' | 'budget';
    summary?: string;
  };

  /** 系统指令 */
  instructions?: string;

  /** 额外参数 */
  extra?: Record<string, any>;
}

/**
 * OpenAI Responses API 输入项类型
 */
export interface ResponseInputItem {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'input_text' | 'input_image' | 'input_file';
    text?: string;
    image_url?: string;
    file_id?: string;
    file_url?: string;
  }>;
}

/**
 * OpenAI Responses API 参数
 */
export interface ResponsesAPIParams {
  /** 模型ID */
  model: string;

  /** 输入内容 */
  input?: string | ResponseInputItem[];

  /** 系统指令 */
  instructions?: string;

  /** 深度思考配置 (Volcengine/OpenAI 等) */
  thinking?: {
    type: 'enabled' | 'disabled' | 'auto';
  };

  /** 推理配置 */
  reasoning?: {
    effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
    summary?: 'auto' | 'detailed' | 'concise';
    max_completion_tokens?: number;
  };

  /** 包含的额外数据 */
  include?: string[];

  /** 工具列表 */
  tools?: ToolConfig[];

  /** 工具选择策略 */
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; name: string };

  /** 最大工具调用次数 */
  max_tool_calls?: number;

  /** 是否并行调用工具 */
  parallel_tool_calls?: boolean;

  /** 采样温度 */
  temperature?: number;

  /** 核采样 */
  top_p?: number;

  /** 最大输出token数 */
  max_output_tokens?: number;

  /** 文本输出配置 */
  text?: {
    type?: 'text' | 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      schema: Record<string, any>;
      strict?: boolean;
    };
  };

  /** 是否流式输出 */
  stream?: boolean;

  /** 流式选项 */
  stream_options?: {
    include_usage?: boolean;
  };

  /** 停止词 */
  stop?: string[];

  /** 元数据 */
  metadata?: Record<string, string>;

  /** 是否存储响应 */
  store?: boolean;

  /** 会话ID */
  conversation?: string;

  /** 前一个响应ID */
  previous_response_id?: string;

  /** 提示缓存键 */
  prompt_cache_key?: string;

  /** OpenRouter 插件 */
  plugins?: Array<{ id: string; enabled?: boolean; [key: string]: any }>;

  /** 提示配置 */
  prompt?: {
    id: string;
    variables?: Record<string, any>;
  };

  /** OpenRouter 提供商路由 */
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
}

/**
 * 工具配置
 */
export type ToolConfig = BuiltinToolConfig | FunctionToolConfig | MCPToolConfig;

/**
 * 内置工具配置
 */
export interface BuiltinToolConfig {
  type: 'web_search' | 'code_interpreter' | 'image_generation' | 'file_search' | 'computer' | 'apply_patch' | 'shell' | 'x_search';

  /** Web搜索选项 */
  user_location?: {
    type: 'approximate';
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  filters?: {
    allowed_domains?: string[];
  };
  external_web_access?: boolean;

  /** 代码解释器选项 */
  container?: {
    type: 'auto' | string;
    memory_limit?: '1g' | '2g' | '4g' | '8g';
    file_ids?: string[];
  };

  /** 文件搜索选项 */
  vector_store_ids?: string[];
}

/**
 * 函数工具配置
 */
export interface FunctionToolConfig {
  type: 'function';
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  strict?: boolean;
}

/**
 * MCP工具配置
 */
export interface MCPToolConfig {
  type: 'mcp';
  server_label: string;
  server_description?: string;
  server_url: string;
  require_approval?: 'always' | 'never';
}

/**
 * API适配器接口
 */
export interface APIAdapter {
  /**
   * 执行API调用
   */
  call(params: any, providerConfig: ProviderConfig): AsyncIterable<UnifiedStreamEvent>;

  /**
   * 健康检查
   */
  check(config: ProviderConfig): Promise<CheckResult>;

  /**
   * 列出模型
   */
  listModels(config: ProviderConfig): Promise<ModelInfo[]>;
}

/**
 * 参数翻译器接口
 */
export interface ParameterTranslator<TInput = TranslatorInput, TOutput = any> {
  /**
   * 翻译参数
   */
  translate(input: TInput): TOutput;
}

/**
 * 能力定义接口
 */
export interface ProviderCapabilities {
  /** API类型 */
  apiType: string;

  /** 支持的参数 */
  parameters: Record<string, ParameterDefinition>;

  /** 支持的内置工具 */
  builtinTools: Record<string, BuiltinToolDefinition>;

  /** 支持的特性 */
  features: string[];

  /** 参数冲突规则 */
  parameterConflictRules?: ParameterConflictRules;
}

/**
 * 参数冲突规则
 * 定义当满足某些条件时，哪些参数应该被隐藏或禁用
 */
export interface ParameterConflictRules {
  [key: string]: {
    /** 触发条件: { 参数名: 参数值 } */
    when: Record<string, any>;

    /** 需要隐藏的参数列表 */
    hide: string[];
  }[];
}

/**
 * 参数定义
 */
export interface ParameterDefinition {
  type: string;
  required?: boolean;
  range?: [number, number];
  enum?: string[];
  properties?: Record<string, ParameterDefinition>;
  description?: string;
}

/**
 * 内置工具定义
 */
export interface BuiltinToolDefinition {
  apiFormat: Record<string, any>;
  options?: string[];
  description?: string;
}
