/**
 * 记忆维护服务
 * 定期清理、合并、优化
 */

export interface MaintenanceResult {
  archived: number;
  merged: number;
  cleaned: number;
  reasons: Record<string, number>;
}

export interface MaintenanceOptions {
  archiveUnusedDays?: number;
  minQualityScore?: number;
  mergeThreshold?: number;
  minLength?: number;
}

const DEFAULT_OPTIONS: Required<MaintenanceOptions> = {
  archiveUnusedDays: 90,
  minQualityScore: 0.5,
  mergeThreshold: 0.92,
  minLength: 10,
};

/**
 * 执行维护任务（纯逻辑版本，需要配合数据库使用）
 */
export async function performMaintenance(
  userId: string,
  options: MaintenanceOptions = {},
  dbFns: {
    archiveStale: (userId: string, days: number) => Promise<number>;
    cleanupLowQuality: (userId: string, minLength: number) => Promise<number>;
    findDuplicates: (userId: string, threshold: number) => Promise<Array<{ id1: string; id2: string; similarity: number }>>;
    mergeMemoryPair: (keepId: string, archiveId: string) => Promise<void>;
    getMemoryById: (id: string) => Promise<{ id: string; frequency: number; importance: number } | null>;
  }
): Promise<MaintenanceResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const result: MaintenanceResult = {
    archived: 0,
    merged: 0,
    cleaned: 0,
    reasons: {},
  };
  
  // 1. 归档过期记忆
  const archived = await dbFns.archiveStale(userId, opts.archiveUnusedDays);
  result.archived += archived;
  if (archived > 0) result.reasons['stale'] = archived;
  
  // 2. 清理低质量记忆
  const cleaned = await dbFns.cleanupLowQuality(userId, opts.minLength);
  result.cleaned += cleaned;
  if (cleaned > 0) result.reasons['low_quality'] = cleaned;
  
  // 3. 合并重复记忆
  const pairs = await dbFns.findDuplicates(userId, opts.mergeThreshold);
  let merged = 0;
  const processed = new Set<string>();
  
  for (const pair of pairs) {
    if (processed.has(pair.id1) || processed.has(pair.id2)) continue;
    
    const [m1, m2] = await Promise.all([
      dbFns.getMemoryById(pair.id1),
      dbFns.getMemoryById(pair.id2),
    ]);
    
    if (!m1 || !m2) continue;
    
    // 保留质量更高的
    const keepId = (m1.frequency + m1.importance) >= (m2.frequency + m2.importance) 
      ? m1.id 
      : m2.id;
    const archiveId = keepId === m1.id ? m2.id : m1.id;
    
    await dbFns.mergeMemoryPair(keepId, archiveId);
    
    processed.add(pair.id1);
    processed.add(pair.id2);
    merged++;
  }
  
  result.merged = merged;
  if (merged > 0) result.reasons['duplicate'] = merged;
  
  return result;
}

/**
 * 检查记忆是否需要归档
 */
export function shouldArchiveMemory(
  memory: {
    status: string;
    importance: number;
    frequency: number;
    lastAccessed: Date;
    createdAt: Date;
  },
  options: {
    archiveUnusedDays?: number;
    minImportance?: number;
    minFrequency?: number;
  } = {}
): { shouldArchive: boolean; reason?: string } {
  const { archiveUnusedDays = 90, minImportance = 2, minFrequency = 1 } = options;
  
  if (memory.status !== 'active') {
    return { shouldArchive: false };
  }
  
  // 低重要性且低频使用
  if (memory.importance <= minImportance && memory.frequency <= minFrequency) {
    const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess > archiveUnusedDays) {
      return { shouldArchive: true, reason: 'unused' };
    }
  }
  
  return { shouldArchive: false };
}

/**
 * 检查记忆是否为低质量
 */
export function isLowQualityMemory(
  memory: { content: string; status: string },
  minLength: number = 10
): boolean {
  if (memory.status === 'archived') {
    return false; // 已归档的不需要再处理
  }
  
  return memory.content.length < minLength;
}

/**
 * 计算记忆质量评分
 */
export function calculateMemoryQualityScore(
  memory: {
    content: string;
    frequency: number;
    importance: number;
    lastAccessed: Date;
    createdAt: Date;
  }
): number {
  let score = 0;
  
  // 1. 内容完整度（长度）
  const lengthScore = Math.min(1, memory.content.length / 50);
  score += lengthScore * 0.3;
  
  // 2. 验证频率
  const frequencyScore = Math.min(1, memory.frequency / 5);
  score += frequencyScore * 0.25;
  
  // 3. 重要性
  const importanceScore = memory.importance / 5;
  score += importanceScore * 0.25;
  
  // 4. 时效性（最近访问）
  const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.max(0, 1 - daysSinceAccess / 90);
  score += freshnessScore * 0.2;
  
  return Math.round(score * 100) / 100;
}
