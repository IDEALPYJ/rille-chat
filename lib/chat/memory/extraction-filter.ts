/**
 * 提取结果质量过滤器
 * 在 LLM 提取后、存储前进行质量把关
 */

import { MemoryOperation } from './types';

export interface QualityFilterResult {
  passed: boolean;
  qualityScore: number;
  rejectionReason?: string;
  suggestions?: string[];
}

// 质量检查规则
const QUALITY_RULES = {
  // 1. 长度检查
  length: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const len = op.content.length;
    if (len < 8) return { pass: false, score: 0, reason: 'too_short' };
    if (len < 15) return { pass: true, score: 0.5 };
    if (len > 100) return { pass: true, score: 0.9 };
    return { pass: true, score: 0.7 };
  },
  
  // 2. 具体性检查（避免过于笼统）
  specificity: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const vaguePatterns = [
      /^(?:用户|他|她|这个人)(?:是|有|喜欢).{0,5}$/,
      /^(?:一个|某种).{0,10}$/,
    ];
    for (const pattern of vaguePatterns) {
      if (pattern.test(op.content)) {
        return { pass: false, score: 0, reason: 'too_vague' };
      }
    }
    return { pass: true, score: 0.8 };
  },
  
  // 3. 人称检查（记忆应该是第三人称）
  person: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    const firstPersonCount = (op.content.match(/\b(我|我们|本人|我的)\b/g) || []).length;
    if (firstPersonCount >= 2) {
      return { pass: false, score: 0, reason: 'first_person' };
    }
    if (firstPersonCount === 1) {
      return { pass: true, score: 0.6 };
    }
    return { pass: true, score: 0.9 };
  },
  
  // 4. 信息密度检查
  density: (op: MemoryOperation, originalInput: string): { pass: boolean; score: number; reason?: string } => {
    const ratio = op.content.length / originalInput.length;
    if (ratio > 0.9) return { pass: true, score: 0.5 }; // 过于冗长
    if (ratio < 0.2) return { pass: true, score: 0.6 }; // 过于精简
    if (ratio >= 0.4 && ratio <= 0.7) return { pass: true, score: 0.9 };
    return { pass: true, score: 0.7 };
  },
  
  // 5. 重要性合理性
  importance: (op: MemoryOperation): { pass: boolean; score: number; reason?: string } => {
    if (op.importance < 1 || op.importance > 5) {
      return { pass: false, score: 0, reason: 'invalid_importance' };
    }
    // Profile 类型应该有较高重要性
    if (op.root === 'Profile' && op.importance < 3) {
      return { pass: true, score: 0.6 };
    }
    return { pass: true, score: 0.8 };
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
  
  for (const check of checks) {
    if (!check.pass) {
      return {
        passed: false,
        qualityScore: 0,
        rejectionReason: check.reason,
      };
    }
    totalScore += check.score;
  }
  
  const avgScore = totalScore / checks.length;
  
  return {
    passed: avgScore >= 0.6,
    qualityScore: avgScore,
    rejectionReason: avgScore >= 0.6 ? undefined : 'quality_below_threshold',
  };
}
