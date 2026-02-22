import { ModelConfig } from "@/lib/types"
import {
  openaiEmbeddingModelConfigs,
  aliyunEmbeddingModelConfigs,
  volcengineEmbeddingModelConfigs,
  zaiEmbeddingModelConfigs,
  geminiEmbeddingModelConfigs,
  openrouterEmbeddingModelConfigs,
  ollamaEmbeddingModelConfigs,
} from "@/lib/data/embedding-models";

/**
 * 初始化的 Vector Provider 列表
 * 从 embedding-providers 导入
 */
export const INITIAL_VECTOR_PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "aliyun", name: "阿里云" },
  { id: "volcengine", name: "火山引擎" },
  { id: "zai", name: "Zai" },
  { id: "gemini", name: "Gemini" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "ollama", name: "Ollama" },
]

/**
 * 默认的 Vector Provider 模型配置
 * 从新的模型定义文件中转换而来，保持与旧格式兼容
 * 
 * 注意：新代码应该直接使用 lib/data/embedding-models 中的模型定义
 * 这个常量仅用于向后兼容
 */
export const DEFAULT_VECTOR_PROVIDER_MODELS: Record<string, Partial<ModelConfig>[]> = {
  openai: openaiEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  aliyun: aliyunEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  volcengine: volcengineEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  zai: zaiEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  gemini: geminiEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  openrouter: openrouterEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
  ollama: ollamaEmbeddingModelConfigs.map(model => ({
    id: model.id,
    vectorDimensions: model.vectorDimensions.default,
    baseURL: model.baseURL,
  })),
}

/**
 * 获取所有 Embedding 模型的向量维度映射
 * 用于数据库列维度验证
 * 返回每个模型的默认维度
 */
export function getVectorDimensionsMap(): Record<string, number> {
  const allModels = [
    ...openaiEmbeddingModelConfigs,
    ...aliyunEmbeddingModelConfigs,
    ...volcengineEmbeddingModelConfigs,
    ...zaiEmbeddingModelConfigs,
    ...geminiEmbeddingModelConfigs,
    ...openrouterEmbeddingModelConfigs,
    ...ollamaEmbeddingModelConfigs,
  ];

  return allModels.reduce((acc, model) => {
    acc[model.id] = model.vectorDimensions.default;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 获取所有 Embedding 模型的完整维度配置
 * 返回每个模型支持的所有维度和默认维度
 */
export function getVectorDimensionsConfig() {
  const allModels = [
    ...openaiEmbeddingModelConfigs,
    ...aliyunEmbeddingModelConfigs,
    ...volcengineEmbeddingModelConfigs,
    ...zaiEmbeddingModelConfigs,
    ...geminiEmbeddingModelConfigs,
    ...openrouterEmbeddingModelConfigs,
    ...ollamaEmbeddingModelConfigs,
  ];

  return allModels.reduce((acc, model) => {
    acc[model.id] = model.vectorDimensions;
    return acc;
  }, {} as Record<string, { dimensions: number[]; default: number }>);
}

/**
 * 获取指定维度的所有模型
 * 检查模型的默认维度是否匹配
 */
export function getModelsByDimension(dimensions: number) {
  const allModels = [
    ...openaiEmbeddingModelConfigs,
    ...aliyunEmbeddingModelConfigs,
    ...volcengineEmbeddingModelConfigs,
    ...zaiEmbeddingModelConfigs,
    ...openrouterEmbeddingModelConfigs,
    ...ollamaEmbeddingModelConfigs,
  ];

  return allModels.filter(model => model.vectorDimensions.default === dimensions);
}

/**
 * 获取支持指定维度的所有模型
 * 检查模型是否支持该维度（在 dimensions 数组中）
 */
export function getModelsSupportingDimension(dimensions: number) {
  const allModels = [
    ...openaiEmbeddingModelConfigs,
    ...aliyunEmbeddingModelConfigs,
    ...volcengineEmbeddingModelConfigs,
    ...zaiEmbeddingModelConfigs,
    ...openrouterEmbeddingModelConfigs,
    ...ollamaEmbeddingModelConfigs,
  ];

  return allModels.filter(model => model.vectorDimensions.dimensions.includes(dimensions));
}
