/**
 * Embedding相关类型定义
 */

export interface EmbeddingConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  dimensions?: number; // 向量维度
}

export interface EmbeddingResult {
  embedding: number[];
  index?: number;
}

export interface EmbeddingResponse {
  data: EmbeddingResult[];
  model: string;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
    input_tokens?: number;
    image_tokens?: number;
  };
}

/**
 * Embedding输入类型
 */
export type EmbeddingInput = 
  | string                    // 单个字符串
  | string[]                  // 字符串列表
  | { text: string }          // 文本对象
  | { image: string }         // 图片URL或Base64
  | { video: string }          // 视频URL
  | { multi_images: string[] } // 多图片
  | Array<{ type: string; text?: string; image_url?: { url: string } }>; // 火山引擎格式

/**
 * Embedding Provider接口
 */
export interface EmbeddingProvider {
  /**
   * 获取单个文本的embedding
   */
  getEmbedding(text: string, config: EmbeddingConfig): Promise<number[]>;
  
  /**
   * 批量获取embeddings（字符串列表）
   */
  getEmbeddingsBatch(texts: string[], config: EmbeddingConfig): Promise<number[][]>;
  
  /**
   * 获取多模态embedding（图片、视频等）
   */
  getMultimodalEmbedding?(input: EmbeddingInput, config: EmbeddingConfig): Promise<number[]>;
  
  /**
   * 批量获取多模态embeddings
   */
  getMultimodalEmbeddingsBatch?(inputs: EmbeddingInput[], config: EmbeddingConfig): Promise<number[][]>;
}

