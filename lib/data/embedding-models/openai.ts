import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const openaiEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    provider: "openai",
    releasedAt: "2024-01-25",
    apiType: "openai:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [1536, 1024, 768, 512],
      default: 1536,
    },
    modalities: {
      input: ["text"],
    },
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.02 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputTokens: 8192,
    maxBatchSize: 2048
  },
  {
    id: "text-embedding-3-large",
    displayName: "Text Embedding 3 Large",
    provider: "openai",
    releasedAt: "2024-01-25",
    apiType: "openai:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [3072, 2048, 1536, 1024, 768, 512, 256],
      default: 3072,
    },
    modalities: {
      input: ["text"],
    },
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.13 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputTokens: 8192,
    maxBatchSize: 2048,
  },
];
