import { EmbeddingModelConfig } from '@/lib/types/embedding_model';

// 导出各 Provider 的模型配置（用于同步访问）
export { openaiEmbeddingModelConfigs } from './openai';
export { aliyunEmbeddingModelConfigs } from './aliyun';
export { volcengineEmbeddingModelConfigs } from './volcengine';
export { zaiEmbeddingModelConfigs } from './zai';
export { geminiEmbeddingModelConfigs } from './gemini';
export { openrouterEmbeddingModelConfigs } from './openrouter';
export { ollamaEmbeddingModelConfigs } from './ollama';

// 缓存所有模型配置
let allEmbeddingModelsCache: EmbeddingModelConfig[] | null = null;

/**
 * 获取所有 Embedding 模型配置
 * @returns 所有 Embedding 模型配置数组
 */
export async function getAllEmbeddingModels(): Promise<EmbeddingModelConfig[]> {
  if (allEmbeddingModelsCache) {
    return allEmbeddingModelsCache;
  }

  const providers = [
    'openai', 'aliyun', 'volcengine', 'zai', 'gemini', 'openrouter', 'ollama'
  ];

  const allModels: EmbeddingModelConfig[] = [];

  for (const provider of providers) {
    const models = await loadEmbeddingModelsForProvider(provider);
    allModels.push(...models);
  }

  allEmbeddingModelsCache = allModels;
  return allModels;
}

/**
 * 根据模型ID获取模型配置
 * @param modelId 模型ID
 * @returns 模型配置，未找到返回undefined
 */
export async function getEmbeddingModelById(modelId: string): Promise<EmbeddingModelConfig | undefined> {
  const allModels = await getAllEmbeddingModels();
  return allModels.find(model => model.id === modelId);
}

/**
 * 根据 Provider ID 获取该 Provider 的所有模型
 * @param providerId Provider ID
 * @returns 该 Provider 的模型配置数组
 */
export async function getEmbeddingModelsByProvider(providerId: string): Promise<EmbeddingModelConfig[]> {
  const allModels = await getAllEmbeddingModels();
  return allModels.filter(model => model.provider === providerId);
}

/**
 * 获取所有文本类型的 Embedding 模型
 * @returns 文本类型的模型配置数组
 */
export async function getTextEmbeddingModels(): Promise<EmbeddingModelConfig[]> {
  const allModels = await getAllEmbeddingModels();
  return allModels.filter(model => model.modelType === 'text');
}

/**
 * 获取所有多模态类型的 Embedding 模型
 * @returns 多模态类型的模型配置数组
 */
export async function getMultimodalEmbeddingModels(): Promise<EmbeddingModelConfig[]> {
  const allModels = await getAllEmbeddingModels();
  return allModels.filter(model => model.modelType === 'multimodal');
}

/**
 * 动态加载指定 Provider 的模型配置
 * @param providerId Provider ID，如 "openai", "aliyun" 等
 * @returns 模型配置数组，如果加载失败则返回空数组
 */
export async function loadEmbeddingModelsForProvider(providerId: string): Promise<EmbeddingModelConfig[]> {
  try {
    // 构造导出变量名：providerId + "EmbeddingModelConfigs"
    const exportName = `${providerId}EmbeddingModelConfigs`;
    
    // 动态导入模块
    const providerModule = await import(`./${providerId}`);
    
    // 获取导出的模型配置
    const configs = providerModule[exportName];
    
    if (!configs || !Array.isArray(configs)) {
      console.warn(`[EmbeddingModelLoader] Invalid model configs for provider: ${providerId}`);
      return [];
    }
    
    return configs;
  } catch (error) {
    // 如果文件不存在或加载失败，返回空数组
    console.warn(`[EmbeddingModelLoader] Failed to load models for provider: ${providerId}`, error);
    return [];
  }
}

/**
 * 根据 apiType 获取对应的 Provider 实现类型
 * @param apiType API 类型
 * @returns Provider 实现类型
 */
export function getProviderTypeFromApiType(apiType: string): string {
  const apiTypeMap: Record<string, string> = {
    'openai:embeddings': 'openai',
    'aliyun:text-embeddings': 'aliyun-text',
    'aliyun:multimodal-embeddings': 'aliyun-vision',
    'volcengine:multimodal-embeddings': 'volcengine-vision',
    'zai:embeddings': 'zai',
    'gemini:embeddings': 'gemini',
    'openrouter:embeddings': 'openrouter',
    'ollama:embeddings': 'ollama',
  };

  return apiTypeMap[apiType] || 'openai';
}

/**
 * 根据模型ID推断 Provider 类型
 * @param modelId 模型ID
 * @returns Provider 类型
 */
export function inferProviderFromModelId(modelId: string): string {
  // OpenAI 模型
  if (modelId.startsWith('text-embedding-3')) {
    return 'openai';
  }

  // 阿里云模型
  if (modelId.includes('qwen') || modelId.includes('tongyi')) {
    return 'aliyun';
  }

  // 火山引擎模型
  if (modelId.includes('doubao')) {
    return 'volcengine';
  }

  // Zai 模型
  if (modelId === 'embedding-3') {
    return 'zai';
  }

  // Gemini 模型
  if (modelId.includes('gemini-embedding')) {
    return 'gemini';
  }

  // Ollama 模型
  if (['nomic-embed-text', 'mxbai-embed-large', 'snowflake-arctic-embed'].includes(modelId)) {
    return 'ollama';
  }

  return 'openai';
}

/**
 * 根据模型ID判断是否支持多模态
 * @param modelId 模型ID
 * @returns 是否支持多模态
 */
export function isMultimodalModel(modelId: string): boolean {
  const multimodalModels = [
    'qwen2.5-vl-embedding',
    'qwen3-vl-embedding',
    'tongyi-embedding-vision-plus',
    'tongyi-embedding-vision-flash',
    'doubao-embedding-vision-250615',
  ];

  return multimodalModels.includes(modelId);
}

/**
 * 清除缓存（用于开发环境热更新）
 */
export function clearEmbeddingModelsCache(): void {
  allEmbeddingModelsCache = null;
}
