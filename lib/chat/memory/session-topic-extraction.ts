/**
 * 单对话主题提取服务
 * 从单个对话中提取主题信息
 */

import { logger } from "@/lib/logger";
import { callAI } from "./ai-helper";

export interface SessionTopicResult {
  primaryTopic: string;
  confidence: number;
  summary: string;
  keyPoints: string[];
  category: "Learning" | "Interest" | "Skill" | "Goal" | "Other";
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * 从单个对话提取主题
 */
export async function extractSessionTopic(
  sessionId: string,
  messages: Message[],
  extractionModel: string,
  providers: Record<string, any>
): Promise<SessionTopicResult | null> {
  // 过滤掉过短的对话
  if (messages.length < 3) {
    logger.debug("Session too short, skipping topic extraction", {
      sessionId,
      messageCount: messages.length,
    });
    return null;
  }

  // 构建对话内容
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${m.content.slice(0, 500)}`)
    .join("\n");

  const prompt = `分析以下对话，提取主题信息：

对话内容：
${conversationText}

请分析这个对话的主要主题，并输出 JSON 格式：
{
  "primaryTopic": "主要主题（如：算法学习、前端开发、生活闲聊）",
  "confidence": 0.85,
  "summary": "对话摘要（30-50字）",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "category": "Learning"
}

category 可选值：
- Learning: 学习/知识获取
- Interest: 兴趣爱好
- Skill: 技能/能力
- Goal: 目标/计划
- Other: 其他

注意：
1. primaryTopic 应该简洁明确，如"算法学习"、"React开发"、"旅游规划"
2. confidence 是 0-1 之间的置信度
3. 如果对话主题不明确，confidence 应该低于 0.6`;

  try {
    const response = await callAI({
      model: extractionModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      providers,
    });

    const content = response.content.trim();
    
    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("Failed to extract JSON from topic extraction response", {
        sessionId,
        response: content.slice(0, 200),
      });
      return null;
    }

    const result = JSON.parse(jsonMatch[0]) as SessionTopicResult;

    // 验证结果
    if (!result.primaryTopic || result.confidence < 0.5) {
      logger.debug("Topic extraction confidence too low", {
        sessionId,
        confidence: result.confidence,
      });
      return null;
    }

    logger.debug("Session topic extracted", {
      sessionId,
      primaryTopic: result.primaryTopic,
      confidence: result.confidence,
      category: result.category,
    });

    return result;
  } catch (error) {
    logger.error("Failed to extract session topic", {
      error,
      sessionId,
    });
    return null;
  }
}

/**
 * 批量提取多个对话的主题
 */
export async function extractSessionTopicsBatch(
  sessions: Array<{ sessionId: string; messages: Message[] }>,
  extractionModel: string,
  providers: Record<string, any>
): Promise<Map<string, SessionTopicResult>> {
  const results = new Map<string, SessionTopicResult>();

  for (const session of sessions) {
    const result = await extractSessionTopic(
      session.sessionId,
      session.messages,
      extractionModel,
      providers
    );
    if (result) {
      results.set(session.sessionId, result);
    }
  }

  return results;
}
