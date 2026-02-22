/**
 * 火山引擎多模态Embedding Provider
 * 支持文本和图片
 * 使用API: https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal
 */

import { logger } from "@/lib/logger";
import { EmbeddingProvider, EmbeddingConfig, EmbeddingInput } from "../types";

export class VolcengineVisionEmbeddingProvider implements EmbeddingProvider {
  private getBaseURL(config: EmbeddingConfig): string {
    return config.baseURL || "https://ark.cn-beijing.volces.com/api/v3";
  }

  /**
   * 将输入转换为火山引擎格式
   */
  private convertInput(input: EmbeddingInput): Array<{ type: string; text?: string; image_url?: { url: string } }> | { type: string; text?: string; image_url?: { url: string } } {
    if (typeof input === "string") {
      return {
        type: "text",
        text: input,
      };
    }

    if (Array.isArray(input)) {
      // 字符串数组
      if (typeof input[0] === "string") {
        return (input as string[]).map((text: string) => ({
          type: "text",
          text,
        }));
      }
      // 已经是火山引擎格式的对象数组
      return input as any;
    }

    // 对象格式转换
    if ("text" in input) {
      return {
        type: "text",
        text: input.text,
      };
    }
    if ("image" in input) {
      return {
        type: "image_url",
        image_url: {
          url: input.image,
        },
      };
    }
    if ("video" in input) {
      // 火山引擎可能不支持视频，但先保留接口
      throw new Error("火山引擎embedding暂不支持视频输入");
    }
    if ("multi_images" in input) {
      // 火山引擎可能不支持多图片，但先保留接口
      throw new Error("火山引擎embedding暂不支持多图片输入");
    }

    throw new Error("Unsupported input format");
  }

  async getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
    return this.getMultimodalEmbedding({ text }, config);
  }

  async getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]> {
    return this.getMultimodalEmbeddingsBatch(texts.map(text => ({ text })), config);
  }

  async getMultimodalEmbedding(input: EmbeddingInput, config: EmbeddingConfig): Promise<number[]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/embeddings/multimodal`;
    const inputArray = [this.convertInput(input)];

    try {
      const requestBody: any = {
        model: config.model,
        input: inputArray,
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
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText || response.statusText } };
        }
        throw new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 火山引擎可能返回两种格式：
      // 1. { data: [{ embedding: [...] }] }
      // 2. { data: { embedding: [...] } } 或直接 { embedding: [...] }

      let embedding: number[] | null = null;

      if (data.data) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          // 格式1: 数组格式
          const firstItem = data.data[0];
          if (firstItem && firstItem.embedding && Array.isArray(firstItem.embedding)) {
            embedding = firstItem.embedding;
          } else if (firstItem && Array.isArray(firstItem)) {
            // 如果data.data[0]本身就是数组
            embedding = firstItem;
          }
        } else if (data.data.embedding && Array.isArray(data.data.embedding)) {
          // 格式2: 对象格式
          embedding = data.data.embedding;
        }
      } else if (data.embedding && Array.isArray(data.embedding)) {
        // 直接返回embedding
        embedding = data.embedding;
      }

      if (!embedding || embedding.length === 0) {
        logger.error("Volcengine embedding response structure", { data });
        throw new Error("Empty or invalid embedding response");
      }

      return embedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Volcengine vision embedding error", {
        error: errorMessage,
        model: config.model,
      });
      throw new Error(`火山引擎多模态embedding失败: ${errorMessage}`);
    }
  }

  async getMultimodalEmbeddingsBatch(inputs: EmbeddingInput[], config: EmbeddingConfig): Promise<number[][]> {
    const baseURL = this.getBaseURL(config);
    const url = `${baseURL}/embeddings/multimodal`;
    
    // 将每个输入转换为火山引擎格式，并确保结果是对象（不是数组）
    const inputArray = inputs.map(input => {
      const converted = this.convertInput(input);
      // 如果 convertInput 返回数组（字符串数组情况），只取第一个元素
      // 因为 batch 接口期望每个输入是一个对象
      if (Array.isArray(converted)) {
        return converted[0];
      }
      return converted;
    });

    try {
      const requestBody: any = {
        model: config.model,
        input: inputArray,
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
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText || response.statusText } };
        }
        throw new Error(errorData.error?.message || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 添加详细日志用于诊断
      logger.debug("Volcengine embedding response", {
        model: config.model,
        inputsCount: inputs.length,
        responseDataType: typeof data.data,
        responseDataIsArray: Array.isArray(data.data),
        responseDataLength: Array.isArray(data.data) ? data.data.length : 'not array',
        responseKeys: Object.keys(data),
        fullResponse: data,
      });

      if (!data.data) {
        logger.error("Volcengine embedding no data field", { data });
        throw new Error(`No data field in response: ${JSON.stringify(data)}`);
      }

      // 火山引擎可能返回两种格式：
      // 1. 单条：data 是 object { embedding: [...] }
      // 2. 批量：data 是 array [{ embedding: [...] }, ...]
      
      if (Array.isArray(data.data)) {
        // 批量返回格式
        if (data.data.length !== inputs.length) {
          logger.error("Volcengine embedding count mismatch", {
            expected: inputs.length,
            actual: data.data.length,
            data: data.data,
          });
          throw new Error(`Embedding count mismatch: expected ${inputs.length}, got ${data.data.length}`);
        }
        interface EmbeddingItem {
          embedding: number[];
        }
        return (data.data as EmbeddingItem[]).map((item) => item.embedding);
      } else if (typeof data.data === 'object' && data.data.embedding) {
        // 单条返回格式（虽然发送了批量请求，但可能返回单条）
        logger.warn("Volcengine returned single embedding for batch request", {
          inputsCount: inputs.length,
          response: data.data,
        });
        // 如果只有一个结果，重复它
        const embedding = data.data.embedding;
        return inputs.map(() => embedding);
      } else {
        logger.error("Volcengine embedding unexpected data format", { data });
        throw new Error(`Unexpected data format: ${JSON.stringify(data.data)}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Volcengine batch vision embedding error", {
        error: errorMessage,
        model: config.model,
        batchSize: inputs.length,
      });
      throw new Error(`火山引擎批量多模态embedding失败: ${errorMessage}`);
    }
  }
}

