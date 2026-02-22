import { NextRequest, NextResponse } from 'next/server'
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { createErrorResponse, unauthorizedResponse, badRequestResponse } from '@/lib/api-error'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user) {
    return unauthorizedResponse("Unauthorized")
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')

  if (!query) {
    return badRequestResponse("Query parameter is required")
  }

  try {
    const userId = session.user.id

    // 搜索同时包含会话标题和消息内容
    // 1. 找到标题匹配的会话
    const sessionsByTitle = await db.session.findMany({
      where: {
        userId,
        title: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        title: true,
      },
    })

    // 2. 找到消息内容匹配的会话，并返回匹配的消息
    const messages = await db.message.findMany({
      where: {
        session: {
          userId,
        },
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        session: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 3. 组合和去重结果
    const results: Record<string, { id: string; title: string; messages: any[] }> = {}

    // 添加标题匹配的结果
    for (const session of sessionsByTitle) {
      if (!results[session.id]) {
        results[session.id] = { ...session, messages: [] }
      }
    }

    // 添加消息匹配的结果
    for (const message of messages) {
      if (!results[message.session.id]) {
        results[message.session.id] = { ...message.session, messages: [] }
      }
      // 格式化消息数据，确保 contentParts 被正确解析
      const { ...messageData } = message;
      
      // 处理 contentParts：确保它是数组格式
      let contentParts = (messageData as any).contentParts;
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
      
      results[message.session.id].messages.push({
        ...messageData,
        contentParts,
        reasoning_content: (messageData as any).reasoningContent,
        search_results: (messageData as any).searchResults,
      });
    }
    
    // 按会话ID排序，让结果稳定
    const sortedResults = Object.values(results).sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json(sortedResults)
  } catch (error) {
    return createErrorResponse("Search failed", 500, "SEARCH_ERROR", error);
  }
}