/**
 * Embedding工具
 * 调用embedding模型获取向量
 * 使用新的统一embedding服务
 */

import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { EmbeddingConfig } from "./types";
import { createEmbeddingService } from "./embedding-service";

/**
 * 获取embedding向量
 */
export async function getEmbedding(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  try {
    const service = createEmbeddingService(config);
    return await service.getEmbedding(text);
  } catch (error: any) {
    logger.error("Embedding API error", { 
      error: error.message, 
      provider: config.provider, 
      model: config.model 
    });
    throw error;
  }
}

/**
 * 批量获取embeddings（分批处理）
 * 注意：现在使用provider原生的批量接口，更高效
 */
export async function getEmbeddingsBatch(
  texts: string[],
  config: EmbeddingConfig,
  batchSize: number = 10
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // 分批处理（某些provider可能有批量大小限制）
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      const service = createEmbeddingService(config);
      // 使用provider原生的批量接口
      const batchEmbeddings = await service.getEmbeddingsBatch(batch);
      embeddings.push(...batchEmbeddings);
      
      // 添加小延迟避免速率限制
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      logger.error("Batch embedding error", { 
        error: error.message, 
        batchIndex: i,
        provider: config.provider,
        model: config.model
      });
      throw error;
    }
  }
  
  return embeddings;
}

/**
 * 从项目配置获取embedding配置
 * 从vectorProviders中读取配置（而不是providers）
 */
export async function getEmbeddingConfigFromProject(
  projectId: string,
  userId: string
): Promise<EmbeddingConfig | null> {
  // 获取项目信息
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { embeddingEnabled: true, embeddingModelId: true, embeddingDimensions: true }
  });
  
  if (!project || !project.embeddingEnabled || !project.embeddingModelId) {
    return null;
  }
  
  // 解析模型ID格式: "provider:model"
  const [provider, model] = project.embeddingModelId.split(':');
  if (!provider || !model) {
    logger.error("Invalid embedding model ID format", { embeddingModelId: project.embeddingModelId });
    return null;
  }
  
  // 获取用户设置中的vectorProvider配置
  const userSettings = await db.userSetting.findUnique({
    where: { userId },
    select: { config: true }
  });
  
  if (!userSettings || !userSettings.config) {
    logger.error("User settings not found", { userId });
    return null;
  }
  
  // 解密配置（config 是加密的字符串）
  let settings: any;
  try {
    const { decrypt } = await import("@/lib/encrypt");
    const configStr = typeof userSettings.config === 'string'
      ? userSettings.config
      : JSON.stringify(userSettings.config);
    const decryptedConfig = decrypt(configStr);
    settings = JSON.parse(decryptedConfig);
  } catch (error: any) {
    logger.error("Failed to decrypt user settings", { userId, error: error.message });
    return null;
  }
  
  // 添加详细日志，检查设置结构
  logger.debug("Checking embedding config", {
    provider,
    model,
    userId,
    hasVectorProviders: !!settings.vectorProviders,
    vectorProvidersType: typeof settings.vectorProviders,
    settingsKeys: Object.keys(settings || {}),
    vectorProvidersKeys: settings.vectorProviders ? Object.keys(settings.vectorProviders) : []
  });
  
  // 从vectorProviders中读取配置
  // 如果vectorProviders不存在，尝试初始化默认值
  let vectorProviders = settings.vectorProviders;
  let usingDefaults = false;
  
  if (!vectorProviders || typeof vectorProviders !== 'object' || Array.isArray(vectorProviders)) {
    // 如果vectorProviders不存在或格式不正确，使用默认值
    const { INITIAL_VECTOR_PROVIDERS, DEFAULT_VECTOR_PROVIDER_MODELS } = await import("@/components/chat/settings/vector-constants");
    vectorProviders = {};
    INITIAL_VECTOR_PROVIDERS.forEach(p => {
      vectorProviders[p.id] = { 
        apiKey: "", 
        enabled: false, 
        models: DEFAULT_VECTOR_PROVIDER_MODELS[p.id] || [], 
        checkModel: "" 
      };
    });
    usingDefaults = true;
    logger.warn("Vector providers not found in settings, using defaults", { 
      provider, 
      userId,
      initializedProviders: Object.keys(vectorProviders),
      actualVectorProviders: settings.vectorProviders
    });
  }
  
  const providerConfig = vectorProviders[provider];
  
  if (!providerConfig) {
    logger.error("Vector provider not found in settings", { 
      provider, 
      userId, 
      availableProviders: Object.keys(vectorProviders || {}) 
    });
    return null;
  }
  
  // 如果使用了默认值，尝试从实际设置中获取 apiKey 和 enabled 状态
  // 即使 vectorProviders 结构不完整，也可能有部分配置
  if (usingDefaults) {
    // 尝试从实际设置中获取配置（即使结构不完整）
    const actualVectorProviders = settings.vectorProviders;
    if (actualVectorProviders && typeof actualVectorProviders === 'object' && !Array.isArray(actualVectorProviders)) {
      const actualProviderConfig = actualVectorProviders[provider];
      if (actualProviderConfig) {
        if (actualProviderConfig.apiKey) {
          providerConfig.apiKey = actualProviderConfig.apiKey;
          logger.info("Found API key in actual settings", { provider, userId });
        }
        if (actualProviderConfig.enabled !== undefined) {
          providerConfig.enabled = actualProviderConfig.enabled;
        }
        if (actualProviderConfig.models && Array.isArray(actualProviderConfig.models)) {
          providerConfig.models = actualProviderConfig.models;
        }
      }
    }
  }
  
  // 查找模型配置，获取模型的baseURL（如果模型有单独的baseURL）
  let modelConfig = providerConfig.models?.find((m: any) => {
    const modelId = typeof m === 'string' ? m : m.id;
    return modelId === model;
  });
  
  // 如果模型不在列表中，尝试从默认模型列表中查找
  if (!modelConfig) {
    const { DEFAULT_VECTOR_PROVIDER_MODELS } = await import("@/components/chat/settings/vector-constants");
    const defaultModels = DEFAULT_VECTOR_PROVIDER_MODELS[provider] || [];
    modelConfig = defaultModels.find((m: any) => m.id === model);
    if (modelConfig) {
      logger.info("Model found in default models list", { provider, model, userId });
    }
  }
  
  // 如果项目已经选择了这个模型，即使 provider 未启用，也允许使用（但需要检查 API Key）
  // 这是因为项目级别的配置优先级高于全局设置
  if (!providerConfig.enabled) {
    // 检查模型是否在模型列表中且已启用
    if (modelConfig && typeof modelConfig === 'object' && modelConfig.enabled) {
      // 模型已启用，允许使用（即使 provider 未启用）
      logger.info("Using enabled model from disabled provider (project-level override)", { 
        provider, 
        model, 
        userId 
      });
    } else if (modelConfig) {
      // 模型存在但未启用，也允许使用（因为项目已经选择了这个模型）
      logger.info("Using model from disabled provider (project-level override)", { 
        provider, 
        model, 
        userId,
        modelEnabled: typeof modelConfig === 'object' ? modelConfig.enabled : true
      });
    } else {
      logger.error("Vector provider is disabled and model not found", { 
        provider, 
        model, 
        userId
      });
      return null;
    }
  }
  
  if (!providerConfig.apiKey) {
    logger.error("Vector provider API key not configured", { provider, userId });
    return null;
  }

  const modelBaseURL = typeof modelConfig === 'object' && modelConfig?.baseURL
    ? modelConfig.baseURL
    : undefined;

  // 获取向量维度：优先使用项目中保存的维度，否则从模型配置中获取默认维度
  const dimensions = project.embeddingDimensions
    ? project.embeddingDimensions
    : (typeof modelConfig === 'object' && modelConfig?.vectorDimensions
        ? modelConfig.vectorDimensions.default
        : undefined);

  return {
    provider,
    model,
    apiKey: providerConfig.apiKey,
    baseURL: modelBaseURL,
    dimensions
  };
}

