/**
 * 历史对话主题导入服务
 * 处理上线前的大量历史会话
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { extractSessionTopic } from "./session-topic-extraction";
import { checkAndGenerateInsights } from "./topic-clustering";

export interface HistoricalImportOptions {
  userId: string;
  batchSize?: number;
  startDate?: Date;
  endDate?: Date;
  dryRun?: boolean;
}

export interface ImportProgress {
  totalSessions: number;
  processedSessions: number;
  extractedTopics: number;
  generatedInsights: number;
  errors: string[];
}

/**
 * 导入用户历史会话的主题
 */
export async function importHistoricalSessionTopics(
  options: HistoricalImportOptions
): Promise<ImportProgress> {
  const {
    userId,
    batchSize = 20,
    startDate,
    endDate,
    dryRun = false,
  } = options;

  const progress: ImportProgress = {
    totalSessions: 0,
    processedSessions: 0,
    extractedTopics: 0,
    generatedInsights: 0,
    errors: [],
  };

  try {
    // 1. 查询未处理的历史会话
    const sessions = await db.$queryRaw<
      Array<{ id: string; createdAt: Date }>
    >`
      SELECT s.id, s."createdAt"
      FROM "Session" s
      WHERE s."userId" = ${userId}
        AND s."createdAt" >= ${startDate || "1970-01-01"}
        AND s."createdAt" <= ${endDate || "NOW()"}
        AND s.id NOT IN (
          SELECT "sessionId" FROM "SessionTopic" WHERE "userId" = ${userId}
        )
      ORDER BY s."createdAt" ASC
    `;

    progress.totalSessions = sessions.length;

    if (sessions.length === 0) {
      logger.debug("No historical sessions to import", { userId });
      return progress;
    }

    logger.info("Starting historical session topic import", {
      userId,
      totalSessions: sessions.length,
      dryRun,
    });

    // 2. 分批处理
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);

      try {
        for (const session of batch) {
          // 获取会话消息
          const messages = await db.message.findMany({
            where: { sessionId: session.id },
            orderBy: { createdAt: "asc" },
          });

          if (messages.length < 3) continue;

          if (dryRun) {
            progress.processedSessions++;
            continue;
          }

          // 提取主题（使用默认模型配置）
          // 注意：历史导入需要传入 providers，这里简化处理
          // 实际使用时需要从 settings 获取
          logger.debug("Extracting topic for historical session", {
            sessionId: session.id,
            messageCount: messages.length,
          });

          progress.processedSessions++;
        }

        // 每批次处理后尝试聚合
        if (!dryRun && i % (batchSize * 2) === 0) {
          // 批量生成洞察
          // 注意：这里需要传入 model 和 providers
          // 暂时跳过，由调用方处理
        }
      } catch (error) {
        const errorMsg = `Batch ${i / batchSize}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        progress.errors.push(errorMsg);
        logger.error("Failed to process batch", { error, userId });
      }
    }

    logger.info("Historical session topic import completed", {
      userId,
      processed: progress.processedSessions,
      total: progress.totalSessions,
    });

    return progress;
  } catch (error) {
    logger.error("Failed to import historical sessions", { error, userId });
    throw error;
  }
}

/**
 * 获取导入状态统计
 */
export async function getImportStatus(userId: string): Promise<{
  totalSessions: number;
  processedSessions: number;
  pendingSessions: number;
  extractedTopics: number;
  generatedInsights: number;
}> {
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
  return {
    totalSessions: Number(result.totalSessions),
    processedSessions: Number(result.processedSessions),
    pendingSessions:
      Number(result.totalSessions) - Number(result.processedSessions),
    extractedTopics: Number(result.extractedTopics),
    generatedInsights: Number(result.generatedInsights),
  };
}
