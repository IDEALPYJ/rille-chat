import OpenAI from "openai"
import { logger } from "@/lib/logger"
import { callMcpTool } from "./mcp-helper"
import { McpToolCallInfo } from "@/lib/types"
import { MCP } from "@/lib/constants"
import { StreamUsage } from "./stream-helper"

export interface McpPluginConfig {
  id: string
  name: string
  serverUrl: string
  authType: string
  apiKey: string | null
  advancedConfig: {
    keyValuePairs?: Record<string, string>
    ignoreSSL?: boolean
  }
}

// 重新导出类型以便其他地方使用
export type { McpToolCallInfo }

// 新增：流式事件定义
export type McpStreamEvent = {
  type: 'tool_start'
  info: McpToolCallInfo
} | {
  type: 'tool_result'
  info: McpToolCallInfo
}

// 使用常量文件中的定义
const MAX_TOOL_RESULT_SIZE = MCP.MAX_TOOL_RESULT_SIZE
const MCP_TOOL_TIMEOUT = MCP.TOOL_TIMEOUT

export async function handleMcpToolCalls(
  aiResponse: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  enabledMcpPlugins: McpPluginConfig[]
): Promise<{
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
  toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  toolCallInfos: McpToolCallInfo[] // 用于UI显示的工具调用信息
  hasToolCalls: boolean
  assistantMessage: string
  reasoning: string
  usage: StreamUsage
  // 新增：收集到的 Tool Calls 原始数据，用于后续可能的重新执行或事件生成
  collectedToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
}> {
  interface ToolCallAccumulator {
    id: string
    type: "function"
    function: {
      name: string
      arguments: string
    }
  }
  
  const toolCallsMap = new Map<number, ToolCallAccumulator>()
  let assistantMessage = ""
  let reasoning = ""
  let usage: StreamUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  }

  // 收集流式响应中的函数调用和内容
  for await (const chunk of aiResponse) {
    if (chunk.usage) {
      usage = {
        prompt_tokens: chunk.usage.prompt_tokens || 0,
        completion_tokens: chunk.usage.completion_tokens || 0,
        total_tokens: chunk.usage.total_tokens || 0,
        prompt_tokens_details: { cached_tokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0 },
        completion_tokens_details: { reasoning_tokens: chunk.usage.completion_tokens_details?.reasoning_tokens || 0 }
      }
    }

    const delta = chunk.choices[0]?.delta
    const content = delta?.content || ""
    // OpenAI 的流式响应中可能包含 reasoning_content，但类型定义中可能没有
    const reasoningContent = (delta as { reasoning_content?: string })?.reasoning_content || ""

    if (content) {
      assistantMessage += content
    }
    if (reasoningContent) {
      reasoning += reasoningContent
    }

    // 收集函数调用
    if (delta?.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        const index = toolCallDelta.index ?? 0

        if (!toolCallsMap.has(index)) {
          toolCallsMap.set(index, {
            id: toolCallDelta.id || `call_${index}`,
            type: "function" as const,
            function: {
              name: toolCallDelta.function?.name || "",
              arguments: toolCallDelta.function?.arguments || ""
            }
          })
        } else {
          const existing = toolCallsMap.get(index)!
          // 更新 id（如果之前是临时的，现在有真实的 id 了）
          if (toolCallDelta.id && existing.id.startsWith('call_')) {
            existing.id = toolCallDelta.id
          }
          if (toolCallDelta.function?.name) {
            existing.function.name += toolCallDelta.function.name
          }
          if (toolCallDelta.function?.arguments) {
            existing.function.arguments += toolCallDelta.function.arguments
          }
        }
      }
    }
  }

  // 转换为数组
  const collectedToolCalls = Array.from(toolCallsMap.values()).filter(tc => tc.id && tc.function.name)

  // 如果没有函数调用，直接返回
  if (collectedToolCalls.length === 0 || enabledMcpPlugins.length === 0) {
    return {
      toolCalls: [],
      toolResults: [],
      toolCallInfos: [],
      hasToolCalls: false,
      assistantMessage,
      reasoning,
      usage,
      collectedToolCalls: []
    }
  }

  // 我们不再在这里执行工具，而是返回 collectedToolCalls，让调用者使用 executeMcpToolsWithEvents
  // 但为了兼容旧逻辑（如果不需要流式事件），我们保留执行逻辑，或者重构为调用新函数
  
  // 这里我们选择直接调用 executeMcpToolsWithEvents 并收集所有结果
  const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
  const toolCallInfos: McpToolCallInfo[] = []
  
  const eventGenerator = executeMcpToolsWithEvents(collectedToolCalls, enabledMcpPlugins)
  
  for await (const event of eventGenerator) {
    if (event.type === 'tool_result') {
        toolCallInfos.push(event.info)
        toolResults.push({
            role: "tool",
            tool_call_id: event.info.toolCallId,
            content: JSON.stringify(event.info.result || { error: event.info.error })
        } as any)
    }
  }

  return {
    toolCalls: collectedToolCalls,
    toolResults,
    toolCallInfos,
    hasToolCalls: toolResults.length > 0,
    assistantMessage,
    reasoning,
    usage,
    collectedToolCalls
  }
}

/**
 * 执行 MCP 工具并产生流式事件
 * 改进版本：添加资源清理和更好的错误处理
 */
export async function* executeMcpToolsWithEvents(
  collectedToolCalls: any[],
  enabledMcpPlugins: McpPluginConfig[]
): AsyncIterable<McpStreamEvent> {
  const { db } = await import("@/lib/db")
  
  // 预加载所有插件图标
  const pluginIcons = new Map<string, string | null>()
  try {
      const pluginIds = enabledMcpPlugins.map(p => p.id)
      const plugins = await db.mcpPlugin.findMany({
          where: { id: { in: pluginIds } },
          select: { id: true, icon: true }
      })
      plugins.forEach(p => pluginIcons.set(p.id, p.icon))
  } catch (e) {
      logger.warn("Failed to fetch plugin icons", { error: e })
  }

  // 使用 AbortController 来管理超时和取消
  const abortControllers: AbortController[] = []

  try {
    for (const toolCall of collectedToolCalls) {
      const functionName = toolCall.function?.name

      if (!functionName) {
        continue
      }

      const startTime = Date.now()
      let toolCallInfo: McpToolCallInfo | null = null
      const abortController = new AbortController()
      abortControllers.push(abortController)

      try {
        // 解析函数名 - 支持两种格式：
        // 1. 旧格式: mcp_{pluginId}_{toolName}
        // 2. 新格式: {pluginPrefix}_{toolName} (通过匹配插件名称前缀)
        let plugin: McpPluginConfig | undefined
        let toolName: string | null = null
        
        if (functionName.startsWith("mcp_")) {
          // 旧格式解析
          const parts = functionName.replace("mcp_", "").split("_")
          const pluginId = parts[0]
          toolName = parts.length > 1 ? parts.slice(1).join("_") : null
          plugin = enabledMcpPlugins.find(p => p.id === pluginId)
        } else {
          // 新格式解析：通过匹配插件名称前缀
          for (const p of enabledMcpPlugins) {
            const pluginPrefix = p.name.replace(/\s+/g, '_').substring(0, 8).toLowerCase()
            if (functionName.startsWith(`${pluginPrefix}_`)) {
              plugin = p
              toolName = functionName.replace(`${pluginPrefix}_`, "")
              break
            }
          }
        }

      if (!plugin) {
        logger.warn("MCP plugin not found", { functionName })
        // 即使找不到插件，也需要生成一个错误结果
        yield {
            type: 'tool_result',
            info: {
                toolCallId: toolCall.id,
                pluginId: 'unknown',
                pluginName: 'Unknown',
                pluginIcon: null,
                toolName: toolName || 'unknown',
                arguments: {},
                result: null,
                error: `Plugin not found for function: ${functionName}`,
                duration: 0,
                status: 'error'
            }
        }
        continue
      }

      // 准备基础信息
      const args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>
      const effectiveToolName = toolName || (typeof args.tool === 'string' ? args.tool : "unknown")
      const effectiveArgs = toolName ? args : (typeof args.arguments === 'object' && args.arguments !== null ? args.arguments as Record<string, unknown> : {})

      toolCallInfo = {
        toolCallId: toolCall.id,
        pluginId: plugin.id,
        pluginName: plugin.name,
        pluginIcon: pluginIcons.get(plugin.id) || null,
        toolName: effectiveToolName,
        arguments: effectiveArgs,
        result: null,
        status: 'pending'
      }

      // 1. Yield Start Event
      yield {
        type: 'tool_start',
        info: { ...toolCallInfo }
      }

      // 执行工具
      let result: unknown
      let timeoutId: NodeJS.Timeout | null = null
      try {
        // 添加超时控制（使用 AbortController 以便可以清理）
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            abortController.abort()
            reject(new Error(`Tool call timeout after ${MCP_TOOL_TIMEOUT}ms`))
          }, MCP_TOOL_TIMEOUT)
        })

        result = await Promise.race([
          callMcpTool(plugin, effectiveToolName, effectiveArgs),
          timeoutPromise
        ])
        
        // 清理超时定时器
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        // 限制结果大小
        const resultString = JSON.stringify(result)
        if (resultString.length > MAX_TOOL_RESULT_SIZE) {
          logger.warn("MCP tool result exceeds size limit", {
            pluginId: plugin.id,
            toolName: effectiveToolName,
            size: resultString.length
          })
          result = {
            error: "Result too large",
            truncated: true,
            originalSize: resultString.length,
            preview: resultString.substring(0, 1000) + "..."
          }
        }

        toolCallInfo.result = result
        toolCallInfo.status = 'completed'
      } catch (error) {
        // 清理超时定时器（如果还在运行）
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        const errorMessage = error instanceof Error ? error.message : "Tool call failed"
        logger.error("Failed to call MCP tool", error, { pluginId: plugin.id, toolCall })
        toolCallInfo.error = errorMessage
        toolCallInfo.status = 'error'
      } finally {
        // 确保超时定时器被清理
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }

      toolCallInfo.duration = Date.now() - startTime

      // 2. Yield Result Event
      yield {
        type: 'tool_result',
        info: { ...toolCallInfo }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process tool call"
      logger.error("Failed to process MCP tool call", error, { toolCall })
      
      // 发生严重错误时，yield 一个错误结果
      if (toolCallInfo) {
        toolCallInfo.error = errorMessage
        toolCallInfo.status = 'error'
        toolCallInfo.duration = Date.now() - startTime
        yield {
          type: 'tool_result',
          info: toolCallInfo
        }
      }
    } finally {
      // 清理当前工具的 AbortController
      const index = abortControllers.indexOf(abortController)
      if (index > -1) {
        abortControllers.splice(index, 1)
      }
    }
    }
  } catch (error) {
    // 外层 try 的错误处理（处理 for 循环外的错误）
    logger.error("Failed to process MCP tool calls", error)
  } finally {
    // 清理所有剩余的 AbortController（防御性编程）
    for (const controller of abortControllers) {
      try {
        controller.abort()
      } catch {
        // 忽略清理错误
      }
    }
  }
}
