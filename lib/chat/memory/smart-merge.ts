/**
 * 智能合并策略
 * 学习 OpenClaw 的增量更新思想
 */

import { Memory, MemoryOperation } from './types';

export interface MergeStrategy {
  type: 'replace' | 'append' | 'intelligent' | 'skip';
  content?: string;
  reason: string;
}

/**
 * 选择合并策略
 */
export function selectMergeStrategy(
  existing: Memory,
  newOp: MemoryOperation
): MergeStrategy {
  const existingLen = existing.content.length;
  const newLen = newOp.content.length;
  const existingLower = existing.content.toLowerCase();
  const newLower = newOp.content.toLowerCase();
  
  // 1. 新内容是子集：跳过
  if (existingLower.includes(newLower) && existingLen > newLen * 1.2) {
    return { type: 'skip', reason: 'existing_is_superset' };
  }
  
  // 2. 现有内容是子集：替换
  if (newLower.includes(existingLower) && newLen > existingLen * 1.2) {
    return { type: 'replace', content: newOp.content, reason: 'new_is_superset' };
  }
  
  // 3. 长度相近但内容不同：智能合并
  if (Math.abs(existingLen - newLen) / Math.max(existingLen, newLen) < 0.3) {
    return { type: 'intelligent', reason: 'similar_length' };
  }
  
  // 4. 其他情况：追加
  return { type: 'append', reason: 'complementary_info' };
}

/**
 * 智能合并（使用 LLM）
 */
export async function intelligentlyMerge(
  existing: Memory,
  newOp: MemoryOperation,
  llmCall: (prompt: string) => Promise<string>
): Promise<string> {
  const prompt = `请将以下两段关于用户的信息合并为一段完整、准确的描述。

现有信息：${existing.content}
新信息：${newOp.content}

要求：
1. 保留所有关键信息，不遗漏
2. 如果信息有冲突，以新信息为准
3. 去除冗余，保持简洁（不超过60字）
4. 使用第三人称
5. 直接输出合并后的内容，不要解释`;

  const merged = await llmCall(prompt);
  return merged.trim();
}

/**
 * 执行合并
 */
export async function executeMerge(
  existing: Memory,
  newOp: MemoryOperation,
  strategy: MergeStrategy,
  llmCall?: (prompt: string) => Promise<string>
): Promise<{ success: boolean; finalContent: string }> {
  let finalContent: string;
  
  switch (strategy.type) {
    case 'skip':
      return { success: false, finalContent: existing.content };
      
    case 'replace':
      finalContent = strategy.content || newOp.content;
      break;
      
    case 'intelligent':
      if (!llmCall) {
        // 没有 LLM 时，选择更详细的那个
        finalContent = newOp.content.length > existing.content.length 
          ? newOp.content 
          : existing.content;
      } else {
        finalContent = await intelligentlyMerge(existing, newOp, llmCall);
      }
      break;
      
    case 'append':
      finalContent = `${existing.content}；${newOp.content}`;
      break;
      
    default:
      finalContent = newOp.content;
  }
  
  return { success: true, finalContent };
}
