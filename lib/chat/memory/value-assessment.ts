/**
 * 信息价值评估引擎
 * 轻量级预过滤，不调用 LLM
 * 已简化：移除正则匹配，让 LLM 自行判断价值
 */

export interface ValueAssessmentResult {
  score: number;           // 0-1 价值分数
  category: 'high' | 'medium' | 'low' | 'none';
  indicators: string[];    // 检测到的指标
  shouldExtract: boolean;
}

// 仅保留明显的低价值过滤（无意义的短回复）
const LOW_VALUE_PATTERNS = [
  { pattern: /^(?:好的|OK|嗯|哦|啊|行|可以|知道了|明白|了解|ok|okay)[。！]?$/i, penalty: 0.5 },
  { pattern: /^(?:谢谢|感谢|多谢|谢了)[。！]?$/, penalty: 0.5 },
  { pattern: /^(?:哈哈|呵呵|嘿嘿|嘻嘻|233|666|hhh)[。！]*$/, penalty: 0.4 },
];

export function assessInformationValue(
  userInput: string,
  _aiResponse?: string
): ValueAssessmentResult {
  let score = 0.5;  // 默认中等价值，让 LLM 判断
  const indicators: string[] = ['default_assessment'];
  
  // 1. 记忆意图关键词加成（用户明确要求记住）
  const memoryKeywords = ['记住', '别忘了', '记一下', '提醒我', '帮我记着'];
  if (memoryKeywords.some(kw => userInput.includes(kw))) {
    score += 0.3;
    indicators.push('memory_intent');
  }
  
  // 2. 明显的低价值内容扣分（仅限无意义短回复）
  for (const { pattern, penalty } of LOW_VALUE_PATTERNS) {
    if (pattern.test(userInput)) {
      score -= penalty;
      indicators.push('low_value');
      break;
    }
  }
  
  // 3. 基础长度检查（极短内容降低优先级）
  if (userInput.length < 3) {
    score -= 0.3;
    indicators.push('too_short');
  } else if (userInput.length > 50) {
    score += 0.1;
    indicators.push('substantial');
  }
  
  // 4. 重复内容检测
  const repetitiveMatch = userInput.match(/(.{3,})\1{2,}/);
  if (repetitiveMatch) {
    score -= 0.2;
    indicators.push('repetitive');
  }
  
  // 归一化
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // 确定类别（降低阈值）
  let category: 'high' | 'medium' | 'low' | 'none';
  if (normalizedScore >= 0.6) category = 'high';
  else if (normalizedScore >= 0.4) category = 'medium';
  else if (normalizedScore >= 0.2) category = 'low';
  else category = 'none';
  
  return {
    score: normalizedScore,
    category,
    indicators,
    shouldExtract: normalizedScore >= 0.3,  // 降低阈值到 0.3
  };
}

export interface TriggerDecision {
  shouldExtract: boolean;
  priority: 'critical' | 'high' | 'normal' | 'low';
  reason: string;
  valueScore: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function makeTriggerDecision(
  userInput: string,
  conversationHistory: Message[],
  lastExtractionRound: number,
  config: {
    forceInterval?: number;
    minValueThreshold?: number;
  } = {}
): TriggerDecision {
  // 降低阈值和间隔，让 LLM 更多地参与判断
  const { forceInterval = 3, minValueThreshold = 0.3 } = config;
  
  // 1. 价值评估
  const assessment = assessInformationValue(userInput);
  
  // 2. 高价值内容：立即提取
  if (assessment.score >= 0.6) {
    return {
      shouldExtract: true,
      priority: assessment.score >= 0.8 ? 'critical' : 'high',
      reason: `high_value:${assessment.indicators.slice(0, 3).join(',')}`,
      valueScore: assessment.score,
    };
  }
  
  // 3. 中等价值 + 轮次到达：提取
  const roundsSinceLast = conversationHistory.length - lastExtractionRound;
  if (assessment.score >= minValueThreshold && roundsSinceLast >= forceInterval) {
    return {
      shouldExtract: true,
      priority: 'normal',
      reason: `interval:${assessment.indicators.slice(0, 2).join(',')}`,
      valueScore: assessment.score,
    };
  }
  
  // 4. 低价值但非无意义：仍尝试让 LLM 判断（放宽条件）
  if (assessment.score >= 0.2 && userInput.length >= 5) {
    return {
      shouldExtract: true,
      priority: 'low',
      reason: `llm_judgement:${assessment.indicators.join(',')}`,
      valueScore: assessment.score,
    };
  }
  
  // 5. 极低价值：不提取
  return {
    shouldExtract: false,
    priority: 'low',
    reason: `insufficient_value:${assessment.indicators.join(',')}`,
    valueScore: assessment.score,
  };
}
