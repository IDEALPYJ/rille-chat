import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { encrypt } from "@/lib/encrypt"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { logger } from "@/lib/logger"

// GET - 获取单个插件详情
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    
    const plugin = await db.mcpPlugin.findFirst({
      where: {
        id: id,
        userId
      }
    })

    if (!plugin) {
      return createErrorResponse(
        "插件不存在",
        404,
        "PLUGIN_NOT_FOUND",
        undefined,
        { translationKey: "mcpApi.pluginNotFound" }
      )
    }

    // 返回时排除敏感信息
    const { apiKey: _, ...pluginWithoutKey } = plugin

    return NextResponse.json(pluginWithoutKey)
  } catch (_error: any) {
    logger.error("Failed to fetch MCP plugin", _error)
    return createErrorResponse(
      "获取插件失败",
      500,
      "FETCH_PLUGIN_FAILED",
      _error,
      { translationKey: "mcpApi.getPluginFailed" }
    )
  }
}

// PATCH - 更新插件
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { name, icon, serverUrl, authType, apiKey, advancedConfig } = body

    // 检查插件是否存在且属于当前用户
    const existingPlugin = await db.mcpPlugin.findFirst({
      where: {
        id: id,
        userId
      }
    })

    if (!existingPlugin) {
      return createErrorResponse(
        "插件不存在",
        404,
        "PLUGIN_NOT_FOUND",
        undefined,
        { translationKey: "mcpApi.pluginNotFound" }
      )
    }

    // 准备更新数据
    const updateData: Prisma.McpPluginUpdateInput = {}
    if (name !== undefined) updateData.name = name.trim()
    if (icon !== undefined) updateData.icon = icon?.trim() || null
    if (serverUrl !== undefined) updateData.serverUrl = serverUrl.trim()
    if (authType !== undefined) updateData.authType = authType
    if (advancedConfig !== undefined) updateData.advancedConfig = advancedConfig as Prisma.InputJsonValue

    // 处理API Key加密
    if (authType === "apiKey" && apiKey !== undefined) {
      if (apiKey) {
        try {
          updateData.apiKey = encrypt(apiKey)
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
      } else {
        updateData.apiKey = null
      }
    } else if (authType === "none") {
      updateData.apiKey = null
    }

    // 更新插件
    const plugin = await db.mcpPlugin.update({
      where: { id: id },
      data: updateData
    })

    // 返回时排除敏感信息
    const { apiKey: _, ...pluginWithoutKey } = plugin

    return NextResponse.json(pluginWithoutKey)
  } catch (_error: any) {
    logger.error("Failed to update MCP plugin", _error)
    return createErrorResponse(
      "更新插件失败",
      500,
      "UPDATE_PLUGIN_FAILED",
      _error,
      { translationKey: "mcpApi.updatePluginFailed" }
    )
  }
}

// DELETE - 删除插件
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    
    // 检查插件是否存在且属于当前用户
    const existingPlugin = await db.mcpPlugin.findFirst({
      where: {
        id: id,
        userId
      }
    })

    if (!existingPlugin) {
      return createErrorResponse(
        "插件不存在",
        404,
        "PLUGIN_NOT_FOUND",
        undefined,
        { translationKey: "mcpApi.pluginNotFound" }
      )
    }

    // 删除插件（关联的SessionMcpPlugin会通过CASCADE自动删除）
    await db.mcpPlugin.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true })
  } catch (_error: any) {
    logger.error("Failed to delete MCP plugin", _error)
    return createErrorResponse(
      "删除插件失败",
      500,
      "DELETE_PLUGIN_FAILED",
      _error,
      { translationKey: "mcpApi.deletePluginFailed" }
    )
  }
}

