import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const geminiEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "gemini-embedding-001",
    displayName: "Gemini Embedding 001",
    avatar: "gemini",
    provider: "gemini",
    releasedAt: "2025-07-14",
    apiType: "gemini:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [3072, 1536, 768],
      default: 3072,
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
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    maxInputTokens: 2048,
    maxBatchSize: 2048
  },
];
