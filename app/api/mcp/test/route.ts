import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { logger } from "@/lib/logger"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

// POST - 测试 MCP 服务器连接
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await req.json()
    const { serverUrl, authType, apiKey, advancedConfig } = body

    logger.info("MCP test connection request", { serverUrl, authType, apiKey: apiKey ? "***" : null })

    if (!serverUrl) {
      return createErrorResponse(
        "服务器地址不能为空",
        400,
        "MISSING_SERVER_URL",
        undefined,
        { translationKey: "mcpApi.missingServerUrl" }
      )
    }

    const startTime = Date.now()

    // 构建 SSE URL
    let sseUrl = serverUrl
    if (!sseUrl.endsWith("/sse")) {
      sseUrl = sseUrl.endsWith("/") ? `${sseUrl}sse` : `${sseUrl}/sse`
    }

    const url = new URL(sseUrl)

    // 准备请求头
    const headers: Record<string, string> = {}
    if (authType === "apiKey" && apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
      logger.info("Adding Authorization header", { authType })
    }
    if (advancedConfig?.keyValuePairs) {
      Object.assign(headers, advancedConfig.keyValuePairs)
    }

    logger.info("MCP connection headers", { headers: Object.keys(headers) })

    // 创建自定义 fetch 函数来添加 headers
    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = input.toString()
      
      // 合并 headers
      const mergedHeaders: Record<string, string> = {
        ...(init?.headers as Record<string, string> || {}),
        ...headers,
      }
      
      logger.info("Custom fetch called", { 
        url: urlStr, 
        method: init?.method || 'GET',
        hasAuthHeader: !!mergedHeaders['Authorization']
      })
      
      return fetch(input, {
        ...init,
        headers: mergedHeaders,
      })
    }

    // 创建传输配置
    const transportOptions: any = {
      eventSourceInit: {
        fetch: customFetch
      }
    }

    // 创建客户端
    const transport = new SSEClientTransport(url, transportOptions)
    const client = new Client(
      {
        name: "rille-chat-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    )

    // 设置超时
    const timeoutMs = 10000 // 10秒超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("连接超时")), timeoutMs)
    })

    // 连接服务器并获取工具列表
    const connectPromise = (async () => {
      await client.connect(transport)
      const tools = await client.listTools()
      return tools
    })()

    // 竞争超时和连接
    const tools = await Promise.race([connectPromise, timeoutPromise])
    
    // 关闭连接
    await client.close()
    await transport.close()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `连接成功，发现 ${tools.tools.length} 个工具`,
      duration,
      toolCount: tools.tools.length,
    })

  } catch (error: any) {
    logger.error("MCP connection test failed", error)
    
    // 分析错误类型
    let errorMessage = error.message || "连接测试失败"
    let translationKey = "mcpApi.testFailed"
    
    if (error.message?.includes("timeout") || error.message?.includes("超时")) {
      errorMessage = "连接超时，请检查服务器地址是否正确"
      translationKey = "mcpApi.connectionTimeout"
    } else if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
      errorMessage = "认证失败，请检查 API Key 是否正确"
      translationKey = "mcpApi.authFailed"
    } else if (error.message?.includes("ECONNREFUSED") || error.message?.includes("连接被拒绝")) {
      errorMessage = "无法连接到服务器，请检查地址和端口"
      translationKey = "mcpApi.connectionRefused"
    } else if (error.message?.includes("ENOTFOUND") || error.message?.includes("getaddrinfo")) {
      errorMessage = "无法解析服务器地址，请检查 URL 是否正确"
      translationKey = "mcpApi.dnsError"
    }

    return NextResponse.json({
      success: false,
      message: errorMessage,
      translationKey,
      duration: 0,
      toolCount: 0,
    }, { status: 200 }) // 返回 200 让前端能正常处理错误信息
  }
}
