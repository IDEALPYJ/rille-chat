/**
 * 主题聚类服务
 * 按主题分组并生成洞察
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateTopicInsight, calculateFrequencyScore } from "./topic-insight-generation";
import type { TopicInsightResult } from "./topic-insight-generation";

export interface TopicCluster {
  topic: string;
  sessionCount: number;
  sessions: Array<{
    sessionId: string;
    summary: string;
    keyPoints: string[];
    date: Date;
    confidence: number;
  }>;
}

/**
 * 获取未处理的对话主题（按主题分组）
 */
export async function getUnprocessedTopicClusters(
  userId: string,
  minSessions: number = 2
): Promise<TopicCluster[]> {
  // 查询未处理的对话主题
  const rows = await db.$queryRaw<
    Array<{
      primaryTopic: string;
      sessionId: string;
      summary: string;
      keyPoints: string[];
      createdAt: Date;
      confidence: number;
    }>
  >`
    SELECT 
      "primaryTopic",
      "sessionId",
      summary,
      "keyPoints",
      "createdAt",
      confidence
    FROM "SessionTopic"
    WHERE "userId" = ${userId}
      AND status = 'active'
      AND "aggregatedInsightId" IS NULL
    ORDER BY "primaryTopic", "createdAt" ASC
  `;

  // 按主题分组
  const grouped = new Map<string, typeof rows>();
  
  for (const row of rows) {
    if (!grouped.has(row.primaryTopic)) {
      grouped.set(row.primaryTopic, []);
    }
    grouped.get(row.primaryTopic)!.push(row);
  }

  // 构建聚类结果（过滤掉会话数不足的）
  const clusters: TopicCluster[] = [];
  
  for (const [topic, sessions] of grouped) {
    if (sessions.length >= minSessions) {
      clusters.push({
        topic,
        sessionCount: sessions.length,
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          summary: s.summary,
          keyPoints: s.keyPoints,
          date: s.createdAt,
          confidence: s.confidence,
        })),
      });
    }
  }

  return clusters;
}

/**
 * 检查并生成主题洞察
 */
export async function checkAndGenerateInsights(
  userId: string,
  insightModel: string,
  providers: Record<string, any>,
  options: {
    minSessions?: number;
    maxInsightsPerRun?: number;
  } = {}
): Promise<{
  generated: number;
  insights: Array<{ topic: string; insightId: string }>;
}> {
  const { minSessions = 2, maxInsightsPerRun = 5 } = options;

  const result = {
    generated: 0,
    insights: [] as Array<{ topic: string; insightId: string }>,
  };

  try {
    // 1. 获取未处理的主题聚类
    const clusters = await getUnprocessedTopicClusters(userId, minSessions);

    if (clusters.length === 0) {
      logger.debug("No topic clusters found for insight generation", { userId });
      return result;
    }

    logger.debug("Found topic clusters for insight generation", {
      userId,
      clusterCount: clusters.length,
    });

    // 2. 逐个生成洞察（限制每次生成的数量）
    for (let i = 0; i < Math.min(clusters.length, maxInsightsPerRun); i++) {
      const cluster = clusters[i];

      // 生成洞察
      const insightResult = await generateTopicInsight(
        userId,
        cluster.topic,
        cluster.sessions,
        insightModel,
        providers
      );

      if (insightResult && insightResult.confidence >= 0.6) {
        // 保存洞察
        const insightId = await saveTopicInsight(userId, insightResult);

        // 标记对话主题为已处理
        await markSessionsAsProcessed(
          userId,
          cluster.topic,
          insightId
        );

        result.generated++;
        result.insights.push({ topic: cluster.topic, insightId });

        logger.info("Topic insight generated", {
          userId,
          topic: cluster.topic,
          sessionCount: cluster.sessionCount,
          insightId,
        });
      }
    }

    return result;
  } catch (error) {
    logger.error("Failed to check and generate insights", {
      error,
      userId,
    });
    return result;
  }
}

/**
 * 保存主题洞察
 */
async function saveTopicInsight(
  userId: string,
  insight: TopicInsightResult
): Promise<string> {
  const frequencyScore = calculateFrequencyScore(
    insight.sessionCount,
    insight.activeDays,
    Math.ceil(
      (insight.timeSpan.last.getTime() - insight.timeSpan.first.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  const result = await db.$queryRaw<[{ id: string }]>`
    INSERT INTO "TopicInsight" (
      id, "userId", topic, insight, category,
      "sessionCount", "firstSeenAt", "lastSeenAt",
      "activeDays", "frequencyScore", status, confidence,
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), ${userId}, ${insight.topic}, ${insight.insight}, ${insight.category},
      ${insight.sessionCount}, ${insight.timeSpan.first}, ${insight.timeSpan.last},
      ${insight.activeDays}, ${frequencyScore}, 'candidate', ${insight.confidence},
      NOW(), NOW()
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * 标记对话主题为已处理
 */
async function markSessionsAsProcessed(
  userId: string,
  topic: string,
  insightId: string
): Promise<void> {
  await db.$executeRaw`
    UPDATE "SessionTopic"
    SET 
      status = 'processed',
      "processedAt" = NOW(),
      "aggregatedInsightId" = ${insightId}
    WHERE "userId" = ${userId}
      AND "primaryTopic" = ${topic}
      AND "aggregatedInsightId" IS NULL
  `;
}

/**
 * 获取用户的主题洞察列表
 */
export async function getTopicInsights(
  userId: string,
  options: {
    status?: string;
    limit?: number;
    category?: string;
  } = {}
): Promise<
  Array<{
    id: string;
    topic: string;
    insight: string;
    category: string;
    sessionCount: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    confidence: number;
  }>
> {
  const { status = "candidate", limit = 20, category } = options;

  let insights;
  if (category) {
    insights = await db.$queryRaw<
      Array<{
        id: string;
        topic: string;
        insight: string;
        category: string;
        sessionCount: number;
        firstSeenAt: Date;
        lastSeenAt: Date;
        confidence: number;
      }>
    >`
      SELECT 
        id, topic, insight, category,
        "sessionCount", "firstSeenAt", "lastSeenAt",
        confidence
      FROM "TopicInsight"
      WHERE "userId" = ${userId}
        AND status = ${status}
        AND category = ${category}
      ORDER BY confidence DESC, "sessionCount" DESC
      LIMIT ${limit}
    `;
  } else {
    insights = await db.$queryRaw<
      Array<{
        id: string;
        topic: string;
        insight: string;
        category: string;
        sessionCount: number;
        firstSeenAt: Date;
        lastSeenAt: Date;
        confidence: number;
      }>
    >`
      SELECT 
        id, topic, insight, category,
        "sessionCount", "firstSeenAt", "lastSeenAt",
        confidence
      FROM "TopicInsight"
      WHERE "userId" = ${userId}
        AND status = ${status}
      ORDER BY confidence DESC, "sessionCount" DESC
      LIMIT ${limit}
    `;
  }

  return insights;
}
