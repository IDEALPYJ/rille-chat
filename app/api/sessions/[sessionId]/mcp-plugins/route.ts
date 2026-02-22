import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { ensureSession } from "@/lib/chat/db-helper"
import { logger } from "@/lib/logger"

// GET - 获取会话中启用的MCP插件列表
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { sessionId } = await params
    
    // 如果sessionId不存在或为空，创建一个新会话
    let effectiveSessionId = sessionId
    if (!effectiveSessionId || effectiveSessionId === "null" || effectiveSessionId === "undefined") {
      effectiveSessionId = await ensureSession(userId, null, undefined, null)
    }

    // 验证会话属于当前用户
    const sessionRecord = await db.session.findFirst({
      where: {
        id: effectiveSessionId,
        userId
      }
    })

    if (!sessionRecord) {
      return createErrorResponse(
        "会话不存在",
        404,
        "SESSION_NOT_FOUND"
      )
    }

    // 获取会话的MCP插件关联
    const sessionPlugins = await db.sessionMcpPlugin.findMany({
      where: {
        sessionId: effectiveSessionId
      },
      include: {
        plugin: {
          select: {
            id: true,
            name: true,
            icon: true,
            serverUrl: true,
            authType: true,
            advancedConfig: true
          }
        }
      }
    })

    return NextResponse.json({
      sessionId: effectiveSessionId,
      plugins: sessionPlugins.map(sp => ({
        id: sp.id,
        pluginId: sp.pluginId,
        enabled: sp.enabled,
        plugin: sp.plugin
      }))
    })
  } catch (error: unknown) {
    logger.error("Failed to fetch session MCP plugins", error, { 
      sessionId: await params.then(p => p.sessionId).catch(() => 'unknown'),
      userId 
    });
    return createErrorResponse(
      "获取会话插件失败",
      500,
      "FETCH_SESSION_PLUGINS_FAILED",
      error
    )
  }
}

// POST - 更新会话中的MCP插件启用状态
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return unauthorizedResponse()
  }

  try {
    const { sessionId } = await params
    const body = await req.json()
    const { pluginId, enabled } = body

    if (typeof pluginId !== "string" || typeof enabled !== "boolean") {
      return createErrorResponse(
        "无效的请求参数",
        400,
        "INVALID_INPUT"
      )
    }

    // 如果sessionId不存在或为空，创建一个新会话
    let effectiveSessionId = sessionId
    if (!effectiveSessionId || effectiveSessionId === "null" || effectiveSessionId === "undefined") {
      effectiveSessionId = await ensureSession(userId, null, undefined, null)
    }

    // 验证会话属于当前用户
    const sessionRecord = await db.session.findFirst({
      where: {
        id: effectiveSessionId,
        userId
      }
    })

    if (!sessionRecord) {
      return createErrorResponse(
        "会话不存在",
        404,
        "SESSION_NOT_FOUND"
      )
    }

    // 验证插件属于当前用户
    const plugin = await db.mcpPlugin.findFirst({
      where: {
        id: pluginId,
        userId
      }
    })

    if (!plugin) {
      return createErrorResponse(
        "插件不存在",
        404,
        "PLUGIN_NOT_FOUND"
      )
    }

    // 使用 upsert 来创建或更新关联
    const sessionPlugin = await db.sessionMcpPlugin.upsert({
      where: {
        sessionId_pluginId: {
          sessionId: effectiveSessionId,
          pluginId: pluginId
        }
      },
      update: {
        enabled
      },
      create: {
        sessionId: effectiveSessionId,
        pluginId: pluginId,
        enabled
      }
    })

    return NextResponse.json({
      id: sessionPlugin.id,
      pluginId: sessionPlugin.pluginId,
      enabled: sessionPlugin.enabled,
      sessionId: effectiveSessionId // 返回有效的sessionId，前端可能需要更新
    })
  } catch (error: unknown) {
    logger.error("Failed to update session MCP plugin", error, { 
      sessionId: await params.then(p => p.sessionId).catch(() => 'unknown'),
      userId 
    });
    return createErrorResponse(
      "更新会话插件失败",
      500,
      "UPDATE_SESSION_PLUGIN_FAILED",
      error
    )
  }
}

