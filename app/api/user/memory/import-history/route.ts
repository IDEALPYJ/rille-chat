import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { extractSessionTopic } from "@/lib/chat/memory/session-topic-extraction";
import { checkAndGenerateInsights } from "@/lib/chat/memory/topic-clustering";
// import { getUserSettings } from "@/lib/user/settings";

/**
 * POST /api/user/memory/import-history
 * 导入历史会话进行主题提取
 */
export async function POST(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const {
      batchSize = 20,
      startDate,
      endDate,
      dryRun = false,
    } = body;

    // 获取用户设置（简化处理，实际应从 settings 表读取）
    // const settings = await getUserSettings(userId);
    const extractionModel = body.extractionModel || "openrouter:openai/gpt-4o-mini";
    const providers = body.providers || {};

    const progress = {
      totalSessions: 0,
      processedSessions: 0,
      extractedTopics: 0,
      generatedInsights: 0,
      errors: [] as string[],
    };

    // 1. 查询未处理的历史会话
    const sessions = await db.$queryRaw<
      Array<{ id: string; createdAt: Date }>
    >`
      SELECT s.id, s."createdAt"
      FROM "Session" s
      WHERE s."userId" = ${userId}
        AND s."createdAt" >= ${startDate ? new Date(startDate) : new Date(0)}
        AND s."createdAt" <= ${endDate ? new Date(endDate) : new Date()}
        AND s.id NOT IN (
          SELECT "sessionId" FROM "SessionTopic" WHERE "userId" = ${userId}
        )
      ORDER BY s."createdAt" ASC
    `;

    progress.totalSessions = sessions.length;

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        progress,
        message: "没有需要导入的历史会话",
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        progress,
        message: `试运行：发现 ${sessions.length} 个可导入的会话`,
      });
    }

    // 2. 分批处理
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);

      for (const session of batch) {
        try {
          // 获取会话消息
          const messages = await db.message.findMany({
            where: { sessionId: session.id },
            orderBy: { createdAt: "asc" },
          });

          if (messages.length < 3) {
            progress.processedSessions++;
            continue;
          }

          // 提取主题
          const topicResult = await extractSessionTopic(
            session.id,
            messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
            extractionModel,
            providers
          );

          if (topicResult) {
            // 保存主题
            await db.$executeRaw`
              INSERT INTO "SessionTopic" (
                id, "sessionId", "userId", "primaryTopic", confidence,
                summary, "keyPoints", category, status, "createdAt"
              ) VALUES (
                gen_random_uuid(), ${session.id}, ${userId}, 
                ${topicResult.primaryTopic}, ${topicResult.confidence},
                ${topicResult.summary}, ${topicResult.keyPoints}, 
                ${topicResult.category}, 'active', ${session.createdAt}
              )
            `;
            progress.extractedTopics++;
          }

          progress.processedSessions++;
        } catch (error) {
          const errorMsg = `Session ${session.id}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          progress.errors.push(errorMsg);
        }
      }

      // 每批次处理后尝试生成洞察
      if (i % (batchSize * 2) === 0) {
        try {
          const insightResult = await checkAndGenerateInsights(
            userId,
            extractionModel,
            providers,
            { minSessions: 2, maxInsightsPerRun: 3 }
          );
          progress.generatedInsights += insightResult.generated;
        } catch (error) {
          logger.warn("Failed to generate insights during import", { error });
        }
      }
    }

    // 最终洞察生成
    try {
      const finalInsightResult = await checkAndGenerateInsights(
        userId,
        extractionModel,
        providers,
        { minSessions: 2, maxInsightsPerRun: 5 }
      );
      progress.generatedInsights += finalInsightResult.generated;
    } catch (error) {
      logger.warn("Failed to generate final insights", { error });
    }

    logger.info("Historical session import completed", {
      userId,
      ...progress,
    });

    return NextResponse.json({
      success: true,
      progress,
      message: `导入完成：处理了 ${progress.processedSessions}/${progress.totalSessions} 个会话，提取了 ${progress.extractedTopics} 个主题，生成了 ${progress.generatedInsights} 个洞察`,
    });
  } catch (error) {
    logger.error("Historical import failed", { error, userId });
    return createErrorResponse("Import failed", 500, undefined, error);
  }
}

/**
 * GET /api/user/memory/import-history/status
 * 获取导入状态
 */
export async function GET(_req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const stats = await db.$queryRaw<
      {
        totalSessions: number;
        processedSessions: number;
        extractedTopics: number;
        generatedInsights: number;
      }[]
    >`
      SELECT
        (SELECT COUNT(*) FROM "Session" WHERE "userId" = ${userId}) as "totalSessions",
        (SELECT COUNT(*) FROM "SessionTopic" WHERE "userId" = ${userId}) as "processedSessions",
        (SELECT COUNT(*) FROM "SessionTopic" WHERE "userId" = ${userId} AND status = 'active') as "extractedTopics",
        (SELECT COUNT(*) FROM "TopicInsight" WHERE "userId" = ${userId}) as "generatedInsights"
    `;

    const result = stats[0];

    return NextResponse.json({
      stats: {
        totalSessions: Number(result.totalSessions),
        processedSessions: Number(result.processedSessions),
        pendingSessions:
          Number(result.totalSessions) - Number(result.processedSessions),
        extractedTopics: Number(result.extractedTopics),
        generatedInsights: Number(result.generatedInsights),
      },
    });
  } catch (error) {
    logger.error("Failed to get import status", { error, userId });
    return createErrorResponse("Failed to get status", 500, undefined, error);
  }
}
