/**
 * OpenAI Embedding Provider
 * 支持文本embedding，使用标准OpenAI API格式
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig } from "../types";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.openai.com/v1",
      timeout: 60000,
    });

    try {
      const requestParams: any = {
        model: config.model,
        input: text,
      };
      // 如果指定了维度，添加到请求参数中
      if (config.dimensions) {
        requestParams.dimensions = config.dimensions;
      }
      const response = await client.embeddings.create(requestParams);

      if (!response.data || response.data.length === 0) {
        throw new Error("Empty embedding response");
      }

      return response.data[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("OpenAI embedding error", {
        error: errorMessage,
        model: config.model,
      });
      throw new Error(`OpenAI embedding失败: ${errorMessage}`);
    }
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || "https://api.openai.com/v1",
      timeout: 60000,
    });

    try {
      // OpenAI支持批量输入，直接传入数组
      const requestParams: any = {
        model: config.model,
        input: texts,
      };
      // 如果指定了维度，添加到请求参数中
      if (config.dimensions) {
        requestParams.dimensions = config.dimensions;
      }
      const response = await client.embeddings.create(requestParams);

      if (!response.data || response.data.length !== texts.length) {
        throw new Error(`Embedding count mismatch: expected ${texts.length}, got ${response.data?.length || 0}`);
      }

      // 按index排序确保顺序正确
      const sortedData = response.data.sort((a, b) => (a.index || 0) - (b.index || 0));
      return sortedData.map(item => item.embedding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("OpenAI batch embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: texts.length,
      });
      throw new Error(`OpenAI批量embedding失败: ${errorMessage}`);
    }
  }
}

