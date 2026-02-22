/**
 * 阿里云多模态Embedding Provider
 * 支持文本、图片、视频、多图片
 * 使用API: https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig, EmbeddingInput } from "../types";

export class AliyunVisionEmbeddingProvider implements EmbeddingProvider {
  private getBaseURL(): string {
    return "https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding";
  }

  /**
   * 将输入转换为阿里云多模态格式
   */
  private convertInput(input: EmbeddingInput): string | Array<{ text?: string; image?: string; video?: string; multi_images?: string[] }> | { text?: string; image?: string; video?: string; multi_images?: string[] } {
    if (typeof input === "string") {
      return input; // 直接传入字符串
    }
    
    if (Array.isArray(input)) {
      // 字符串数组
      if (typeof input[0] === "string") {
        return (input as string[]).map((text: string) => ({ text }));
      }
      // 已经是对象数组
      return input as any;
    }

    // 对象格式
    if ("text" in input) {
      return { text: input.text };
    }
    if ("image" in input) {
      return { image: input.image };
    }
    if ("video" in input) {
      return { video: input.video };
    }
    if ("multi_images" in input) {
      return { multi_images: input.multi_images };
    }

    throw new Error("Unsupported input format");
  }

  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    return this.getMultimodalEmbedding({ text }, config);
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    // 阿里云多模态API不支持在同一个请求中有多个相同类型的输入
    // 对于纯文本批量处理，需要逐个处理
    // 为了提高效率，使用并发处理（但需要控制并发数以避免API限流）
    const concurrency = 5; // 并发数
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(text => this.getMultimodalEmbedding({ text }, config))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  async getMultimodalEmbedding(input: EmbeddingInput, config: EmbeddingConfig): Promise<number[]> {
    const url = this.getBaseURL();
    const contents = [this.convertInput(input)];

    try {
      const requestBody: any = {
        model: config.model,
        input: {
          contents,
        },
      };
      // 如果指定了维度，添加到请求参数中（阿里云多模态使用 parameters.dimension）
      if (config.dimensions) {
        requestBody.parameters = {
          dimension: config.dimensions,
        };
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
        const errorData = await response.json().catch(() => ({
          code: "HTTP_ERROR",
          message: response.statusText
        }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.code) {
        throw new Error(data.message || `API错误: ${data.code}`);
      }

      if (!data.output?.embeddings || data.output.embeddings.length === 0) {
        throw new Error("Empty embedding response");
      }

      return data.output.embeddings[0].embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Aliyun vision embedding error", {
        error: errorMessage,
        model: config.model,
      });
      throw new Error(`阿里云多模态embedding失败: ${errorMessage}`);
    }
  }

  async getMultimodalEmbeddingsBatch(inputs: EmbeddingInput[], config: EmbeddingConfig): Promise<number[][]> {
    const url = this.getBaseURL();
    const contents = inputs.map(input => this.convertInput(input));

    try {
      const requestBody: any = {
        model: config.model,
        input: {
          contents,
        },
      };
      // 如果指定了维度，添加到请求参数中（阿里云多模态使用 parameters.dimension）
      if (config.dimensions) {
        requestBody.parameters = {
          dimension: config.dimensions,
        };
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
        const errorData = await response.json().catch(() => ({
          code: "HTTP_ERROR",
          message: response.statusText
        }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.code) {
        throw new Error(data.message || `API错误: ${data.code}`);
      }

      if (!data.output?.embeddings || data.output.embeddings.length !== inputs.length) {
        throw new Error(`Embedding count mismatch: expected ${inputs.length}, got ${data.output?.embeddings?.length || 0}`);
      }

      // 按index排序确保顺序正确
      interface EmbeddingItem {
        index?: number;
        embedding: number[];
      }
      const sortedData = (data.output.embeddings as EmbeddingItem[]).sort((a, b) => (a.index || 0) - (b.index || 0));
      return sortedData.map((item) => item.embedding);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Aliyun batch vision embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: inputs.length,
      });
      throw new Error(`阿里云批量多模态embedding失败: ${errorMessage}`);
    }
  }
}

