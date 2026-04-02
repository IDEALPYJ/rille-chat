import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GET /api/user/memory/topics
 * 获取用户的对话主题列表
 */
export async function GET(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status") || "active";

    const topics = await db.$queryRaw<
      Array<{
        id: string;
        sessionId: string;
        primaryTopic: string;
        confidence: number;
        summary: string;
        keyPoints: string[];
        category: string;
        createdAt: Date;
      }>
    >`
      SELECT 
        id,
        "sessionId",
        "primaryTopic",
        confidence,
        summary,
        "keyPoints",
        category,
        "createdAt"
      FROM "SessionTopic"
      WHERE "userId" = ${userId}
        AND status = ${status}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ topics });
  } catch (error) {
    logger.error("Failed to get session topics", { error, userId });
    return createErrorResponse("Failed to get topics", 500, undefined, error);
  }
}
