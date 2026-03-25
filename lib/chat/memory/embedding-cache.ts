/**
 * 嵌入缓存系统
 * 避免重复计算 embedding，降低成本
 */

import { createHash } from 'crypto';

// 内存缓存（LRU）
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  
  constructor(private maxSize: number = 1000) {}
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到末尾（最新）
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

const memoryCache = new LRUCache<string, number[]>(1000);

/**
 * 生成缓存键
 */
export function generateCacheKey(content: string, model: string): string {
  return createHash('sha256')
    .update(content.trim() + ':' + model)
    .digest('hex');
}

/**
 * 从内存缓存获取
 */
export function getFromMemoryCache(key: string): number[] | undefined {
  return memoryCache.get(key);
}

/**
 * 设置内存缓存
 */
export function setMemoryCache(key: string, embedding: number[]): void {
  memoryCache.set(key, embedding);
}

/**
 * 清空内存缓存
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * 获取内存缓存大小
 */
export function getMemoryCacheSize(): number {
  return memoryCache.size();
}

// Buffer 与数组互转
export function bufferToArray(buffer: Buffer): number[] {
  const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  return Array.from(floatArray);
}

export function arrayToBuffer(arr: number[]): Buffer {
  const floatArray = new Float32Array(arr);
  return Buffer.from(floatArray.buffer);
}

/**
 * 带缓存的 embedding 生成器（简化版本，需要配合数据库使用）
 */
export async function generateEmbeddingWithCache(
  content: string,
  model: string,
  generateFn: (text: string) => Promise<number[]>,
  dbLookupFn?: (hash: string, model: string) => Promise<number[] | null>,
  dbStoreFn?: (hash: string, content: string, model: string, embedding: number[]) => Promise<void>
): Promise<number[]> {
  const hash = generateCacheKey(content, model);
  
  // 1. 内存缓存
  const memCached = memoryCache.get(hash);
  if (memCached) {
    return memCached;
  }
  
  // 2. 数据库缓存
  if (dbLookupFn) {
    const dbCached = await dbLookupFn(hash, model);
    if (dbCached) {
      memoryCache.set(hash, dbCached);
      return dbCached;
    }
  }
  
  // 3. 生成新的 embedding
  const embedding = await generateFn(content);
  
  // 4. 存储缓存
  memoryCache.set(hash, embedding);
  if (dbStoreFn) {
    await dbStoreFn(hash, content, model, embedding);
  }
  
  return embedding;
}
