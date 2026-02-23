import { NextRequest } from "next/server";
import { createErrorResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import https from "https";

// 最大执行时间
export const maxDuration = 60;

// MCP插件配置接口
interface McpPluginConfig {
  id: string;
  name: string;
  serverUrl: string;
  authType: string;
  apiKey: string | null;
  advancedConfig: {
    keyValuePairs?: Record<string, string>;
    ignoreSSL?: boolean;
  };
}

// 工具调用信息接口
interface ToolCallInfo {
  toolCallId: string;
  pluginId: string;
  pluginName: string;
  pluginIcon: string | null;
  toolName: string;
  arguments: Record<string, unknown>;
  result: unknown;
  error?: string;
  duration?: number;
  status: 'pending' | 'completed' | 'error';
}

// 调试信息接口
interface DebugInfo {
  request: {
    url: string;
    model: string;
    messages: any[];
    tools?: any[];
    timestamp: string;
  };
  response: {
    chunks: any[];
    toolCalls: ToolCallInfo[];
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    duration: number;
  };
  errors: string[];
}

// OpenAI 兼容格式工具定义
interface OpenAITool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * 调用MCP工具
 */
async function callMcpTool(
  plugin: McpPluginConfig,
  toolName: string,
  arguments_: Record<string, any>
): Promise<any> {
  let client: Client | null = null;
  let transport: SSEClientTransport | null = null;

  try {
    // 构建SSE端点URL
    let sseUrl = plugin.serverUrl;
    if (!sseUrl.endsWith("/sse")) {
      sseUrl = sseUrl.endsWith("/") ? `${sseUrl}sse` : `${sseUrl}/sse`;
    }

    const url = new URL(sseUrl);

    // 准备请求头
    const headers: Record<string, string> = {
      ...(plugin.authType === "apiKey" && plugin.apiKey
        ? { Authorization: `Bearer ${plugin.apiKey}` }
        : {}),
      ...(plugin.advancedConfig.keyValuePairs || {}),
    };

    // 创建SSE传输
    const transportOptions: any = {};

    // 创建自定义fetch函数来添加headers
    const customFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const mergedHeaders: Record<string, string> = {
        ...((init?.headers as Record<string, string>) || {}),
        ...headers,
      };

      return fetch(input, {
        ...init,
        headers: mergedHeaders,
      });
    };

    transportOptions.eventSourceInit = {
      fetch: customFetch,
    };

    // 如果忽略SSL证书验证
    // SECURITY WARNING: Only use ignoreSSL in development/testing environments.
    // Disabling SSL verification in production can lead to man-in-the-middle attacks.
    if (plugin.advancedConfig.ignoreSSL && url.protocol === "https:") {
      console.warn('[Security Warning] SSL certificate validation is disabled. This should only be used in development/testing environments.');
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      transportOptions.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        const urlObj =
          typeof input === "string"
            ? new URL(input)
            : input instanceof URL
            ? input
            : new URL(input.toString());

        const mergedHeaders: Record<string, string> = {
          ...((init?.headers as Record<string, string>) || {}),
          ...headers,
        };

        if (urlObj.protocol === "https:") {
          return new Promise((resolve, reject) => {
            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: init?.method || "GET",
              headers: mergedHeaders,
              agent: httpsAgent,
            };

            const req = https.request(options, (res) => {
              const chunks: Buffer[] = [];
              res.on("data", (chunk) => chunks.push(chunk));
              res.on("end", () => {
                const body = Buffer.concat(chunks).toString();
                const response = new Response(body, {
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || "OK",
                  headers: res.headers as HeadersInit,
                });
                resolve(response);
              });
            });

            req.on("error", reject);

            if (init?.body) {
              req.write(init.body);
            }

            req.end();
          });
        } else {
          return fetch(input, { ...init, headers: mergedHeaders });
        }
      };
    }

    transport = new SSEClientTransport(url, transportOptions);

    // 创建MCP客户端
    client = new Client(
      {
        name: "rille-chat-test",
        version: "1.0.0",
      },
      {
        capabilities: {
          sampling: {},
        },
      }
    );

    // 连接到服务器
    await client.connect(transport);

    // 调用工具
    const toolTimeout = 25000;

    const toolCallPromise = client.callTool({
      name: toolName,
      arguments: arguments_,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `工具调用超时（${toolTimeout / 1000}秒）`
          )
        );
      }, toolTimeout);

      toolCallPromise.finally(() => clearTimeout(timeoutId));
    });

    const result = await Promise.race([toolCallPromise, timeoutPromise]);

    // 处理结果
    if (result && Array.isArray(result.content)) {
      const textContents = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n");

      if (textContents) {
        return textContents;
      }

      const jsonContents = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => {
          try {
            return JSON.parse(item.text);
          } catch {
            return item.text;
          }
        });

      return jsonContents.length === 1 ? jsonContents[0] : jsonContents;
    }

    return result;
  } catch (error: any) {
    logger.error("Failed to call MCP tool", error, { pluginId: plugin.id, toolName });
    throw new Error(`MCP tool call failed: ${error.message || error.toString()}`);
  } finally {
    try {
      if (client) {
        await client.close();
      }
      if (transport) {
        await transport.close();
      }
    } catch (closeError) {
      logger.warn("Failed to close MCP client connection", { error: closeError });
    }
  }
}

/**
 * 从MCP服务器获取工具列表
 */
async function getMcpTools(plugin: McpPluginConfig): Promise<any[]> {
  let client: Client | null = null;
  let transport: SSEClientTransport | null = null;

  try {
    let sseUrl = plugin.serverUrl;
    if (!sseUrl.endsWith("/sse")) {
      sseUrl = sseUrl.endsWith("/") ? `${sseUrl}sse` : `${sseUrl}/sse`;
    }

    const url = new URL(sseUrl);

    const headers: Record<string, string> = {
      ...(plugin.authType === "apiKey" && plugin.apiKey
        ? { Authorization: `Bearer ${plugin.apiKey}` }
        : {}),
      ...(plugin.advancedConfig.keyValuePairs || {}),
    };

    const transportOptions: any = {};

    const customFetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const mergedHeaders: Record<string, string> = {
        ...((init?.headers as Record<string, string>) || {}),
        ...headers,
      };

      return fetch(input, {
        ...init,
        headers: mergedHeaders,
      });
    };

    transportOptions.eventSourceInit = {
      fetch: customFetch,
    };

    // SECURITY WARNING: Only use ignoreSSL in development/testing environments.
    // Disabling SSL verification in production can lead to man-in-the-middle attacks.
    if (plugin.advancedConfig.ignoreSSL && url.protocol === "https:") {
      console.warn('[Security Warning] SSL certificate validation is disabled. This should only be used in development/testing environments.');
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      transportOptions.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        const urlObj =
          typeof input === "string"
            ? new URL(input)
            : input instanceof URL
            ? input
            : new URL(input.toString());

        const mergedHeaders: Record<string, string> = {
          ...((init?.headers as Record<string, string>) || {}),
          ...headers,
        };

        if (urlObj.protocol === "https:") {
          return new Promise((resolve, reject) => {
            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: init?.method || "GET",
              headers: mergedHeaders,
              agent: httpsAgent,
            };

            const req = https.request(options, (res) => {
              const chunks: Buffer[] = [];
              res.on("data", (chunk) => chunks.push(chunk));
              res.on("end", () => {
                const body = Buffer.concat(chunks).toString();
                const response = new Response(body, {
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || "OK",
                  headers: res.headers as HeadersInit,
                });
                resolve(response);
              });
            });

            req.on("error", reject);

            if (init?.body) {
              req.write(init.body);
            }

            req.end();
          });
        } else {
          return fetch(input, { ...init, headers: mergedHeaders });
        }
      };
    }

    transport = new SSEClientTransport(url, transportOptions);

    client = new Client(
      {
        name: "rille-chat-test",
        version: "1.0.0",
      },
      {
        capabilities: {
          sampling: {},
        },
      }
    );

    await client.connect(transport);
    const toolsResult = await client.listTools();

    return toolsResult.tools || [];
  } catch (error: any) {
    logger.warn("Failed to get MCP tools", { pluginId: plugin.id, error: error.message });
    return [];
  } finally {
    try {
      if (client) {
        await client.close();
      }
      if (transport) {
        await transport.close();
      }
    } catch (closeError) {
      logger.warn("Failed to close MCP client connection", { error: closeError });
    }
  }
}

/**
 * 将MCP插件转换为OpenAI兼容格式工具定义
 */
async function convertMcpPluginsToTools(
  plugins: McpPluginConfig[]
): Promise<OpenAITool[]> {
  const tools: OpenAITool[] = [];

  for (const plugin of plugins) {
    try {
      const mcpTools = await getMcpTools(plugin);

      if (mcpTools.length > 0) {
        const pluginPrefix = plugin.name.replace(/\s+/g, "_").substring(0, 8).toLowerCase();
        for (const mcpTool of mcpTools) {
          tools.push({
            type: "function",
            function: {
              name: `${pluginPrefix}_${mcpTool.name}`,
              description: `[${plugin.name}] ${mcpTool.description || `调用 ${mcpTool.name} 工具`}`,
              parameters: mcpTool.inputSchema || {
                type: "object",
                properties: {},
                required: [],
              },
            },
          });
        }
      }
    } catch (error) {
      logger.error("Failed to convert MCP plugin to tools", error, { pluginId: plugin.id });
    }
  }

  return tools;
}

/**
 * 安全地解析JSON参数
 */
function safeParseArguments(argsStr: string): { args: Record<string, unknown>; isComplete: boolean } {
  if (!argsStr || !argsStr.trim()) {
    return { args: {}, isComplete: true };
  }

  // 清理字符串
  let fixedStr = argsStr.trim();
  
  // 移除可能的尾部逗号
  fixedStr = fixedStr.replace(/,\s*$/, '');

  try {
    const args = JSON.parse(fixedStr);
    return { args, isComplete: true };
  } catch {
    // 尝试修复不完整的JSON
    const openBraces = (fixedStr.match(/\{/g) || []).length;
    const closeBraces = (fixedStr.match(/\}/g) || []).length;
    const openBrackets = (fixedStr.match(/\[/g) || []).length;
    const closeBrackets = (fixedStr.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) fixedStr += "}";
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixedStr += "]";

    if (/"[^"]*"\s*$/.test(fixedStr)) fixedStr += ': null';
    fixedStr = fixedStr.replace(/[,:\s]+$/, "");
    if (!fixedStr.endsWith("}")) fixedStr += "}";

    try {
      const args = JSON.parse(fixedStr);
      return { args, isComplete: false };
    } catch {
      try {
        const keyValuePattern = /"([^"]+)"\s*:\s*([^,\}]+)/g;
        const matches = [...fixedStr.matchAll(keyValuePattern)];
        const extractedArgs: Record<string, unknown> = {};

        for (const match of matches) {
          const key = match[1];
          const valueStr = match[2].trim();
          try {
            if (valueStr === 'true') extractedArgs[key] = true;
            else if (valueStr === 'false') extractedArgs[key] = false;
            else if (valueStr === 'null') extractedArgs[key] = null;
            else if (/^-?\d+$/.test(valueStr)) extractedArgs[key] = parseInt(valueStr, 10);
            else if (/^-?\d+\.\d+$/.test(valueStr)) extractedArgs[key] = parseFloat(valueStr);
            else if (valueStr.startsWith('"') && valueStr.endsWith('"')) extractedArgs[key] = valueStr.slice(1, -1);
            else extractedArgs[key] = valueStr;
          } catch {
            extractedArgs[key] = valueStr;
          }
        }
        if (Object.keys(extractedArgs).length > 0) return { args: extractedArgs, isComplete: false };
      } catch {}
      return { args: {}, isComplete: false };
    }
  }
}

/**
 * 处理工具调用
 */
async function handleToolCalls(
  toolCalls: any[],
  plugins: McpPluginConfig[]
): Promise<{ toolResults: any[]; toolCallInfos: ToolCallInfo[] }> {
  const toolResults: any[] = [];
  const toolCallInfos: ToolCallInfo[] = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function?.name || "";
    const argsStr = toolCall.function?.arguments || "";
    const { args: functionArgs, isComplete } = safeParseArguments(argsStr);

    if (!isComplete) {
      logger.warn("Tool call arguments may be incomplete", {
        toolName: functionName,
        originalArgs: argsStr,
        parsedArgs: functionArgs,
      });
    }

    let targetPlugin: McpPluginConfig | undefined;
    let targetToolName: string = functionName;

    for (const plugin of plugins) {
      const pluginPrefix = plugin.name.replace(/\s+/g, "_").substring(0, 8).toLowerCase();
      if (functionName.startsWith(`${pluginPrefix}_`)) {
        targetPlugin = plugin;
        targetToolName = functionName.replace(`${pluginPrefix}_`, "");
        break;
      }
    }

    const toolCallInfo: ToolCallInfo = {
      toolCallId: toolCall.id,
      pluginId: targetPlugin?.id || "unknown",
      pluginName: targetPlugin?.name || "unknown",
      pluginIcon: null,
      toolName: functionName,
      arguments: functionArgs,
      result: null,
      status: "pending",
    };

    const startTime = Date.now();

    try {
      if (!targetPlugin) throw new Error(`未找到对应插件: ${functionName}`);
      const result = await callMcpTool(targetPlugin, targetToolName, functionArgs);
      const duration = Date.now() - startTime;

      toolCallInfo.result = result;
      toolCallInfo.duration = duration;
      toolCallInfo.status = "completed";

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      toolCallInfo.error = error.message;
      toolCallInfo.duration = duration;
      toolCallInfo.status = "error";

      toolResults.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `错误: ${error.message}`,
      });
    }

    toolCallInfos.push(toolCallInfo);
  }

  return { toolResults, toolCallInfos };
}

// POST - 处理对话请求
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      messages,
      model,
      apiKey,
      baseURL,
      mcpPlugins,
      temperature,
      topP,
      maxTokens,
      enableThinking,
    } = body;

    // 验证必要参数
    if (!apiKey) {
      return createErrorResponse("API Key不能为空", 400, "MISSING_API_KEY");
    }
    if (!model) {
      return createErrorResponse("模型不能为空", 400, "MISSING_MODEL");
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse("消息不能为空", 400, "MISSING_MESSAGES");
    }

    // 使用 OpenAI 兼容接口
    const finalBaseURL = (baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace('/api/v1', '/compatible-mode/v1');
    const url = `${finalBaseURL}/chat/completions`;

    // 准备MCP工具
    let tools: OpenAITool[] = [];
    if (mcpPlugins && mcpPlugins.length > 0) {
      tools = await convertMcpPluginsToTools(mcpPlugins);
    }

    // 构建调试信息
    const debugInfo: DebugInfo = {
      request: {
        url,
        model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        timestamp: new Date().toISOString(),
      },
      response: {
        chunks: [],
        toolCalls: [],
        duration: 0,
      },
      errors: [],
    };

    // 构建请求体（OpenAI 兼容格式）
    const requestBody: any = {
      model,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      ...(temperature !== undefined && { temperature }),
      ...(topP !== undefined && { top_p: topP }),
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
    };

    // 添加工具
    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    // 添加深度思考参数（通过 extra_body）
    if (enableThinking !== undefined) {
      requestBody.extra_body = {
        enable_thinking: enableThinking
      };
    }

    // 创建流
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送调试信息（请求部分）
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "debug",
                debug: { request: debugInfo.request },
              })}\n\n`
            )
          );

          const currentMessages = [...messages];
          let step = 0;
          const maxSteps = 5;
          let totalUsage: any = null;

          while (step < maxSteps) {
            // 更新请求体中的消息
            requestBody.messages = currentMessages.map((m: any) => ({
              role: m.role,
              content: m.content,
              ...(m.tool_calls && { tool_calls: m.tool_calls }),
              ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
            }));

            // 调用 OpenAI 兼容接口
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
              throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let assistantMessage = "";
            let reasoningContent = "";
            let hasToolCalls = false;
            const toolCalls: any[] = [];
            const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>();
            let finishReason: string | null = null;

            // 处理流式响应
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                if (trimmedLine.startsWith('data:')) {
                  const dataStr = trimmedLine.slice(5).trim();

                  try {
                    const data = JSON.parse(dataStr);

                    // 处理错误
                    if (data.error) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: "error",
                            error: data.error.message || 'API error',
                          })}\n\n`
                        )
                      );
                      continue;
                    }

                    // 收集usage信息
                    if (data.usage) {
                      totalUsage = {
                        prompt_tokens: data.usage.prompt_tokens || 0,
                        completion_tokens: data.usage.completion_tokens || 0,
                        total_tokens: data.usage.total_tokens || 0,
                      };
                    }

                    // 处理内容
                    const choice = data.choices?.[0];
                    if (choice) {
                      const delta = choice.delta;

                      // 处理思考过程 (reasoning_content)
                      if (delta?.reasoning_content) {
                        const reasoningDelta = delta.reasoning_content;
                        reasoningContent += reasoningDelta;
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              type: "reasoning",
                              content: reasoningDelta,
                            })}\n\n`
                          )
                        );
                      }

                      // 处理普通内容 (content)
                      if (delta?.content) {
                        const contentDelta = delta.content;
                        assistantMessage += contentDelta;
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              type: "content",
                              content: contentDelta,
                            })}\n\n`
                          )
                        );
                      }

                      // 处理工具调用 (tool_calls) - 流式增量格式
                      if (delta?.tool_calls) {
                        hasToolCalls = true;
                        for (const toolCall of delta.tool_calls) {
                          const index = toolCall.index ?? 0;
                          
                          // 获取或创建累积器
                          if (!toolCallAccumulators.has(index)) {
                            toolCallAccumulators.set(index, { id: toolCall.id || `call_${index}`, name: '', arguments: '' });
                          }
                          const accumulator = toolCallAccumulators.get(index)!;
                          
                          // 累积参数
                          if (toolCall.id) accumulator.id = toolCall.id;
                          if (toolCall.function?.name) accumulator.name += toolCall.function.name;
                          if (toolCall.function?.arguments) accumulator.arguments += toolCall.function.arguments;
                          
                          // 发送工具调用事件（增量）
                          controller.enqueue(
                            encoder.encode(
                              `data: ${JSON.stringify({
                                type: "tool_call",
                                id: accumulator.id,
                                nameDelta: toolCall.function?.name || "",
                                argsDelta: toolCall.function?.arguments || "",
                                index: index,
                              })}\n\n`
                            )
                          );
                        }
                      }

                      // 处理完成原因
                      if (choice.finish_reason) {
                        finishReason = choice.finish_reason;
                        
                        // 如果工具调用完成，收集完整的工具调用
                        if (finishReason === 'tool_calls' && toolCallAccumulators.size > 0) {
                          for (const [, accumulator] of toolCallAccumulators) {
                            toolCalls.push({
                              id: accumulator.id,
                              type: "function",
                              function: {
                                name: accumulator.name,
                                arguments: accumulator.arguments,
                              },
                            });
                          }
                        }
                        
                        controller.enqueue(
                          encoder.encode(
                            `data: ${JSON.stringify({
                              type: "finish",
                              reason: choice.finish_reason,
                              usage: totalUsage,
                            })}\n\n`
                          )
                        );
                      }
                    }
                  } catch (e) {
                    logger.error('Failed to parse OpenAI SSE data', { line: trimmedLine, error: e });
                  }
                }
              }
            }

            // 如果没有工具调用或完成原因不是 tool_calls，结束循环
            if (!hasToolCalls || toolCalls.length === 0 || finishReason !== 'tool_calls') {
              break;
            }

            // 发送工具调用开始信息
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_calls_start",
                  toolCalls: toolCalls.map((tc) => ({
                    id: tc.id,
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                  })),
                })}\n\n`
              )
            );

            // 处理工具调用
            const { toolResults, toolCallInfos } = await handleToolCalls(
              toolCalls,
              mcpPlugins || []
            );

            // 更新调试信息
            debugInfo.response.toolCalls.push(...toolCallInfos);

            // 发送工具调用结果
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "tool_results",
                  toolCalls: toolCallInfos,
                })}\n\n`
              )
            );

            // 准备下一轮对话
            currentMessages.push({
              role: "assistant",
              content: assistantMessage || null,
              tool_calls: toolCalls,
            });

            for (const result of toolResults) {
              currentMessages.push(result);
            }

            step++;
            toolCallAccumulators.clear();

            // 发送思考内容（如果有）
            if (reasoningContent) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "reasoning_complete",
                    content: reasoningContent,
                  })}\n\n`
                )
              );
            }
          }

          // 发送最终调试信息
          debugInfo.response.duration = Date.now() - startTime;
          debugInfo.response.usage = totalUsage;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "debug",
                debug: { response: debugInfo.response },
              })}\n\n`
            )
          );

          // 发送完成标记
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                usage: totalUsage,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          logger.error("Stream processing error", error);
          debugInfo.errors.push(error.message || String(error));

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error.message || "处理请求时发生错误",
                debug: debugInfo,
              })}\n\n`
            )
          );

          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    logger.error("Bailian MCP test API error", error);
    return createErrorResponse(
      error.message || "处理请求时发生错误",
      500,
      "API_ERROR"
    );
  }
}
