import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const volcengineEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "doubao-embedding-vision-250615",
    displayName: "Doubao Embedding Vision",
    provider: "volcengine",
    releasedAt: "2024-06-15",
    apiType: "volcengine:multimodal-embeddings",
    modelType: "multimodal",
    vectorDimensions: {
      dimensions: [2048, 1024],
      default: 2048,
    },
    modalities: {
      input: ["text", "image", "video"],
    },
    pricing: {
      currency: "CNY",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.70 }] },
        { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.80 }] },
        { type: "video", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.80 }] },
      ],
    },
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    maxInputTokens: 128000,
  },
];
