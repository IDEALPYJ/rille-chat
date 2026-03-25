/**
 * 信息价值评估引擎
 * 轻量级预过滤，不调用 LLM
 */

export interface ValueAssessmentResult {
  score: number;           // 0-1 价值分数
  category: 'high' | 'medium' | 'low' | 'none';
  indicators: string[];    // 检测到的指标
  shouldExtract: boolean;
}

// 价值评估配置
const VALUE_PATTERNS = {
  // 高价值：个人身份信息
  identity: [
    { pattern: /我(?:叫|姓名是|名为)[^，。！？]{1,20}/, weight: 0.9 },
    { pattern: /我(?:来自|住在|居住在)[^，。！？]{1,30}/, weight: 0.85 },
    { pattern: /我(?:职业是|从事|工作是)[^，。！？]{1,30}/, weight: 0.85 },
    { pattern: /我(?:毕业于|在[^。]+上学)[^，。！？]{1,30}/, weight: 0.8 },
  ],
  // 高价值：健康状况
  health: [
    { pattern: /我(?:患有|得过|有|没有)[^，。！？]{0,10}(?:病|症|过敏)/, weight: 0.9 },
    { pattern: /我(?:对[^，。！？]+过敏)/, weight: 0.85 },
  ],
  // 中高价值：偏好与习惯
  preference: [
    { pattern: /我(?:喜欢|热爱|钟爱|偏好)[^，。！？]{2,50}/, weight: 0.75 },
    { pattern: /我(?:讨厌|反感|厌恶|不喜欢)[^，。！？]{2,50}/, weight: 0.75 },
    { pattern: /我(?:习惯|通常|经常)[^，。！？]{2,50}/, weight: 0.7 },
  ],
  // 中高价值：能力与技能
  ability: [
    { pattern: /我(?:擅长|精通|熟练|会)[^，。！？]{2,30}/, weight: 0.8 },
    { pattern: /我(?:不会|不懂|不擅长)[^，。！？]{2,30}/, weight: 0.7 },
    { pattern: /我有[^，。！？]{0,10}(?:证书|资格|经验)/, weight: 0.75 },
  ],
  // 中等价值：目标与计划
  goal: [
    { pattern: /我(?:计划|打算|准备|想要|目标是)[^，。！？]{5,100}/, weight: 0.7 },
    { pattern: /我(?:希望|期望|梦想)[^，。！？]{5,100}/, weight: 0.65 },
  ],
  // 修正信号（高价值，可能涉及更新）
  correction: [
    { pattern: /(?:记错|错了|不对|更正|纠正|其实是|应该说)/, weight: 0.6 },
    { pattern: /(?:改|换|更新)成[^，。！？]+/, weight: 0.5 },
    { pattern: /不(?:是|对|正确|准确)[^，。！？]+/, weight: 0.4 },
  ],
};

// 低价值过滤
const LOW_VALUE_PATTERNS = [
  { pattern: /^(?:好的|OK|嗯|哦|啊|行|可以|知道了|明白|了解)[。！]?$/, penalty: 0.8 },
  { pattern: /^(?:谢谢|感谢|多谢|谢了)[。！]?$/, penalty: 0.8 },
  { pattern: /^(?:为什么|怎么|什么|谁|哪里|什么时候|如何)[^。]{0,10}[?？]$/, penalty: 0.6 },
  { pattern: /^(?:哈哈|呵呵|嘿嘿|嘻嘻|233|666)/, penalty: 0.5 },
  { pattern: /^(?:嗯嗯|对对|是是|好好)/, penalty: 0.4 },
];

export function assessInformationValue(
  userInput: string,
  _aiResponse?: string
): ValueAssessmentResult {
  let score = 0;
  const indicators: string[] = [];
  
  // 1. 评估各维度价值
  for (const [category, patterns] of Object.entries(VALUE_PATTERNS)) {
    for (const { pattern, weight } of patterns) {
      if (pattern.test(userInput)) {
        score += weight;
        if (!indicators.includes(category)) {
          indicators.push(category);
        }
        break; // 每类只计一次
      }
    }
  }
  
  // 2. 记忆意图关键词加成
  const memoryKeywords = ['记住', '别忘了', '记一下', '提醒我'];
  if (memoryKeywords.some(kw => userInput.includes(kw))) {
    score += 0.3;
    indicators.push('memory_intent');
  }
  
  // 3. 低价值内容扣分
  for (const { pattern, penalty } of LOW_VALUE_PATTERNS) {
    if (pattern.test(userInput)) {
      score -= penalty;
      indicators.push('low_value');
      break;
    }
  }
  
  // 4. 长度质量评估
  if (userInput.length < 5) {
    score -= 0.5;
    indicators.push('too_short');
  } else if (userInput.length > 100) {
    score += 0.1;
    indicators.push('substantial');
  }
  
  // 5. 重复内容检测
  const repetitiveMatch = userInput.match(/(.{3,})\1{2,}/);
  if (repetitiveMatch) {
    score -= 0.3;
    indicators.push('repetitive');
  }
  
  // 归一化
  const normalizedScore = Math.max(0, Math.min(1, score));
  
  // 确定类别
  let category: 'high' | 'medium' | 'low' | 'none';
  if (normalizedScore >= 0.7) category = 'high';
  else if (normalizedScore >= 0.5) category = 'medium';
  else if (normalizedScore >= 0.3) category = 'low';
  else category = 'none';
  
  return {
    score: normalizedScore,
    category,
    indicators,
    shouldExtract: normalizedScore >= 0.5,
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
  const { forceInterval = 5, minValueThreshold = 0.5 } = config;
  
  // 1. 价值评估
  const assessment = assessInformationValue(userInput);
  
  // 2. 高价值内容：立即提取
  if (assessment.score >= 0.7) {
    return {
      shouldExtract: true,
      priority: assessment.score >= 0.85 ? 'critical' : 'high',
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
  
  // 4. 低价值：不提取（解决强制提取问题）
  return {
    shouldExtract: false,
    priority: 'low',
    reason: `insufficient_value:${assessment.indicators.join(',')}`,
    valueScore: assessment.score,
  };
}
