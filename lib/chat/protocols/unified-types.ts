/**
 * 统一流式事件类型定义
 * 所有协议适配器在内部将原始流转换为这些统一格式
 */

export interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: { cached_tokens?: number };
  completion_tokens_details?: { reasoning_tokens?: number };
}

/**
 * 统一流式事件类型
 * 所有协议适配器的 call() 方法都应返回此类型的流
 */
export type UnifiedStreamEvent =
  | { type: 'content'; delta: string; role?: 'assistant' | 'user' | 'system' }
  | { type: 'tool_call'; id?: string; nameDelta?: string; argsDelta?: string; index?: number }
  | { type: 'thinking'; delta: string }
  | { type: 'system'; delta: string }
  | { type: 'finish'; reason: string; usage?: StreamUsage; raw?: unknown }
  | { type: 'error'; message: string; raw?: unknown };

/**
 * 统一消息格式（与 OpenAI 接近）
 */
export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  name?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

/**
 * 通用设置类型（统一的参数）
 */
export interface CommonSettings {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  seed?: number;
  stop?: string[];
  context_1m?: string;
  // OpenRouter 等服务商特有的参数
  engine?: string;
  verbosity?: string;
  search_strategy?: number;
  max_results?: number;
  // Perplexity 特有参数
  search_type?: 'fast' | 'pro' | 'auto';
  search_mode?: 'web' | 'academic' | 'sec';
  search_context_size?: 'low' | 'medium' | 'high';
  // Zai 智谱AI 特有参数
  search_engine?: string;
  // Anthropic Claude 特有参数
  inference_geo?: string;
  compaction?: 'enabled' | 'disabled';
  compaction_trigger?: number;
}
