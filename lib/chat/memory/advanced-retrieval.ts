/**
 * 高级检索引擎
 * 混合搜索 + 时间衰减 + MMR 重排序
 */

import { Memory } from './types';

// 时间衰减配置（按记忆类型）
const TEMPORAL_DECAY_CONFIG: Record<string, { halfLifeDays: number; enabled: boolean }> = {
  Profile: { halfLifeDays: Infinity, enabled: false },    // 不衰减
  Ability: { halfLifeDays: 365, enabled: true },          // 1年
  Preference: { halfLifeDays: 90, enabled: true },        // 3个月
  Goal: { halfLifeDays: 180, enabled: true },             // 6个月
  Context: { halfLifeDays: 7, enabled: true },            // 1周
};

/**
 * 应用时间衰减
 */
export function applyTemporalDecay(
  score: number,
  memory: Memory,
  now: Date = new Date()
): number {
  const config = TEMPORAL_DECAY_CONFIG[memory.root || 'Context'];
  if (!config.enabled || config.halfLifeDays === Infinity) {
    return score;
  }
  
  const ageInDays = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
  const lambda = Math.LN2 / config.halfLifeDays;
  const decayMultiplier = Math.exp(-lambda * ageInDays);
  
  return score * decayMultiplier;
}

/**
 * 计算时间衰减乘数（用于显示或调试）
 */
export function calculateDecayMultiplier(
  memory: Memory,
  now: Date = new Date()
): number {
  const config = TEMPORAL_DECAY_CONFIG[memory.root || 'Context'];
  if (!config.enabled || config.halfLifeDays === Infinity) {
    return 1;
  }
  
  const ageInDays = (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
  const lambda = Math.LN2 / config.halfLifeDays;
  return Math.exp(-lambda * ageInDays);
}

/**
 * 获取记忆类型的半衰期描述
 */
export function getHalfLifeDescription(root: string): string {
  const config = TEMPORAL_DECAY_CONFIG[root || 'Context'];
  if (!config.enabled || config.halfLifeDays === Infinity) {
    return '永久';
  }
  if (config.halfLifeDays >= 365) {
    return `${Math.round(config.halfLifeDays / 365)}年`;
  }
  if (config.halfLifeDays >= 30) {
    return `${Math.round(config.halfLifeDays / 30)}个月`;
  }
  if (config.halfLifeDays >= 7) {
    return `${Math.round(config.halfLifeDays / 7)}周`;
  }
  return `${config.halfLifeDays}天`;
}
