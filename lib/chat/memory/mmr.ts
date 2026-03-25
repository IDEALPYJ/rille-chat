/**
 * Maximal Marginal Relevance (MMR) 重排序
 * 平衡相关性与多样性
 */

export interface MMRItem {
  id: string;
  score: number;
  content: string;
}

export interface MMRConfig {
  enabled: boolean;
  lambda: number;  // 0 = 最大多样性, 1 = 最大相关性
  maxResults: number;
}

export const DEFAULT_MMR_CONFIG: MMRConfig = {
  enabled: true,
  lambda: 0.7,
  maxResults: 5,
};

/**
 * 分词（支持中英文）
 */
function tokenize(text: string): Set<string> {
  const tokens = text.toLowerCase().match(/[\u4e00-\u9fa5]|[a-z0-9]+/g) || [];
  return new Set(tokens);
}

/**
 * 计算 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  
  return intersection.size / union.size;
}

/**
 * 计算文本相似度
 */
function _textSimilarity(a: string, b: string): number {
  return jaccardSimilarity(tokenize(a), tokenize(b));
}

/**
 * 计算与已选项目的最大相似度
 */
function maxSimilarityToSelected(
  item: MMRItem,
  selectedItems: MMRItem[],
  tokenCache: Map<string, Set<string>>
): number {
  if (selectedItems.length === 0) {
    return 0;
  }

  let maxSim = 0;
  const itemTokens = tokenCache.get(item.id) ?? tokenize(item.content);

  for (const selected of selectedItems) {
    const selectedTokens = tokenCache.get(selected.id) ?? tokenize(selected.content);
    const sim = jaccardSimilarity(itemTokens, selectedTokens);
    if (sim > maxSim) {
      maxSim = sim;
    }
  }

  return maxSim;
}

/**
 * MMR 重排序
 */
export function mmrRerank<T extends MMRItem>(
  items: T[],
  config: Partial<MMRConfig> = {}
): T[] {
  const { enabled, lambda, maxResults } = { ...DEFAULT_MMR_CONFIG, ...config };
  
  if (!enabled || items.length <= 1) {
    return items.slice(0, maxResults);
  }
  
  const selected: T[] = [];
  const remaining = new Set(items);
  
  // 预分词
  const tokenCache = new Map<string, Set<string>>();
  for (const item of items) {
    tokenCache.set(item.id, tokenize(item.content));
  }
  
  // 归一化分数
  const maxScore = Math.max(...items.map(i => i.score));
  const minScore = Math.min(...items.map(i => i.score));
  const scoreRange = maxScore - minScore || 1;
  
  const normalizeScore = (score: number) => (score - minScore) / scoreRange;
  
  // 迭代选择
  while (selected.length < maxResults && remaining.size > 0) {
    let bestItem: T | null = null;
    let bestMMRScore = -Infinity;
    
    for (const candidate of remaining) {
      const relevance = normalizeScore(candidate.score);
      const maxSim = maxSimilarityToSelected(candidate, selected, tokenCache);
      
      // MMR 分数 = λ * 相关性 - (1-λ) * 最大相似度
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      
      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestItem = candidate;
      }
    }
    
    if (bestItem) {
      selected.push(bestItem);
      remaining.delete(bestItem);
    } else {
      break;
    }
  }
  
  return selected;
}

/**
 * 应用到记忆检索结果
 */
export interface MemoryMMRItem {
  id: string;
  content: string;
  score: number;
  [key: string]: unknown;
}

export function applyMMRToMemories<T extends MemoryMMRItem>(
  items: T[],
  config?: Partial<MMRConfig>
): T[] {
  const mmrItems: MMRItem[] = items.map(item => ({
    id: item.id,
    score: item.score,
    content: item.content,
  }));
  
  const reranked = mmrRerank(mmrItems, config);
  const idOrder = new Map(reranked.map((item, index) => [item.id, index]));
  
  // 保持原始项的完整数据，但按 MMR 顺序排列
  return items
    .filter(item => idOrder.has(item.id))
    .sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
}
