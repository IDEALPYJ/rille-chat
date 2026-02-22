import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

// Ollama 不提供内置模型，用户需要自行添加
// 用户添加模型时需要设置：模型ID、displayName、输入模态、向量维度、最大输入长度
export const ollamaEmbeddingModelConfigs: EmbeddingModelConfig[] = [];
