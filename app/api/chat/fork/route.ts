import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequestResponse, createErrorResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return unauthorizedResponse();
    }

    const forkSchema = z.object({
      messageId: z.string().min(1, "缺少 messageId"),
      title: z.string().optional(),
    });

    const body = await request.json();
    const result = forkSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { messageId, title } = result.data;

    // 1. 查找源消息及其会话
    const sourceMessage = await db.message.findUnique({
      where: { id: messageId },
      include: { session: true }
    });

    if (!sourceMessage) {
      return notFoundResponse("消息未找到", { translationKey: "chatApi.messageNotFound" });
    }

    // 2. 递归获取所有祖先消息
    const allMessages: any[] = [];
    let currentId: string | null = messageId;
    
    while (currentId) {
      const msg: any = await db.message.findUnique({
        where: { id: currentId },
        include: { attachments: true }
      });
      if (!msg) break;
      allMessages.unshift(msg); // 保证从根到分支点的顺序
      currentId = msg.parentId;
    }

    // 3. 创建新会话
    const newSession = await db.session.create({
      data: {
        userId,
        projectId: sourceMessage.session.projectId,
        title: title || sourceMessage.session.title || "新分支对话",
      }
    });

    // 4. 克隆消息链
    const oldToNewIdMap = new Map<string, string>();
    let lastNewMessageId: string | null = null;

    for (const msg of allMessages) {
      const newMsg = await db.message.create({
        data: {
          sessionId: newSession.id,
          role: msg.role,
          content: msg.content,
          reasoningContent: msg.reasoningContent,
          searchResults: msg.searchResults,
          model: msg.model,
          provider: msg.provider,
          inputTokens: msg.inputTokens,
          outputTokens: msg.outputTokens,
          inputCacheTokens: msg.inputCacheTokens,
          outputCacheTokens: msg.outputCacheTokens,
          totalTokens: msg.totalTokens,
          cost: msg.cost,
          status: msg.status,
          parentId: msg.parentId ? oldToNewIdMap.get(msg.parentId) : null,
          attachments: {
            create: msg.attachments.map((a: any) => ({
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size
            }))
          }
        }
      });
      oldToNewIdMap.set(msg.id, newMsg.id);
      lastNewMessageId = newMsg.id;
    }

    // 5. 更新会话的 currentLeafId 和 messageCount
    if (lastNewMessageId) {
      await db.session.update({
        where: { id: newSession.id },
        data: {
          currentLeafId: lastNewMessageId,
          messageCount: allMessages.length
        }
      });
    }

    return NextResponse.json({ sessionId: newSession.id });
  } catch (_error: any) {
    return createErrorResponse("创建分支对话时出错", 500, "FORK_ERROR", _error, { translationKey: "chatApi.forkError" });
  }
}
