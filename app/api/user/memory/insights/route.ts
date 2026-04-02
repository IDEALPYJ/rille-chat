import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GET /api/user/memory/insights
 * 获取用户的主题洞察列表
 */
export async function GET(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "candidate";
    const category = searchParams.get("category");

    let insights;
    if (category) {
      insights = await db.$queryRaw`
        SELECT 
          id,
          topic,
          insight,
          category,
          "sessionCount",
          "firstSeenAt",
          "lastSeenAt",
          "activeDays",
          confidence,
          "createdAt"
        FROM "TopicInsight"
        WHERE "userId" = ${userId}
          AND status = ${status}
          AND category = ${category}
        ORDER BY confidence DESC, "sessionCount" DESC
        LIMIT ${limit}
      `;
    } else {
      insights = await db.$queryRaw`
        SELECT 
          id,
          topic,
          insight,
          category,
          "sessionCount",
          "firstSeenAt",
          "lastSeenAt",
          "activeDays",
          confidence,
          "createdAt"
        FROM "TopicInsight"
        WHERE "userId" = ${userId}
          AND status = ${status}
        ORDER BY confidence DESC, "sessionCount" DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ insights });
  } catch (error) {
    logger.error("Failed to get topic insights", { error, userId });
    return createErrorResponse("Failed to get insights", 500, undefined, error);
  }
}

/**
 * POST /api/user/memory/insights/refresh
 * 手动触发洞察生成
 */
export async function POST(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    // 这里需要调用 checkAndGenerateInsights
    // 但由于需要 model 和 providers，暂时返回提示
    return NextResponse.json({
      success: true,
      message: "洞察生成将在下次对话时自动触发",
    });
  } catch (error) {
    logger.error("Failed to refresh insights", { error, userId });
    return createErrorResponse("Failed to refresh", 500, undefined, error);
  }
}
