import { db } from "@/lib/db"
import { decrypt } from "@/lib/encrypt"
import { logger } from "@/lib/logger"
import { Client } from "@modelcontextprotocol/sdk/client"
// @ts-ignore - Temporary workaround for build error
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse"
import OpenAI from "openai"
import https from "https"

interface McpPluginConfig {
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

/**
 * 获取全局启用的MCP插件（从用户设置中读取）
 */
export async function getEnabledMcpPlugins(userId: string, userSettings?: any): Promise<McpPluginConfig[]> {
  try {
    // 如果没有传入userSettings，从数据库读取
    let settings = userSettings
    if (!settings) {
      const settingsDoc = await db.userSetting.findUnique({
        where: { userId },
      })
      
      if (settingsDoc) {
        try {
          const configStr = typeof settingsDoc.config === "string"
            ? settingsDoc.config
            : JSON.stringify(settingsDoc.config)
          const decryptedConfig = decrypt(configStr)
          settings = JSON.parse(decryptedConfig)
        } catch (e) {
          logger.error("Failed to decrypt user settings", e)
          return []
        }
      } else {
        return []
      }
    }

    // 从用户设置中获取启用的插件ID列表
    const enabledPluginIds = settings?.enabledMcpPlugins || []
    
    logger.info("Getting enabled MCP plugins", { 
      userId, 
      enabledPluginIds,
      settingsKeys: settings ? Object.keys(settings) : null 
    })
    
    if (enabledPluginIds.length === 0) {
      logger.info("No enabled MCP plugins found")
      return []
    }

    // 获取所有启用的插件
    const plugins = await db.mcpPlugin.findMany({
      where: {
        id: { in: enabledPluginIds },
        userId // 确保插件属于当前用户
      }
    })

    const pluginConfigs: McpPluginConfig[] = []

    for (const plugin of plugins) {
      // 解密API Key
      let apiKey: string | null = null
      if (plugin.authType === "apiKey" && plugin.apiKey) {
        try {
          apiKey = decrypt(plugin.apiKey)
        } catch (error) {
          logger.error("Failed to decrypt MCP plugin API key", error, { pluginId: plugin.id })
          continue
        }
      }

      pluginConfigs.push({
        id: plugin.id,
        name: plugin.name,
        serverUrl: plugin.serverUrl,
        authType: plugin.authType,
        apiKey,
        advancedConfig: (plugin.advancedConfig as any) || {}
      })
    }

    return pluginConfigs
  } catch (error) {
    logger.error("Failed to get enabled MCP plugins", error, { userId })
    return []
  }
}

/**
 * 调用MCP插件的工具
 * 使用官方SDK的SSEClientTransport
 */
export async function callMcpTool(
  plugin: McpPluginConfig,
  toolName: string,
  arguments_: Record<string, any>
): Promise<any> {
  let client: Client | null = null
  let transport: SSEClientTransport | null = null
  
  try {
    // 构建SSE端点URL（如果serverUrl不包含/sse，则添加）
    let sseUrl = plugin.serverUrl
    if (!sseUrl.endsWith("/sse")) {
      sseUrl = sseUrl.endsWith("/") ? `${sseUrl}sse` : `${sseUrl}/sse`
    }
    
    const url = new URL(sseUrl)
    
    // 准备请求头
    const headers: Record<string, string> = {
      ...(plugin.authType === "apiKey" && plugin.apiKey
        ? { "Authorization": `Bearer ${plugin.apiKey}` }
        : {}),
      ...(plugin.advancedConfig.keyValuePairs || {})
    }

    // 创建SSE传输
    // 使用自定义 fetch 函数来添加认证头
    const transportOptions: any = {}
    
    // 创建自定义 fetch 函数来添加 headers
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // 合并 headers
      const mergedHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string> || {}),
        ...headers,
      }
      
      return fetch(input, {
        ...init,
        headers: mergedHeaders,
      })
    }
    
    transportOptions.eventSourceInit = {
      fetch: customFetch
    }
    
    // 如果忽略SSL证书验证，创建自定义fetch函数
    // SECURITY WARNING: Only use ignoreSSL in development/testing environments.
    // Disabling SSL verification in production can lead to man-in-the-middle attacks.
    if (plugin.advancedConfig.ignoreSSL && url.protocol === "https:") {
      console.warn('[Security Warning] SSL certificate validation is disabled. This should only be used in development/testing environments.');
      // 创建自定义的https agent来忽略SSL验证
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      // 创建自定义fetch函数，使用自定义的https agent
      transportOptions.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlObj = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.toString())
        
        // 合并 headers
        const mergedHeaders: Record<string, string> = {
          ...(init?.headers as Record<string, string> || {}),
          ...headers,
        }
        
        if (urlObj.protocol === 'https:') {
          // 对于HTTPS请求，使用Node.js的https模块
          return new Promise((resolve, reject) => {
            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: init?.method || 'GET',
              headers: mergedHeaders,
              agent: httpsAgent
            }
            
            const req = https.request(options, (res) => {
              const chunks: Buffer[] = []
              res.on('data', (chunk) => chunks.push(chunk))
              res.on('end', () => {
                const body = Buffer.concat(chunks).toString()
                const response = new Response(body, {
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || 'OK',
                  headers: res.headers as HeadersInit
                })
                resolve(response)
              })
            })
            
            req.on('error', reject)
            
            if (init?.body) {
              req.write(init.body)
            }
            
            req.end()
          })
        } else {
          // 对于HTTP请求，使用标准的fetch
          return fetch(input, { ...init, headers: mergedHeaders })
        }
      }
    }
    
    transport = new SSEClientTransport(url, transportOptions)

    // 创建MCP客户端
    client = new Client({
      name: "rille-chat",
      version: "1.0.0"
    }, {
      capabilities: {
        // @ts-ignore - MCP SDK type definition issue
        tools: {}
      }
    })

    // 连接到服务器
    await client.connect(transport)

    // 调用工具，添加超时控制
    // Serverless环境（如Vercel）通常有10-60秒的函数超时限制
    // 我们设置25秒超时，留出缓冲时间
    const toolTimeout = 25000 // 25秒
    
    const toolCallPromise = client.callTool({
      name: toolName,
      arguments: arguments_
    })
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`工具调用超时（${toolTimeout / 1000}秒）。如果工具需要更长时间执行，请考虑使用异步任务模式或增加超时时间。`))
      }, toolTimeout)
      
      // 清理超时定时器（如果Promise提前完成）
      toolCallPromise.finally(() => clearTimeout(timeoutId))
    })
    
    const result = await Promise.race([toolCallPromise, timeoutPromise]) as any

    // MCP SDK返回的result是CallToolResult类型，包含content数组
    // 我们需要提取实际的内容
    if (result && Array.isArray(result.content)) {
      // 如果content是数组，提取文本内容
      const textContents = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join("\n")
      
      if (textContents) {
        return textContents
      }
      
      // 如果没有文本内容，尝试解析JSON
      const jsonContents = result.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => {
          try {
            return JSON.parse(item.text)
          } catch {
            return item.text
          }
        })
      
      return jsonContents.length === 1 ? jsonContents[0] : jsonContents
    }
    
    // 如果result不是预期的格式，直接返回
    return result
  } catch (error: any) {
    logger.error("Failed to call MCP tool", error, { pluginId: plugin.id, toolName })
    throw new Error(`MCP tool call failed: ${error.message || error.toString()}`)
  } finally {
    // 清理连接
    try {
      if (client) {
        await client.close()
      }
      if (transport) {
        await transport.close()
      }
    } catch (closeError) {
      logger.warn("Failed to close MCP client connection", { error: closeError })
    }
  }
}

/**
 * 从MCP服务器获取可用工具列表
 * 使用官方SDK的SSEClientTransport
 */
async function getMcpTools(plugin: McpPluginConfig): Promise<any[]> {
  let client: Client | null = null
  let transport: SSEClientTransport | null = null
  
  try {
    // 构建SSE端点URL（如果serverUrl不包含/sse，则添加）
    let sseUrl = plugin.serverUrl
    if (!sseUrl.endsWith("/sse")) {
      sseUrl = sseUrl.endsWith("/") ? `${sseUrl}sse` : `${sseUrl}/sse`
    }
    
    const url = new URL(sseUrl)
    
    // 准备请求头
    const headers: Record<string, string> = {
      ...(plugin.authType === "apiKey" && plugin.apiKey
        ? { "Authorization": `Bearer ${plugin.apiKey}` }
        : {}),
      ...(plugin.advancedConfig.keyValuePairs || {})
    }

    // 创建SSE传输
    // 使用自定义 fetch 函数来添加认证头
    const transportOptions: any = {}
    
    // 创建自定义 fetch 函数来添加 headers
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // 合并 headers
      const mergedHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string> || {}),
        ...headers,
      }
      
      return fetch(input, {
        ...init,
        headers: mergedHeaders,
      })
    }
    
    transportOptions.eventSourceInit = {
      fetch: customFetch
    }
    
    // 如果忽略SSL证书验证，创建自定义fetch函数
    // SECURITY WARNING: Only use ignoreSSL in development/testing environments.
    // Disabling SSL verification in production can lead to man-in-the-middle attacks.
    if (plugin.advancedConfig.ignoreSSL && url.protocol === "https:") {
      console.warn('[Security Warning] SSL certificate validation is disabled. This should only be used in development/testing environments.');
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      })
      
      transportOptions.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const urlObj = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.toString())
        
        // 合并 headers
        const mergedHeaders: Record<string, string> = {
          ...(init?.headers as Record<string, string> || {}),
          ...headers,
        }
        
        if (urlObj.protocol === 'https:') {
          return new Promise((resolve, reject) => {
            const options = {
              hostname: urlObj.hostname,
              port: urlObj.port || 443,
              path: urlObj.pathname + urlObj.search,
              method: init?.method || 'GET',
              headers: mergedHeaders,
              agent: httpsAgent
            }
            
            const req = https.request(options, (res) => {
              const chunks: Buffer[] = []
              res.on('data', (chunk) => chunks.push(chunk))
              res.on('end', () => {
                const body = Buffer.concat(chunks).toString()
                const response = new Response(body, {
                  status: res.statusCode || 200,
                  statusText: res.statusMessage || 'OK',
                  headers: res.headers as HeadersInit
                })
                resolve(response)
              })
            })
            
            req.on('error', reject)
            
            if (init?.body) {
              req.write(init.body)
            }
            
            req.end()
          })
        } else {
          return fetch(input, { ...init, headers: mergedHeaders })
        }
      }
    }
    
    transport = new SSEClientTransport(url, transportOptions)

    // 创建MCP客户端
    client = new Client({
      name: "rille-chat",
      version: "1.0.0"
    }, {
      capabilities: {
        // @ts-ignore - MCP SDK type definition issue
        tools: {}
      }
    })

    // 连接到服务器
    logger.info("Connecting to MCP server", { pluginId: plugin.id, serverUrl: plugin.serverUrl })
    await client.connect(transport)
    logger.info("Connected to MCP server", { pluginId: plugin.id })

    // 获取工具列表
    const toolsResult = await client.listTools()
    logger.info("Got MCP tools", { pluginId: plugin.id, toolCount: toolsResult.tools?.length || 0 })
    
    return toolsResult.tools || []
  } catch (error: any) {
    logger.warn("Failed to get MCP tools, using fallback", { pluginId: plugin.id, error: error.message, serverUrl: plugin.serverUrl })
    return []
  } finally {
    // 清理连接
    try {
      if (client) {
        await client.close()
      }
      if (transport) {
        await transport.close()
      }
    } catch (closeError) {
      logger.warn("Failed to close MCP client connection", { error: closeError })
    }
  }
}

/**
 * 将MCP插件转换为OpenAI工具定义
 */
export async function convertMcpPluginsToTools(plugins: McpPluginConfig[]): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = []
  
  for (const plugin of plugins) {
    try {
      // 尝试从MCP服务器获取工具列表
      const mcpTools = await getMcpTools(plugin)
      
      if (mcpTools.length > 0) {
        // 使用从服务器获取的工具定义
        // 使用插件名称的前8个字符作为前缀，使工具名称更简洁
        const pluginPrefix = plugin.name.replace(/\s+/g, '_').substring(0, 8).toLowerCase()
        for (const mcpTool of mcpTools) {
          tools.push({
            type: "function",
            function: {
              name: `${pluginPrefix}_${mcpTool.name}`,
              description: `[${plugin.name}] ${mcpTool.description || `调用 ${mcpTool.name} 工具`}`,
              parameters: mcpTool.inputSchema || {
                type: "object",
                properties: {},
                required: []
              }
            }
          })
        }
      } else {
        // 回退到通用工具定义
        tools.push({
          type: "function",
          function: {
            name: `mcp_${plugin.id}`,
            description: `调用 ${plugin.name} MCP插件`,
            parameters: {
              type: "object",
              properties: {
                tool: {
                  type: "string",
                  description: "要调用的工具名称"
                },
                arguments: {
                  type: "object",
                  description: "工具参数"
                }
              },
              required: ["tool", "arguments"]
            }
          }
        })
      }
    } catch (error) {
      logger.error("Failed to convert MCP plugin to tools", error, { pluginId: plugin.id })
      // 使用回退工具定义
      tools.push({
        type: "function",
        function: {
          name: `mcp_${plugin.id}`,
          description: `调用 ${plugin.name} MCP插件`,
          parameters: {
            type: "object",
            properties: {
              tool: {
                type: "string",
                description: "要调用的工具名称"
              },
              arguments: {
                type: "object",
                description: "工具参数"
              }
            },
            required: ["tool", "arguments"]
          }
        }
      })
    }
  }
  
  return tools
}

