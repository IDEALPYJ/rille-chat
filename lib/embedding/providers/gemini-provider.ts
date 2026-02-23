/**
 * Gemini Embedding Provider
 * 支持文本embedding，使用Google Gemini API
 * API文档: https://ai.google.dev/api/embeddings
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig } from "../types";

// 默认Gemini API地址
const DEFAULT_GEMINI_EMBEDDING_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * 获取安全的Gemini embedding baseURL
 * 严格验证用户提供的URL，只允许Google API域名
 */
function getSafeGeminiEmbeddingBaseURL(userBaseURL: string | undefined): string {
  if (!userBaseURL) {
    return DEFAULT_GEMINI_EMBEDDING_BASE_URL;
  }

  try {
    const parsed = new URL(userBaseURL);

    // 只允许HTTPS协议
    if (parsed.protocol !== 'https:') {
      logger.warn('Invalid protocol for Gemini embedding, using default', { protocol: parsed.protocol });
      return DEFAULT_GEMINI_EMBEDDING_BASE_URL;
    }

    // 严格检查允许的域名
    const allowedDomains = ['generativelanguage.googleapis.com', 'googleapis.com'];
    const isAllowed = allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
    });

    if (!isAllowed) {
      logger.warn('Domain not in allowlist for Gemini embedding, using default', {
        hostname: parsed.hostname,
      });
      return DEFAULT_GEMINI_EMBEDDING_BASE_URL;
    }

    return userBaseURL;
  } catch (error) {
    logger.warn('Invalid baseURL format for Gemini embedding, using default', { error });
    return DEFAULT_GEMINI_EMBEDDING_BASE_URL;
  }
}

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  private getBaseURL(config: EmbeddingConfig): string {
    return getSafeGeminiEmbeddingBaseURL(config.baseURL);
  }

  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/models/${config.model}:embedContent?key=${config.apiKey}`;

    try {
      const requestBody: any = {
        model: `models/${config.model}`,
        content: {
          parts: [{ text }],
        },
      };
      // 如果指定了维度，添加到请求参数中（Gemini使用 outputDimensionality）
      if (config.dimensions) {
        requestBody.outputDimensionality = config.dimensions;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
        throw new Error("Empty or invalid embedding response");
      }

      return data.embedding.values;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Gemini embedding error", {
        error: errorMessage,
        model: config.model,
      });
      throw new Error(`Gemini embedding失败: ${errorMessage}`);
    }
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    // Gemini 的 batchEmbedContents 不支持 outputDimensionality 参数
    // 所以改为并发调用单条接口
    try {
      // 并发处理所有文本
      const promises = texts.map(text => this.getEmbedding(text, config));
      const results = await Promise.all(promises);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Gemini batch embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: texts.length,
      });
      throw new Error(`Gemini批量embedding失败: ${errorMessage}`);
    }
  }
}
