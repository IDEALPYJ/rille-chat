import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { decrypt, encrypt } from "@/lib/encrypt"
import { logger } from "@/lib/logger"

// GET - 获取全局启用的MCP插件ID列表
export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const settingsDoc = await db.userSetting.findUnique({
      where: { userId },
    })

    if (!settingsDoc) {
      return NextResponse.json({ enabledPluginIds: [] })
    }

    try {
      const configStr = typeof settingsDoc.config === "string"
        ? settingsDoc.config
        : JSON.stringify(settingsDoc.config)
      const decryptedConfig = decrypt(configStr)
      const settings = JSON.parse(decryptedConfig)
      
      return NextResponse.json({
        enabledPluginIds: settings.enabledMcpPlugins || []
      })
    } catch (e) {
      logger.error("Failed to decrypt user settings", e)
      return NextResponse.json({ enabledPluginIds: [] })
    }
  } catch (_error: any) {
    logger.error("Failed to get enabled MCP plugins", _error)
    return createErrorResponse(
      "获取启用的插件失败",
      500,
      "GET_ENABLED_PLUGINS_FAILED",
      _error,
      { translationKey: "mcpApi.getEnabledPluginsFailed" }
    )
  }
}

// POST - 更新全局启用的MCP插件ID列表
// 支持两种格式：
// 1. { enabledPluginIds: string[] } - 直接设置完整列表
// 2. { pluginId: string, enabled: boolean } - 切换单个插件状态
export async function POST(req: Request) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const body = await req.json()
    const { enabledPluginIds, pluginId, enabled } = body

    // 获取当前用户设置
    const settingsDoc = await db.userSetting.findUnique({
      where: { userId },
    })

    let settings: any = {}
    if (settingsDoc) {
      try {
        const configStr = typeof settingsDoc.config === "string"
          ? settingsDoc.config
          : JSON.stringify(settingsDoc.config)
        const decryptedConfig = decrypt(configStr)
        settings = JSON.parse(decryptedConfig)
      } catch (e) {
        logger.error("Failed to decrypt user settings", e)
        settings = {}
      }
    }

    const currentEnabledIds: string[] = settings.enabledMcpPlugins || []
    let newEnabledIds: string[]

    // 处理两种请求格式
    if (Array.isArray(enabledPluginIds)) {
      // 格式1: 直接设置完整列表
      newEnabledIds = enabledPluginIds

      // 验证所有插件ID都属于当前用户
      if (newEnabledIds.length > 0) {
        const plugins = await db.mcpPlugin.findMany({
          where: {
            id: { in: newEnabledIds },
            userId
          },
          select: { id: true }
        })

        const validPluginIds = plugins.map(p => p.id)
        const invalidPluginIds = newEnabledIds.filter(id => !validPluginIds.includes(id))
        
        if (invalidPluginIds.length > 0) {
          return createErrorResponse(
            "部分插件不存在或不属于当前用户",
            400,
            "INVALID_PLUGIN_IDS",
            undefined,
            { translationKey: "mcpApi.somePluginsNotFound" }
          )
        }
      }
    } else if (pluginId && typeof enabled === "boolean") {
      // 格式2: 切换单个插件状态
      // 验证插件属于当前用户
      const plugin = await db.mcpPlugin.findFirst({
        where: {
          id: pluginId,
          userId
        },
        select: { id: true }
      })

      if (!plugin) {
        return createErrorResponse(
          "插件不存在或不属于当前用户",
          400,
          "INVALID_PLUGIN_ID",
          undefined,
          { translationKey: "mcpApi.pluginNotFound" }
        )
      }

      if (enabled) {
        // 启用插件：添加到列表（如果不存在）
        if (!currentEnabledIds.includes(pluginId)) {
          newEnabledIds = [...currentEnabledIds, pluginId]
        } else {
          newEnabledIds = currentEnabledIds
        }
      } else {
        // 禁用插件：从列表中移除
        newEnabledIds = currentEnabledIds.filter(id => id !== pluginId)
      }
    } else {
      return createErrorResponse(
        "无效的请求参数",
        400,
        "INVALID_INPUT",
        undefined,
        { translationKey: "mcpApi.invalidRequestParams" }
      )
    }

    // 更新启用的插件列表
    settings.enabledMcpPlugins = newEnabledIds

    // 保存设置
    const encryptedConfig = encrypt(JSON.stringify(settings))

    if (settingsDoc) {
      await db.userSetting.update({
        where: { userId },
        data: { config: encryptedConfig }
      })
    } else {
      await db.userSetting.create({
        data: {
          userId,
          config: encryptedConfig
        }
      })
    }

    return NextResponse.json({
      enabledPluginIds: newEnabledIds
    })
  } catch (_error: any) {
    logger.error("Failed to update enabled MCP plugins", _error)
    return createErrorResponse(
      "更新启用的插件失败",
      500,
      "UPDATE_ENABLED_PLUGINS_FAILED",
      _error,
      { translationKey: "mcpApi.updateEnabledPluginsFailed" }
    )
  }
}


