import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const aliyunEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "text-embedding-v4",
    displayName: "Text Embedding V4",
    avatar: "aliyun",
    provider: "aliyun",
    apiType: "aliyun:text-embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [2048, 1536, 1024, 768, 512, 256, 128, 64],
      default: 1024,
    },
    modalities: {
      input: ["text"],
    },
    pricing: {
      currency: "CNY",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
      ],
    },
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    maxInputTokens: 8192,
    maxBatchSize: 10,
  },
  {
    id: "qwen3-vl-embedding",
    displayName: "Qwen3 VL Embedding",
    avatar: "qwen",
    provider: "aliyun",
    apiType: "aliyun:multimodal-embeddings",
    modelType: "multimodal",
    vectorDimensions: {
      dimensions: [2560, 2048, 1536, 1024, 768, 512, 256],
      default: 1024,
    },
    modalities: {
      input: ["text", "image", "video"],
    },
    pricing: {
      currency: "CNY",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.70 }] },
        { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.80 }] },
      ],
    },
    baseURL: "https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding",
    maxInputTokens: 32000,
    maxBatchSize: 20,
  },
];
