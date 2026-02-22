/**
 * 向量生成服务
 * 支持可选配置
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";

/**
 * Embedding 生成结果
 */
export interface EmbeddingResult {
  /** 向量数据 */
  embedding: number[];
  
  /** 使用的模型 */
  model: string;
  
  /** 维度 */
  dimensions: number;
  
  /** 消耗的 token 数 */
  tokens: number;
}

/**
 * 解析模型配置字符串
 * @param modelConfig 格式: "provider:model"
 * @returns 解析结果
 */
function parseModelConfig(modelConfig: string): { provider: string; model: string } | null {
  if (!modelConfig || !modelConfig.includes(":")) {
    return null;
  }
  
  const [provider, ...modelParts] = modelConfig.split(":");
  const model = modelParts.join(":"); // 处理 model 名中包含 : 的情况
  
  if (!provider || !model) {
    return null;
  }
  
  return { provider, model };
}

/**
 * 获取 Provider 配置
 * @param providerId Provider ID
 * @param providers 用户配置的 providers
 * @returns Provider 配置或 null
 */
function getProviderConfig(providerId: string, providers: Record<string, any>): any | null {
  const config = providers[providerId];
  if (!config || !config.enabled) {
    return null;
  }
  return config;
}

/**
 * 生成文本的 Embedding 向量
 * 
 * @param text 输入文本
 * @param modelConfig 模型配置，格式: "provider:model"
 * @param providers 用户配置的 providers
 * @returns Embedding 结果，如果未配置或失败则返回 null
 */
export async function generateEmbedding(
  text: string,
  modelConfig: string | undefined,
  providers: Record<string, any>
): Promise<EmbeddingResult | null> {
  // 1. 检查是否配置了 embedding 模型
  if (!modelConfig) {
    logger.debug("No embedding model configured, skipping embedding generation");
    return null;
  }
  
  // 2. 解析模型配置
  const parsed = parseModelConfig(modelConfig);
  if (!parsed) {
    logger.warn("Invalid embedding model config format", { modelConfig });
    return null;
  }
  
  const { provider: providerId, model } = parsed;
  
  // 3. 获取 Provider 配置
  const providerConfig = getProviderConfig(providerId, providers);
  if (!providerConfig) {
    logger.warn("Embedding provider not found or not enabled", { providerId });
    return null;
  }
  
  try {
    // 4. 构建 baseURL
    let baseURL = providerConfig.baseURL;
    if (baseURL && !baseURL.endsWith("/")) {
      baseURL += "/";
    }
    
    // 5. 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: baseURL,
    });
    
    // 6. 调用 Embedding API
    const response = await openai.embeddings.create({
      model: model,
      input: text,
      encoding_format: "float",
    });
    
    const embeddingData = response.data[0];
    
    logger.debug("Embedding generated successfully", {
      provider: providerId,
      model,
      dimensions: embeddingData.embedding.length,
      tokens: response.usage?.total_tokens || 0,
    });
    
    return {
      embedding: embeddingData.embedding,
      model: modelConfig,
      dimensions: embeddingData.embedding.length,
      tokens: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error("Failed to generate embedding", {
      error,
      provider: providerId,
      model,
      textLength: text.length,
    });
    return null;
  }
}

/**
 * 批量生成 Embedding
 * 
 * @param texts 文本数组
 * @param modelConfig 模型配置
 * @param providers 用户配置的 providers
 * @returns Embedding 结果数组，失败项为 null
 */
export async function generateEmbeddings(
  texts: string[],
  modelConfig: string | undefined,
  providers: Record<string, any>
): Promise<(EmbeddingResult | null)[]> {
  if (!modelConfig || texts.length === 0) {
    return texts.map(() => null);
  }
  
  // 批量调用
  const results: (EmbeddingResult | null)[] = [];
  
  for (const text of texts) {
    const result = await generateEmbedding(text, modelConfig, providers);
    results.push(result);
  }
  
  return results;
}

/**
 * 将向量转换为 PostgreSQL 格式
 * @param embedding 向量数组
 * @returns Buffer 格式
 */
export function embeddingToBuffer(embedding: number[]): Buffer {
  // PostgreSQL vector 类型存储为 float4 数组
  const buffer = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

/**
 * 将 Buffer 转换为向量数组
 * @param buffer Buffer 数据
 * @returns 向量数组
 */
export function bufferToEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

/**
 * 计算两个向量的余弦相似度
 * @param a 向量 A
 * @param b 向量 B
 * @returns 相似度 0-1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 检查是否启用了向量模式
 * @param embeddingModel Embedding 模型配置
 * @returns 是否启用
 */
export function isVectorModeEnabled(embeddingModel: string | undefined): boolean {
  return !!embeddingModel && embeddingModel.includes(":");
}
