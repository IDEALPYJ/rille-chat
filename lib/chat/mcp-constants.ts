/**
 * MCP 工具调用常量定义
 * 集中管理 MCP 相关的配置和常量
 */

/**
 * 最大 MCP 工具执行步数
 * 防止无限循环
 */
export const MAX_MCP_TOOL_STEPS = 5;

/**
 * MCP 流事件类型
 */
export const MCP_STREAM_EVENT_TYPES = {
  TOOL_START: 'tool_start',
  TOOL_RESULT: 'tool_result',
} as const;

/**
 * MCP 工具调用状态
 */
export const MCP_TOOL_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

/**
 * MCP 插件配置接口
 */
export interface McpPluginConfig {
  id: string;
  [key: string]: unknown;
}

/**
 * MCP 工具调用信息
 */
export interface McpToolCallInfo {
  toolCallId: string;
  toolName: string;
  status: typeof MCP_TOOL_STATUSES[keyof typeof MCP_TOOL_STATUSES];
  result: unknown;
  arguments?: string;
}

/**
 * MCP 工具调用结果
 */
export interface McpToolCallResult {
  collectedToolCalls: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolResults: Array<{
    role: 'tool';
    content: string;
    tool_call_id: string;
    name?: string;
  }>;
  assistantMessage: string;
  reasoning?: string;
  toolCalls: Array<{
    id: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
  toolCallInfos: McpToolCallInfo[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Usage 累加结果
 */
export interface AccumulatedUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * 累加 usage
 * @param base 基础 usage
 * @param delta 新增的 usage
 * @returns 累加后的 usage
 */
export function accumulateUsage(
  base: AccumulatedUsage,
  delta: Partial<AccumulatedUsage>
): AccumulatedUsage {
  return {
    prompt_tokens: (base.prompt_tokens || 0) + (delta.prompt_tokens || 0),
    completion_tokens: (base.completion_tokens || 0) + (delta.completion_tokens || 0),
    total_tokens: (base.total_tokens || 0) + (delta.total_tokens || 0),
  };
}

/**
 * 创建空的 usage 对象
 */
export function createEmptyMcpUsage(): AccumulatedUsage {
  return {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
}
