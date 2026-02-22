import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const zaiEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "embedding-3",
    displayName: "Embedding 3",
    provider: "zai",
    apiType: "zai:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [2048, 1024, 512, 256],
      default: 2048,
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
    baseURL: "https://open.bigmodel.cn/api/paas/v4/embeddings",
    maxInputTokens: 3072,
    maxBatchSize: 64,
  },
];
