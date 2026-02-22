/**
 * Moonshot Formula 工具管理器
 * 用于获取和调用 Moonshot 官方 Formula 工具（如 web-search）
 */

import { logger } from '@/lib/logger';

/**
 * Formula 工具定义
 */
export interface FormulaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Formula 工具调用结果
 */
export interface FormulaToolResult {
  content: string;
  tool_call_id: string;
  name: string;
}

/**
 * Fiber 响应结构
 */
interface FiberResponse {
  id: string;
  status: 'succeeded' | 'failed' | 'pending';
  context?: {
    input?: string;
    output?: string;
    encrypted_output?: string;
    error?: string;
  };
  error?: string;
}

// Formula URI 映射表
const FORMULA_URI_MAP: Record<string, string> = {
  'web_search': 'moonshot/web-search:latest',
  'web-search': 'moonshot/web-search:latest',
};

/**
 * 获取 Formula 工具声明
 * 
 * @param formulaUri Formula URI (如 moonshot/web-search:latest)
 * @param baseURL API 基础 URL
 * @param apiKey API Key
 * @returns 工具声明列表
 */
export async function getFormulaTools(
  formulaUri: string,
  baseURL: string,
  apiKey: string
): Promise<FormulaTool[]> {
  const url = `${baseURL}/formulas/${formulaUri}/tools`;
  
  logger.info('Fetching formula tools', { formulaUri, url });
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to fetch formula tools', { 
        status: response.status, 
        error: errorText,
        formulaUri 
      });
      throw new Error(`Failed to fetch formula tools: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const tools = data.tools || [];
    
    logger.info('Formula tools fetched', { 
      formulaUri, 
      toolCount: tools.length,
      toolNames: tools.map((t: FormulaTool) => t.function?.name)
    });
    
    return tools;
  } catch (error) {
    logger.error('Error fetching formula tools', error);
    throw error;
  }
}

/**
 * 调用 Formula 工具
 * 
 * @param formulaUri Formula URI
 * @param functionName 函数名
 * @param args 函数参数
 * @param baseURL API 基础 URL
 * @param apiKey API Key
 * @returns 工具执行结果
 */
export async function callFormulaTool(
  formulaUri: string,
  functionName: string,
  args: Record<string, unknown>,
  baseURL: string,
  apiKey: string
): Promise<FormulaToolResult> {
  const url = `${baseURL}/formulas/${formulaUri}/fibers`;
  
  logger.info('Calling formula tool', { 
    formulaUri, 
    functionName, 
    args,
    url 
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: functionName,
        arguments: JSON.stringify(args),
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Formula tool call failed', { 
        status: response.status, 
        error: errorText,
        functionName 
      });
      throw new Error(`Formula tool call failed: ${response.status} ${errorText}`);
    }
    
    const fiber: FiberResponse = await response.json();
    
    logger.info('Formula tool response', { 
      fiberId: fiber.id,
      status: fiber.status,
      hasOutput: !!fiber.context?.output,
      hasEncryptedOutput: !!fiber.context?.encrypted_output,
      hasError: !!fiber.error || !!fiber.context?.error,
    });
    
    // 处理响应
    if (fiber.status === 'succeeded') {
      // 优先使用 encrypted_output（对于 web-search 等 protected 工具）
      const content = fiber.context?.encrypted_output || 
                      fiber.context?.output || 
                      '';
      
      return {
        content,
        tool_call_id: '', // 由调用方设置
        name: functionName,
      };
    }
    
    // 处理错误
    const errorMsg = fiber.error || 
                     fiber.context?.error || 
                     fiber.context?.output || 
                     'Unknown error';
    
    return {
      content: `Error: ${errorMsg}`,
      tool_call_id: '', // 由调用方设置
      name: functionName,
    };
    
  } catch (error) {
    logger.error('Error calling formula tool', error);
    return {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tool_call_id: '',
      name: functionName,
    };
  }
}

/**
 * 根据函数名获取 Formula URI
 * 
 * @param functionName 函数名
 * @returns Formula URI 或 null
 */
export function getFormulaUriByFunctionName(functionName: string): string | null {
  return FORMULA_URI_MAP[functionName] || null;
}

/**
 * 检查是否是 Formula 工具函数
 * 
 * @param functionName 函数名
 * @returns 是否是 Formula 工具
 */
export function isFormulaTool(functionName: string): boolean {
  return !!FORMULA_URI_MAP[functionName];
}

/**
 * 获取 Web Search 工具声明
 * 
 * @param baseURL API 基础 URL
 * @param apiKey API Key
 * @returns Web Search 工具声明
 */
export async function getWebSearchTool(
  baseURL: string,
  apiKey: string
): Promise<FormulaTool[]> {
  return getFormulaTools('moonshot/web-search:latest', baseURL, apiKey);
}

/**
 * 调用 Web Search 工具
 * 
 * @param query 搜索查询
 * @param baseURL API 基础 URL
 * @param apiKey API Key
 * @returns 搜索结果
 */
export async function callWebSearchTool(
  query: string,
  baseURL: string,
  apiKey: string
): Promise<FormulaToolResult> {
  return callFormulaTool(
    'moonshot/web-search:latest',
    'web_search',
    { query },
    baseURL,
    apiKey
  );
}
