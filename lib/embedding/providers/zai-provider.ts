/**
 * ZAI Embedding Provider
 * 直接调用 ZAI API，不使用 OpenAI SDK
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig } from "../types";
import { sanitizeBaseURL } from "@/lib/utils/url-validator";

// 允许的ZAI域名列表
const ALLOWED_ZAI_HOSTS = [
  'open.bigmodel.cn',
  '*.bigmodel.cn',
];

// 默认ZAI API地址
const DEFAULT_ZAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

/**
 * 安全地清理baseURL
 * 修复ReDoS：使用简单的字符串操作代替复杂的正则
 */
function safeCleanBaseURL(url: string): string {
  // 限制输入长度以防止ReDoS
  if (url.length > 500) {
    logger.warn('BaseURL too long, truncating', { length: url.length });
    url = url.slice(0, 500);
  }

  let cleaned = url.trim();

  // 移除 /embeddings 后缀（简单字符串操作）
  if (cleaned.endsWith('/embeddings')) {
    cleaned = cleaned.slice(0, -11);
  } else if (cleaned.endsWith('/embeddings/')) {
    cleaned = cleaned.slice(0, -12);
  }

  // 移除尾部斜杠（简单循环）
  while (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

export class ZAIEmbeddingProvider implements EmbeddingProvider {
  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    // 使用安全的URL清理和验证
    const rawBaseURL = config.baseURL ? safeCleanBaseURL(config.baseURL) : undefined;
    const baseURL = sanitizeBaseURL(rawBaseURL, DEFAULT_ZAI_BASE_URL, ALLOWED_ZAI_HOSTS);
    const url = `${baseURL}/embeddings`;
    
    try {
      const requestBody: any = {
        model: config.model,
        input: text,
      };
      if (config.dimensions) {
        requestBody.dimensions = config.dimensions;
      }
      
      logger.debug("ZAI embedding request", {
        model: config.model,
        dimensions: config.dimensions,
        url,
      });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      logger.debug("ZAI embedding response", {
        model: config.model,
        expectedDimensions: config.dimensions,
        actualDimensions: data.data?.[0]?.embedding?.length,
      });
      
      if (!data.data || data.data.length === 0) {
        throw new Error("Empty embedding response");
      }
      
      return data.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("ZAI embedding error", {
        error: errorMessage,
        model: config.model,
        url,
      });
      throw new Error(`ZAI embedding失败: ${errorMessage}`);
    }
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    // 使用安全的URL清理和验证
    const rawBaseURL = config.baseURL ? safeCleanBaseURL(config.baseURL) : undefined;
    const baseURL = sanitizeBaseURL(rawBaseURL, DEFAULT_ZAI_BASE_URL, ALLOWED_ZAI_HOSTS);
    const url = `${baseURL}/embeddings`;
    
    try {
      const requestBody: any = {
        model: config.model,
        input: texts,
      };
      if (config.dimensions) {
        requestBody.dimensions = config.dimensions;
      }
      
      logger.debug("ZAI batch embedding request", {
        model: config.model,
        dimensions: config.dimensions,
        url,
        batchSize: texts.length,
      });
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      logger.debug("ZAI batch embedding response", {
        model: config.model,
        expectedDimensions: config.dimensions,
        actualDimensions: data.data?.[0]?.embedding?.length,
        responseDataLength: data.data?.length,
      });
      
      if (!data.data || data.data.length !== texts.length) {
        throw new Error(`Embedding count mismatch: expected ${texts.length}, got ${data.data?.length || 0}`);
      }
      
      // 按 index 排序确保顺序正确
      const sortedData = data.data.sort((a: any, b: any) => (a.index || 0) - (b.index || 0));
      return sortedData.map((item: any) => item.embedding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("ZAI batch embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: texts.length,
        url,
      });
      throw new Error(`ZAI批量embedding失败: ${errorMessage}`);
    }
  }
}
