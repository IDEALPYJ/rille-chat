/**
 * 重复检测引擎
 * 哈希精确匹配 + 语义相似度检测
 */

import { createHash } from 'crypto';
import { Memory, MemoryOperation } from './types';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'exact' | 'semantic' | 'superset' | 'subset' | 'none';
  existingMemory?: Memory;
  similarity: number;
  recommendedAction: 'skip' | 'merge' | 'update' | 'keep';
}

/**
 * 计算内容哈希
 */
export function computeContentHash(content: string): string {
  return createHash('sha256')
    .update(content.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16); // 取前16位足够
}

/**
 * 计算文本相似度（Jaccard）
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  
  return intersection.size / union.size;
}

/**
 * 检查重复（纯逻辑版本，不依赖数据库）
 * 用于客户端或测试
 */
export function checkDuplicateLocal(
  newMemory: MemoryOperation,
  existingMemories: Memory[]
): DuplicateCheckResult {
  // 1. 精确匹配
  const exactMatch = existingMemories.find(m => 
    m.content.trim().toLowerCase() === newMemory.content.trim().toLowerCase()
  );
  
  if (exactMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'exact',
      existingMemory: exactMatch,
      similarity: 1.0,
      recommendedAction: 'skip',
    };
  }
  
  // 2. 文本相似度检查
  let bestMatch: Memory | undefined;
  let bestSimilarity = 0;
  
  for (const memory of existingMemories) {
    const similarity = calculateTextSimilarity(newMemory.content, memory.content);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = memory;
    }
  }
  
  if (bestSimilarity >= 0.95 && bestMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'semantic',
      existingMemory: bestMatch,
      similarity: bestSimilarity,
      recommendedAction: 'skip',
    };
  }
  
  if (bestSimilarity >= 0.85 && bestMatch) {
    // 检查包含关系
    const newLower = newMemory.content.toLowerCase();
    const existingLower = bestMatch.content.toLowerCase();
    
    if (newLower.includes(existingLower) && newLower.length > existingLower.length * 1.3) {
      return {
        isDuplicate: true,
        duplicateType: 'superset',
        existingMemory: bestMatch,
        similarity: bestSimilarity,
        recommendedAction: 'update',
      };
    }
    
    if (existingLower.includes(newLower) && existingLower.length > newLower.length * 1.3) {
      return {
        isDuplicate: true,
        duplicateType: 'subset',
        existingMemory: bestMatch,
        similarity: bestSimilarity,
        recommendedAction: 'skip',
      };
    }
    
    // 相关但不重复，可以合并
    return {
      isDuplicate: false,
      duplicateType: 'none',
      existingMemory: bestMatch,
      similarity: bestSimilarity,
      recommendedAction: 'merge',
    };
  }
  
  return {
    isDuplicate: false,
    duplicateType: 'none',
    similarity: bestSimilarity,
    recommendedAction: 'keep',
  };
}
