import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequestResponse, createErrorResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import fs from "fs/promises";
import { getFilePathFromUrl } from "@/lib/file-utils";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. 鉴权
    const session = await auth();
    const userId = session?.user?.id;

    // No fallback for dev - requiring explicit authentication for security

    if (!userId) {
      return unauthorizedResponse();
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const projectId = searchParams.get("projectId");
    const isImageGeneration = searchParams.get("isImageGeneration") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 3. 如果提供了sessionId，加载特定会话的消息
    if (sessionId && sessionId !== 'null' && sessionId !== 'undefined') {
      const session = await db.session.findFirst({
        where: {
          id: sessionId,
          userId: userId,
        },
      });

      if (!session) {
        return notFoundResponse("未找到会话", { translationKey: "chatApi.sessionNotFound" });
      }

      // 消息分页参数
      const msgLimitStr = searchParams.get("msgLimit");
      const beforeStr = searchParams.get("before"); // cursor: message createdAt

      let messages;
      let hasMore = false;

      if (msgLimitStr) {
        const msgLimit = parseInt(msgLimitStr);
        const whereClause: Prisma.MessageWhereInput = { sessionId };
        
        if (beforeStr) {
          whereClause.createdAt = { lt: new Date(beforeStr) };
        }

        // 获取 limit + 1 条，用来判断是否有更多
        // 注意：如果要获取“之前”的消息，通常我们需要按时间倒序查，然后再反转回来
        const rawMessages = await db.message.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: msgLimit + 1,
          include: {
            parent: {
              select: { id: true, content: true, role: true }
            },
            children: {
              select: { id: true, content: true, role: true }
            },
            attachments: true
          },
        });

        if (rawMessages.length > msgLimit) {
          hasMore = true;
          rawMessages.pop(); // 移除多取的一条
        }

        // 反转回正序
        messages = rawMessages.reverse();
      } else {
        // 保持原有逻辑：加载所有
        messages = await db.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: "asc" },
          include: {
            parent: {
              select: { id: true, content: true, role: true }
            },
            children: {
              select: { id: true, content: true, role: true }
            },
            attachments: true
          },
        });
      }

      // 转换为前端需要的格式
      const formattedMessages = messages.map((msg) => {
        // 处理 contentParts：确保它是数组格式
        let contentParts: unknown = msg.contentParts;
        if (contentParts) {
          // 如果是字符串，尝试解析为 JSON
          if (typeof contentParts === 'string') {
            try {
              contentParts = JSON.parse(contentParts);
            } catch {
              // 解析失败，设为 null
              contentParts = null;
            }
          }
          // 确保是数组
          if (!Array.isArray(contentParts)) {
            contentParts = null;
          }
        }

        return {
          id: msg.id,
          role: msg.role as 'system' | 'user' | 'assistant' | 'data',
          content: msg.content,
          contentParts: contentParts as Array<Record<string, unknown>> | null,
          reasoning_content: msg.reasoningContent ?? undefined,
          search_results: msg.searchResults ?? undefined,
          createdAt: msg.createdAt,
          parentId: msg.parentId,
          childrenIds: msg.children.map((c) => c.id),
          model: msg.model,
          provider: msg.provider,
          modelAvatar: msg.modelAvatar ?? undefined,
          input_tokens: msg.inputTokens,
          output_tokens: msg.outputTokens,
          input_cache_tokens: msg.inputCacheTokens,
          output_cache_tokens: msg.outputCacheTokens,
          total_tokens: msg.totalTokens,
          cost: msg.cost,
          // 语音消息字段
          isVoiceInput: msg.isVoiceInput || false,
          audioUrl: msg.audioUrl ?? undefined,
          audioDuration: msg.audioDuration ?? undefined,
          attachments: msg.attachments.map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            type: a.type,
            size: a.size
          }))
        };
      });

      return NextResponse.json({
        session: {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        messages: formattedMessages,
        total: messages.length,
        hasMore,
      });
    }

    // 4. 如果没有提供sessionId，返回用户的所有会话列表
    const where: Prisma.SessionWhereInput = { userId };
    if (projectId) {
      where.projectId = projectId;
      // 项目中的对话不包含图像对话
      // 由于字段有默认值 false，所有旧记录应该都是 false
      // 为了兼容，我们排除 isImageGeneration = true 的记录
      where.isImageGeneration = { not: true };
    } else if (isImageGeneration) {
      // 如果请求图像对话，只返回图像对话且不属于任何项目
      where.isImageGeneration = true;
      where.projectId = null;
    } else {
      // 如果没有提供 projectId 且不是图像对话请求，只返回普通对话
      // 由于字段有默认值 false，所有旧记录应该都是 false
      // 为了兼容，我们排除 isImageGeneration = true 的记录
      where.projectId = null;
      where.isImageGeneration = { not: true };
    }

    // 使用冗余字段优化查询性能，避免联表查询
    const sessions = await db.session.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        lastMessagePreview: true,
        lastMessageAt: true,
        lastMessageRole: true,
        _count: {
          select: { messages: true }
        }
      }
    });

    const formattedSessions = sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session._count.messages,
      lastMessage: session.lastMessagePreview ? {
        content: session.lastMessagePreview + (session.lastMessagePreview.length >= 200 ? "..." : ""),
        role: session.lastMessageRole || "assistant",
        createdAt: session.lastMessageAt || session.updatedAt,
      } : null,
    }));

    const totalSessions = await db.session.count({
      where,
    });

    return NextResponse.json({
      sessions: formattedSessions,
      total: totalSessions,
      limit,
      offset,
    });

  } catch (error: any) {
    return createErrorResponse("加载历史消息时出错", 500, "LOAD_HISTORY_ERROR", error, { translationKey: "chatApi.loadHistoryError" });
  }
}

export async function DELETE(request: Request) {
  try {
    // 1. 鉴权
    const session = await auth();
    const userId = session?.user?.id;

    // No fallback for dev - requiring explicit authentication for security

    if (!userId) {
      return unauthorizedResponse();
    }

    // 2. 获取要删除的 sessionId
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return badRequestResponse("缺少 sessionId 参数", { translationKey: "chatApi.missingSessionId" });
    }

    // 3. 验证会话是否存在且属于当前用户
    const sessionToDelete = await db.session.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    });

    if (!sessionToDelete) {
      return notFoundResponse("会话未找到或无权删除", { translationKey: "chatApi.sessionNotFoundOrNoPermission" });
    }

    // 4. 获取会话中所有消息的附件
    const attachments = await db.attachment.findMany({
      where: {
        message: {
          sessionId: sessionId
        }
      }
    });

    // 5. 删除物理文件
    for (const attachment of attachments) {
      try {
        // 支持旧格式 /uploads/xxx 和新格式 /api/files/{id}
        const filePath = await getFilePathFromUrl(attachment.url, attachment.id);
        
        if (filePath) {
          await fs.unlink(filePath).catch(err => logger.error(`Failed to unlink ${filePath}`, err));
        }
      } catch (err) {
        logger.error(`删除附件文件失败: ${attachment.url}`, err);
        // 继续删除其他文件，不中断流程
      }
    }

    // 6. 执行数据库删除操作
    // 使用事务确保原子性：同时删除消息和会话
    // 由于 Attachment 设置了 onDelete: Cascade，删除 Message 会自动删除 Attachment 记录
    await db.$transaction([
      db.message.deleteMany({
        where: { sessionId: sessionId },
      }),
      db.session.delete({
        where: { id: sessionId },
      }),
    ]);

    // 7. 返回成功响应
    return NextResponse.json(
      { 
        message: "会话已成功删除",
        translationKey: "chatApi.sessionDeletedSuccess"
      },
      { status: 200 }
    );
  } catch (error: any) {
    return createErrorResponse("删除会话时出错", 500, "DELETE_SESSION_ERROR", error, { translationKey: "chatApi.deleteSessionError" });
  }
}

const updateHistorySchema = z.object({
  sessionId: z.string().min(1, "缺少 sessionId 参数"),
  title: z.string().optional(),
  projectId: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    // 1. 鉴权
    const session = await auth();
    const userId = session?.user?.id;

    // No fallback for dev - requiring explicit authentication for security

    if (!userId) {
      return unauthorizedResponse();
    }

    // 2. 获取参数
    const body = await request.json();
    const result = updateHistorySchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { sessionId, title, projectId } = result.data;

    // 3. 验证并更新
    const data: Prisma.SessionUpdateInput = {};
    if (title !== undefined) data.title = title;
    if (projectId !== undefined) {
      if (projectId === null) {
        // 断开项目关联
        data.project = { disconnect: true };
      } else {
        // 验证项目是否存在且属于当前用户
        const project = await db.project.findFirst({
          where: {
            id: projectId,
            userId: userId,
          },
        });
        if (!project) {
          return notFoundResponse("项目未找到或无权访问", { translationKey: "chatApi.projectNotFoundOrNoPermission" });
        }
        // 连接项目
        data.project = { connect: { id: projectId } };
      }
    }

    const updatedSession = await db.session.update({
      where: {
        id: sessionId,
        userId: userId,
      },
      data,
    });

    return NextResponse.json({
      message: "会话更新成功",
      translationKey: "chatApi.sessionUpdatedSuccess",
      session: updatedSession,
    });
  } catch (_error: any) {
    return createErrorResponse("重命名会话时出错", 500, "RENAME_SESSION_ERROR", _error, { translationKey: "chatApi.renameSessionError" });
  }
}