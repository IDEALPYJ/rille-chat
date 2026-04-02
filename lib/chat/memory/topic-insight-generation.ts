/**
 * 主题洞察生成服务
 * 基于单对话主题统计生成高层级洞察
 */

import { logger } from "@/lib/logger";
import { callAI } from "./ai-helper";

export interface TopicInsightResult {
  topic: string;
  insight: string;
  category: string;
  sessionCount: number;
  timeSpan: { first: Date; last: Date };
  activeDays: number;
  confidence: number;
}

interface SessionTopicInfo {
  summary: string;
  keyPoints: string[];
  date: Date;
  confidence: number;
}

/**
 * 基于单对话主题生成洞察
 */
export async function generateTopicInsight(
  userId: string,
  topic: string,
  sessionTopics: SessionTopicInfo[],
  insightModel: string,
  providers: Record<string, any>
): Promise<TopicInsightResult | null> {
  if (sessionTopics.length < 2) {
    return null;
  }

  // 按时间排序
  sessionTopics.sort((a, b) => a.date.getTime() - b.date.getTime());

  const firstDate = sessionTopics[0].date;
  const lastDate = sessionTopics[sessionTopics.length - 1].date;
  
  // 计算活跃天数
  const uniqueDays = new Set(
    sessionTopics.map((st) => st.date.toISOString().split("T")[0])
  ).size;

  // 构建提示词（只使用主题摘要，不混合原始对话内容）
  const sessionInfosText = sessionTopics
    .map(
      (info, i) => `
[对话${i + 1}] ${info.date.toISOString().split("T")[0]}
摘要: ${info.summary}
关键点: ${info.keyPoints.join(", ")}
`
    )
    .join("\n");

  const prompt = `基于以下${sessionTopics.length}个"${topic}"相关对话的摘要，生成用户洞察：

对话摘要列表：
${sessionInfosText}

时间跨度：${firstDate.toISOString().split("T")[0]} 至 ${lastDate
    .toISOString()
    .split("T")[0]}
活跃天数：${uniqueDays}天

请生成洞察，描述用户在这个主题上的行为模式和学习特征：
{
  "insight": "用户在过去X天内进行了Y次算法相关讨论，主要集中在二叉树和动态规划，显示出系统性学习的特征。讨论深度逐渐增加，从基础概念到实际应用。",
  "category": "Learning",
  "confidence": 0.88
}

注意：
1. insight 应该具体描述用户的行为模式、学习进度或兴趣特征
2. 可以提及时间分布、内容演进、深度变化等维度
3. confidence 基于证据充分程度（对话数量、时间跨度、内容一致性）`;

  try {
    const response = await callAI({
      model: insightModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      providers,
    });

    const content = response.content.trim();

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("Failed to extract JSON from insight generation response", {
        userId,
        topic,
        response: content.slice(0, 200),
      });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 计算置信度（基于证据充分程度）
    const baseConfidence = parsed.confidence || 0.5;
    const evidenceBoost = Math.min(0.2, (sessionTopics.length - 2) * 0.05);
    const timeBoost = uniqueDays > 7 ? 0.1 : 0;
    const finalConfidence = Math.min(0.95, baseConfidence + evidenceBoost + timeBoost);

    return {
      topic,
      insight: parsed.insight,
      category: parsed.category || "Other",
      sessionCount: sessionTopics.length,
      timeSpan: { first: firstDate, last: lastDate },
      activeDays: uniqueDays,
      confidence: finalConfidence,
    };
  } catch (error) {
    logger.error("Failed to generate topic insight", {
      error,
      userId,
      topic,
      sessionCount: sessionTopics.length,
    });
    return null;
  }
}

/**
 * 计算频次评分
 */
export function calculateFrequencyScore(
  sessionCount: number,
  activeDays: number,
  totalDays: number
): number {
  if (totalDays === 0) return 0;

  // 频次密度（对话数/总天数）
  const density = sessionCount / totalDays;

  // 活跃度（活跃天数/总天数）
  const activity = activeDays / totalDays;

  // 综合评分
  return Math.min(1, density * 0.6 + activity * 0.4);
}
