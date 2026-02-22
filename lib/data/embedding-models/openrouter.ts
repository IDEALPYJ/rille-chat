import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

export const openrouterEmbeddingModelConfigs: EmbeddingModelConfig[] = [
  {
    id: "openai/text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    avatar: "openai",
    provider: "openrouter",
    releasedAt: "2024-01-25",
    apiType: "openrouter:embeddings",
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
    baseURL: "https://openrouter.ai/api/v1",
    maxInputTokens: 8192
  },
  {
    id: "openai/text-embedding-3-large",
    displayName: "Text Embedding 3 Large",
    avatar: "openai",
    provider: "openrouter",
    releasedAt: "2024-01-25",
    apiType: "openrouter:embeddings",
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
    baseURL: "https://openrouter.ai/api/v1",
    maxInputTokens: 8192
  },
  {
    id: "qwen/qwen3-embedding-8b",
    displayName: "Qwen3 Embedding 8B",
    avatar: "qwen",
    provider: "openrouter",
    releasedAt: "2025-06-05",
    apiType: "openrouter:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [4096, 3072, 2048, 1536, 1024, 768, 512, 256],
      default: 4096,
    },
    modalities: {
      input: ["text"],
    },
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.01 }] },
      ],
    },
    baseURL: "https://openrouter.ai/api/v1",
    maxInputTokens: 32000
  },
  {
    id: "qwen/qwen3-embedding-4b",
    displayName: "Qwen3 Embedding 4B",
    avatar: "qwen",
    provider: "openrouter",
    releasedAt: "2025-06-05",
    apiType: "openrouter:embeddings",
    modelType: "text",
    vectorDimensions: {
      dimensions: [2560, 2048, 1536, 1024, 768, 512, 256],
      default: 2560,
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
    baseURL: "https://openrouter.ai/api/v1",
    maxInputTokens: 32768
  },
  {
    id: "google/gemini-embedding-001",
    displayName: "Gemini Embedding 001",
    avatar: "gemini",
    provider: "openrouter",
    releasedAt: "2025-07-14",
    apiType: "openrouter:embeddings",
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
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.15 }] },
      ],
    },
    baseURL: "https://openrouter.ai/api/v1",
    maxInputTokens: 20000
  }
];
