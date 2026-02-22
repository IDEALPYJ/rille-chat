/**
 * 阿里云文本Embedding Provider
 * 支持字符串和字符串列表两种输入方式
 * 使用兼容模式API: https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig } from "../types";

export class AliyunTextEmbeddingProvider implements EmbeddingProvider {
  private getBaseURL(config: EmbeddingConfig): string {
    return config.baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  }

  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/embeddings`;

    try {
      const requestBody: any = {
        model: config.model,
        input: text, // 字符串形式
        encoding_format: "float",
      };
      // 如果指定了维度，添加到请求参数中
      if (config.dimensions) {
        requestBody.dimensions = config.dimensions;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error("Empty embedding response");
      }

      return data.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Aliyun text embedding error", {
        error: errorMessage,
        model: config.model,
      });
      throw new Error(`阿里云文本embedding失败: ${errorMessage}`);
    }
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/embeddings`;

    try {
      // 使用字符串列表形式
      const requestBody: any = {
        model: config.model,
        input: texts, // 字符串列表形式
        encoding_format: "float",
      };
      // 如果指定了维度，添加到请求参数中
      if (config.dimensions) {
        requestBody.dimensions = config.dimensions;
      }
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length !== texts.length) {
        throw new Error(`Embedding count mismatch: expected ${texts.length}, got ${data.data?.length || 0}`);
      }

      // 按index排序确保顺序正确
      interface EmbeddingItem {
        index?: number;
        embedding: number[];
      }
      const sortedData = (data.data as EmbeddingItem[]).sort((a, b) => (a.index || 0) - (b.index || 0));
      return sortedData.map((item) => item.embedding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Aliyun batch text embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: texts.length,
      });
      throw new Error(`阿里云批量文本embedding失败: ${errorMessage}`);
    }
  }
}

