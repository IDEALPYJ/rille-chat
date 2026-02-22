/**
 * 模型配置服务
 * 用于检查模型特性和配置，避免在业务逻辑中硬编码
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ModelConfig } from "@/lib/types";
import { decrypt } from "@/lib/encrypt";

/**
 * 检查模型是否支持多模态向量化
 */
export async function checkModelSupportsMultimodal(
  provider: string,
  model: string,
  userId: string
): Promise<boolean> {
  try {
    // 1. 从用户设置中获取模型配置
    const userSettings = await db.userSetting.findUnique({
      where: { userId },
      select: { config: true }
    });

    if (userSettings?.config) {
      try {
        // 解密配置
        const configStr = typeof userSettings.config === 'string'
          ? userSettings.config
          : JSON.stringify(userSettings.config);
        const decryptedConfig = decrypt(configStr);
        const settings = JSON.parse(decryptedConfig);

        const providerConfig = settings.vectorProviders?.[provider];
        if (providerConfig?.models) {
          const modelConfig = providerConfig.models.find((m: ModelConfig | string) => {
            const modelId = typeof m === 'string' ? m : m.id;
            return modelId === model;
          });
          
          if (modelConfig && typeof modelConfig === 'object') {
            return modelConfig.features?.multimodalVectorization === true;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("Failed to decrypt settings for multimodal check", { userId, error: errorMessage });
        
        // 如果解密失败，尝试从默认模型列表中查找
        try {
          const { DEFAULT_VECTOR_PROVIDER_MODELS } = await import("@/components/chat/settings/vector-constants");
          const defaultModels = DEFAULT_VECTOR_PROVIDER_MODELS[provider] || [];
          const defaultModel = defaultModels.find((m: Partial<ModelConfig>) => m.id === model);
          if (defaultModel) {
            return defaultModel.features?.includes('multimodalVectorization') === true;
          }
        } catch (importError) {
          logger.warn("Failed to import default vector models", { error: importError });
        }
      }
    }

    // 2. 如果无法从用户设置获取，使用 embedding service 的推断逻辑
    // 通过模型名称推断（作为后备方案）
    const isMultimodal = 
      model.includes("vision") || 
      model.includes("multimodal") || 
      model.includes("vl-embedding");

    return isMultimodal;
  } catch (error) {
    logger.error("Error checking multimodal support", { provider, model, userId, error });
    // 默认返回 false，安全起见
    return false;
  }
}

/**
 * 获取项目的 embedding 模型配置信息
 */
export async function getProjectEmbeddingModelConfig(
  projectId: string,
  userId: string
): Promise<{
  embeddingEnabled: boolean;
  embeddingModelId: string | null;
  supportsMultimodal: boolean;
  provider: string | null;
  model: string | null;
} | null> {
  try {
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
      select: { embeddingEnabled: true, embeddingModelId: true }
    });

    if (!project || !project.embeddingEnabled || !project.embeddingModelId) {
      return {
        embeddingEnabled: false,
        embeddingModelId: null,
        supportsMultimodal: false,
        provider: null,
        model: null,
      };
    }

    const [provider, model] = project.embeddingModelId.split(':');
    const supportsMultimodal = await checkModelSupportsMultimodal(provider, model, userId);

    return {
      embeddingEnabled: true,
      embeddingModelId: project.embeddingModelId,
      supportsMultimodal,
      provider,
      model,
    };
  } catch (error) {
    logger.error("Error getting project embedding model config", { projectId, userId, error });
    return null;
  }
}

