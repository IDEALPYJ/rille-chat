/**
 * Chat Completions API 工具执行模块
 * 负责处理工具调用的执行逻辑
 */

import { logger } from '@/lib/logger';
import { UserSettings } from '@/lib/types';
import { performWebSearch } from '@/lib/chat/search-helper';
import {
  isFormulaTool,
  getFormulaUriByFunctionName,
  callFormulaTool,
} from '@/lib/providers/moonshot/formula-tools';

/**
 * 工具调用参数
 */
interface ToolCallFunction {
  name: string;
  arguments: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: ToolCallFunction;
}

/**
 * 工具执行结果
 */
interface ToolExecutionResult {
  content: string;
  tool_call_id: string;
  name?: string;
}

/**
 * 工具执行上下文
 */
interface ToolExecutionContext {
  isMoonshot: boolean;
  baseURL?: string;
  apiKey?: string;
  settings?: UserSettings;
}

/**
 * 执行工具调用
 * 支持 Moonshot Formula 工具和 builtin_function
 * 
 * @param toolCall 工具调用对象
 * @param context 执行上下文
 * @returns 工具执行结果
 */
export async function executeToolCall(
  toolCall: ToolCall,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const functionName = toolCall.function.name;
  const functionArgs = toolCall.function.arguments;
  const { isMoonshot, baseURL, apiKey } = context;

  try {
    const args = JSON.parse(functionArgs);

    // 检查是否是 Moonshot Formula 工具
    if (isMoonshot && isFormulaTool(functionName) && baseURL && apiKey) {
      logger.info('Executing Moonshot Formula tool', { name: functionName, args });
      
      const formulaUri = getFormulaUriByFunctionName(functionName);
      if (!formulaUri) {
        return {
          content: JSON.stringify({ error: `Unknown formula tool: ${functionName}` }),
          tool_call_id: toolCall.id,
          name: functionName,
        };
      }

      const result = await callFormulaTool(
        formulaUri,
        functionName,
        args,
        baseURL,
        apiKey
      );

      // 设置 tool_call_id
      return {
        ...result,
        tool_call_id: toolCall.id,
      };
    }

    // Moonshot内置函数处理（旧方式，保留兼容）
    if (isMoonshot && functionName.startsWith('$')) {
      logger.info('Executing Moonshot builtin function', { name: functionName, args });

      // $web_search: 原封不动返回参数，让 Moonshot 服务端处理搜索
      // 根据 Moonshot 文档，需要将 tool_call.function.arguments 原封不动地返回
      if (functionName === '$web_search') {
        return {
          content: JSON.stringify(args),
          tool_call_id: toolCall.id,
          name: functionName,
        };
      }

      // 其他内置函数：返回参数
      return {
        content: JSON.stringify(args),
        tool_call_id: toolCall.id,
        name: functionName,
      };
    }

    // web_search 工具：调用外部搜索服务
    if (functionName === 'web_search' && context.settings) {
      logger.info('Executing web_search tool', { args });

      try {
        const query = args.query;
        if (!query || typeof query !== 'string') {
          return {
            content: JSON.stringify({ error: 'Missing or invalid query parameter' }),
            tool_call_id: toolCall.id,
            name: functionName,
          };
        }

        const searchResult = await performWebSearch(query, context.settings);

        if (searchResult) {
          return {
            content: JSON.stringify({
              success: true,
              results: JSON.parse(searchResult.searchResults),
              context: searchResult.searchPrompt
            }),
            tool_call_id: toolCall.id,
            name: functionName,
          };
        } else {
          return {
            content: JSON.stringify({ error: 'Search failed or no results found' }),
            tool_call_id: toolCall.id,
            name: functionName,
          };
        }
      } catch (error) {
        logger.error('web_search tool execution failed', error);
        return {
          content: JSON.stringify({ error: 'Search execution failed' }),
          tool_call_id: toolCall.id,
          name: functionName,
        };
      }
    }

    // 其他工具调用可以在这里扩展
    logger.warn('Unknown tool call', { name: functionName });
    return {
      content: JSON.stringify({ error: 'Tool not implemented' }),
      tool_call_id: toolCall.id,
      name: functionName,
    };

  } catch (e) {
    logger.error('Failed to parse tool call arguments', e);
    return {
      content: JSON.stringify({ error: 'Invalid arguments' }),
      tool_call_id: toolCall.id,
      name: functionName,
    };
  }
}

/**
 * 批量执行工具调用
 * 
 * @param toolCalls 工具调用列表
 * @param context 执行上下文
 * @returns 工具执行结果列表
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: ToolExecutionContext
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall, context);
    results.push(result);
  }

  return results;
}

/**
 * 检查是否包含 Moonshot 内置函数
 * 
 * @param toolCalls 工具调用列表
 * @returns 是否包含内置函数
 */
export function hasBuiltinFunction(toolCalls: ToolCall[]): boolean {
  return toolCalls.some(t => t.function?.name?.startsWith('$'));
}

/**
 * 检查是否包含 Formula 工具
 * 
 * @param toolCalls 工具调用列表
 * @returns 是否包含 Formula 工具
 */
export function hasFormulaTool(toolCalls: ToolCall[]): boolean {
  return toolCalls.some(t => isFormulaTool(t.function?.name));
}

export type { ToolCall, ToolExecutionResult, ToolExecutionContext };
