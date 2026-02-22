/**
 * Ollama Embedding Provider
 * 支持本地Ollama服务的embedding模型
 * 使用API: http://localhost:11434/api/embeddings
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig } from "../types";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private getBaseURL(config: EmbeddingConfig): string {
    // Ollama的embedding API路径与chat不同
    const baseURL = config.baseURL || "http://localhost:11434";
    // 移除末尾的/v1（如果有），因为Ollama的embedding API在/api/embeddings
    return baseURL.replace(/\/v1\/?$/, "");
  }

  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/api/embeddings`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || response.statusText };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding) || data.embedding.length === 0) {
        throw new Error("Empty embedding response");
      }

      return data.embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Ollama embedding error", {
        error: errorMessage,
        model: config.model,
        baseURL: this.getBaseURL(config),
      });
      throw new Error(`Ollama embedding失败: ${errorMessage}`);
    }
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    // Ollama不支持批量请求，需要逐个请求
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      try {
        const embedding = await this.getEmbedding(text, config);
        embeddings.push(embedding);
        
        // 添加小延迟避免过载
        if (texts.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Ollama batch embedding error", {
          error: errorMessage,
          model: config.model,
          textIndex: embeddings.length,
        });
        throw error;
      }
    }
    
    return embeddings;
  }
}

