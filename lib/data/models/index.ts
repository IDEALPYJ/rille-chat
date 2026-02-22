import { ModelConfig } from '@/lib/types/model';

// 缓存所有模型配置
let allModelsCache: ModelConfig[] | null = null;

/**
 * 获取所有模型配置
 * @returns 所有模型配置数组
 */
export async function getAllModels(): Promise<ModelConfig[]> {
  if (allModelsCache) {
    return allModelsCache;
  }

  const providers = [
    'openai', 'openrouter', 'anthropic', 'google', 'bailian',
    'deepseek', 'xai', 'mistral', 'moonshot', 'siliconflow',
    'volcengine', 'zai', 'minimax', 'perplexity'
  ];

  const allModels: ModelConfig[] = [];

  for (const provider of providers) {
    const models = await loadModelConfigsForProvider(provider);
    allModels.push(...models);
  }

  allModelsCache = allModels;
  return allModels;
}

/**
 * 根据模型ID获取模型配置
 * @param modelId 模型ID
 * @returns 模型配置，未找到返回undefined
 */
export async function getModelById(modelId: string): Promise<ModelConfig | undefined> {
  const allModels = await getAllModels();
  return allModels.find(model => model.id === modelId);
}

/**
 * 动态加载指定服务商的模型配置
 * @param providerId 服务商ID，如 "openai", "anthropic" 等
 * @returns 模型配置数组，如果加载失败则返回空数组
 */
export async function loadModelConfigsForProvider(providerId: string): Promise<ModelConfig[]> {
  try {
    // 构造导出变量名：providerId + "ModelConfigs"
    const exportName = `${providerId}ModelConfigs`;
    
    // 动态导入模块
    const providerModule = await import(`./${providerId}`);
    
    // 获取导出的模型配置
    const configs = providerModule[exportName];
    
    if (!configs || !Array.isArray(configs)) {
      console.warn(`[ModelLoader] Invalid model configs for provider: ${providerId}`);
      return [];
    }
    
    return configs;
  } catch (error) {
    // 如果文件不存在或加载失败，返回空数组
    console.warn(`[ModelLoader] Failed to load models for provider: ${providerId}`, error);
    return [];
  }
}

/**
 * 同步方式尝试导入模型配置（用于已知存在的配置）
 * 注意：这个函数不能在客户端组件中直接使用，因为动态 import 在客户端是异步的
 */
export function getModelConfigsForProviderSync(_providerId: string): ModelConfig[] {
  try {
    // 这个函数主要用于服务端或构建时
    // 在运行时应该使用 loadModelConfigsForProvider
    console.warn('[ModelLoader] Sync loading is deprecated, use loadModelConfigsForProvider instead');
    return [];
  } catch {
    return [];
  }
}
