import { auth } from "@/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/encrypt"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { logger } from "@/lib/logger"

// GET - 获取用户的所有MCP插件
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const plugins = await db.mcpPlugin.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        icon: true,
        serverUrl: true,
        authType: true,
        advancedConfig: true,
        createdAt: true,
        updatedAt: true,
        // 不返回apiKey，需要时单独获取
      }
    })

    return NextResponse.json(plugins)
  } catch (_error: any) {
    logger.error("Failed to fetch MCP plugins", _error)
    return createErrorResponse(
      "获取插件列表失败",
      500,
      "FETCH_PLUGINS_FAILED",
      _error,
      { translationKey: "mcpApi.getPluginsFailed" }
    )
  }
}

// POST - 创建新的MCP插件
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await req.json()
    const { name, icon, serverUrl, authType, apiKey, advancedConfig } = body

    // 验证必填字段
    if (!name || !serverUrl) {
      return createErrorResponse(
        "插件名称和服务器地址为必填项",
        400,
        "INVALID_INPUT",
        undefined,
        { translationKey: "mcpApi.pluginNameAndServerUrlRequired" }
      )
    }

    if (authType === "apiKey" && !apiKey) {
      return createErrorResponse(
        "API Key为必填项",
        400,
        "INVALID_INPUT",
        undefined,
        { translationKey: "mcpApi.apiKeyRequired" }
      )
    }

    // 加密API Key（如果存在）
    let encryptedApiKey: string | null = null
    if (authType === "apiKey" && apiKey) {
      try {
        encryptedApiKey = encrypt(apiKey)
      } catch (encryptError: any) {
        return createErrorResponse(
          `加密失败: ${encryptError.message || 'ENCRYPTION_KEY 未配置或无效'}`,
          500,
          "ENCRYPTION_FAILED",
          encryptError,
          { 
            translationKey: "mcpApi.encryptionFailed",
            translationParams: { error: encryptError.message || "ENCRYPTION_KEY 未配置或无效" }
          }
        )
      }
    }

    // 创建插件
    const plugin = await db.mcpPlugin.create({
      data: {
        name: name.trim(),
        icon: icon?.trim() || null,
        serverUrl: serverUrl.trim(),
        authType: authType || "none",
        apiKey: encryptedApiKey,
        advancedConfig: advancedConfig || {},
        userId
      }
    })

    // 返回时排除敏感信息
    const { apiKey: _, ...pluginWithoutKey } = plugin

    return NextResponse.json(pluginWithoutKey, { status: 201 })
  } catch (_error: any) {
    logger.error("Failed to create MCP plugin", _error)
    return createErrorResponse(
      "创建插件失败",
      500,
      "CREATE_PLUGIN_FAILED",
      _error,
      { translationKey: "mcpApi.createPluginFailed" }
    )
  }
}


