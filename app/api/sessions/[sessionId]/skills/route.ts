import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error"
import { ensureSession } from "@/lib/chat/db-helper"
import { logger } from "@/lib/logger"

// GET - 获取会话中启用的 Skills 列表
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
    
    // 如果 sessionId 不存在或为空，创建一个新会话
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

    // 获取会话的 Skills 关联
    const sessionSkills = await db.sessionSkill.findMany({
      where: {
        sessionId: effectiveSessionId
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            icon: true,
            instructions: true,
            resources: true,
            scripts: true,
            version: true,
            author: true,
            tags: true,
            triggerKeywords: true,
            isSystem: true,
            isEnabled: true
          }
        }
      }
    })

    return NextResponse.json({
      sessionId: effectiveSessionId,
      skills: sessionSkills.map(ss => ({
        id: ss.id,
        skillId: ss.skillId,
        enabled: ss.enabled,
        skill: ss.skill
      }))
    })
  } catch (error: unknown) {
    logger.error("Failed to fetch session skills", error, { 
      sessionId: await params.then(p => p.sessionId).catch(() => 'unknown'),
      userId 
    });
    return createErrorResponse(
      "获取会话技能失败",
      500,
      "FETCH_SESSION_SKILLS_FAILED",
      error
    )
  }
}

// POST - 为会话添加或更新 Skill
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
    const { skillId, enabled = true } = body

    if (typeof skillId !== "string") {
      return createErrorResponse(
        "无效的请求参数",
        400,
        "INVALID_INPUT"
      )
    }

    // 如果 sessionId 不存在或为空，创建一个新会话
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

    // 验证 Skill 属于当前用户
    const skill = await db.skill.findFirst({
      where: {
        id: skillId,
        userId
      }
    })

    if (!skill) {
      return createErrorResponse(
        "技能不存在",
        404,
        "SKILL_NOT_FOUND"
      )
    }

    // 使用 upsert 来创建或更新关联
    const sessionSkill = await db.sessionSkill.upsert({
      where: {
        sessionId_skillId: {
          sessionId: effectiveSessionId,
          skillId: skillId
        }
      },
      update: {
        enabled
      },
      create: {
        sessionId: effectiveSessionId,
        skillId: skillId,
        enabled
      }
    })

    return NextResponse.json({
      id: sessionSkill.id,
      skillId: sessionSkill.skillId,
      enabled: sessionSkill.enabled,
      sessionId: effectiveSessionId
    })
  } catch (error: unknown) {
    logger.error("Failed to update session skill", error, { 
      sessionId: await params.then(p => p.sessionId).catch(() => 'unknown'),
      userId 
    });
    return createErrorResponse(
      "更新会话技能失败",
      500,
      "UPDATE_SESSION_SKILL_FAILED",
      error
    )
  }
}

// DELETE - 从会话中移除 Skill
export async function DELETE(
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
    const { searchParams } = new URL(req.url)
    const skillId = searchParams.get("skillId")

    if (!skillId) {
      return createErrorResponse(
        "缺少 skillId 参数",
        400,
        "INVALID_INPUT"
      )
    }

    // 验证会话属于当前用户
    const sessionRecord = await db.session.findFirst({
      where: {
        id: sessionId,
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

    // 删除关联
    await db.sessionSkill.deleteMany({
      where: {
        sessionId: sessionId,
        skillId: skillId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error("Failed to delete session skill", error, { 
      sessionId: await params.then(p => p.sessionId).catch(() => 'unknown'),
      userId 
    });
    return createErrorResponse(
      "删除会话技能失败",
      500,
      "DELETE_SESSION_SKILL_FAILED",
      error
    )
  }
}
