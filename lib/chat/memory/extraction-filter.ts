/**
 * 提取结果质量过滤器
 * 在 LLM 提取后、存储前进行质量把关
 * 已放宽：降低门槛，让 LLM 更多参与判断
 */

import { MemoryOperation } from './types';

export interface QualityFilterResult {
  passed: boolean;
  qualityScore: number;
  rejectionReason?: string;
  suggestions?: string[];
}

// 质量检查规则（已放宽）
const QUALITY_RULES = {
  // 1. 长度检查（放宽：<8字符 -> <5字符）
  length: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const len = op.content.length;
    if (len < 5) return { pass: false, score: 0, reason: 'too_short' };  // 原 8
    if (len < 12) return { pass: true, score: 0.6 };  // 原 15
    if (len > 150) return { pass: true, score: 0.9 };  // 原 100
    return { pass: true, score: 0.8 };
  },
  
  // 2. 具体性检查（移除硬拒绝，改为扣分）
  specificity: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const vaguePatterns = [
      /^(?:用户|他|她|这个人)(?:是|有|喜欢).{0,5}$/,
      /^(?:一个|某种).{0,10}$/,
    ];
    for (const pattern of vaguePatterns) {
      if (pattern.test(op.content)) {
        // 不再直接拒绝，而是降低分数
        return { pass: true, score: 0.4, reason: 'potentially_vague' };
      }
    }
    return { pass: true, score: 0.9 };
  },
  
  // 3. 人称检查（放宽：>=2次 -> >=3次）
  person: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const firstPersonCount = (op.content.match(/\b(我|我们|本人|我的)\b/g) || []).length;
    if (firstPersonCount >= 3) {  // 原 2
      return { pass: false, score: 0, reason: 'first_person' };
    }
    if (firstPersonCount >= 2) {  // 原 1
      return { pass: true, score: 0.7 };  // 原 0.6
    }
    if (firstPersonCount === 1) {
      return { pass: true, score: 0.85 };  // 原 0.6
    }
    return { pass: true, score: 0.95 };  // 原 0.9
  },
  
  // 4. 信息密度检查（放宽范围）
  density: (op: MemoryOperation, originalInput: string): { pass: boolean; score: number; reason?: string } => {
    if (originalInput.length === 0) return { pass: true, score: 0.8 };
    const ratio = op.content.length / originalInput.length;
    if (ratio > 0.95) return { pass: true, score: 0.6 }; // 过于冗长 原 0.9
    if (ratio < 0.15) return { pass: true, score: 0.65 }; // 过于精简 原 0.2
    if (ratio >= 0.3 && ratio <= 0.8) return { pass: true, score: 0.9 }; // 原 0.4-0.7
    return { pass: true, score: 0.8 };
  },
  
  // 5. 重要性合理性（放宽 Profile 要求）
  importance: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    if (op.importance < 1 || op.importance > 5) {
      return { pass: false, score: 0, reason: 'invalid_importance' };
    }
    // Profile 类型重要性要求降低
    if (op.root === 'Profile' && op.importance < 2) {  // 原 3
      return { pass: true, score: 0.7 };
    }
    return { pass: true, score: 0.9 };
  },
};

export function filterExtractionQuality(
  operation: MemoryOperation,
  originalInput: string
): QualityFilterResult {
  let totalScore = 0;
  const checks = [
    QUALITY_RULES.length(operation),
    QUALITY_RULES.specificity(operation),
    QUALITY_RULES.person(operation),
    QUALITY_RULES.density(operation, originalInput),
    QUALITY_RULES.importance(operation),
  ];
  
  // 收集所有检查的问题（不再一票否决）
  const issues: string[] = [];
  
  for (const check of checks) {
    if (!check.pass) {
      // 只有严重问题才直接拒绝
      if (check.reason === 'too_short' || check.reason === 'invalid_importance') {
        return {
          passed: false,
          qualityScore: 0,
          rejectionReason: check.reason,
        };
      }
      issues.push(check.reason || 'quality_issue');
    }
    totalScore += check.score;
  }
  
  const avgScore = totalScore / checks.length;
  
  // 降低通过阈值：0.6 -> 0.5
  const passed = avgScore >= 0.5;
  
  return {
    passed,
    qualityScore: avgScore,
    rejectionReason: passed ? undefined : (issues[0] || 'quality_below_threshold'),
    suggestions: issues.length > 0 ? issues : undefined,
  };
}
