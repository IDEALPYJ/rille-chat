import { EmbeddingProviderConfig } from '@/lib/types/embedding_model';

export const embeddingProviders: EmbeddingProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    avatar: "openai",
  },
  {
    id: "aliyun",
    name: "阿里云",
    avatar: "aliyun",
  },
  {
    id: "volcengine",
    name: "火山引擎",
    avatar: "volcengine",
  },
  {
    id: "ollama",
    name: "Ollama",
    avatar: "ollama",
  },
];
