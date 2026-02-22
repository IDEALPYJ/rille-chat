import { UserSettings, ProviderConfig, ModelConfig } from "@/lib/types";
import { MODELS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { validateProviderConfig } from "@/lib/provider-validator";
import { getDefaultBaseURLForProvider } from "./protocol-config";

export interface ProviderSelection {
  selectedProviderId: string;
  selectedProviderConfig: ProviderConfig;
  selectedModel: string;
  baseURL: string | undefined;
}

/**
 * 从 provider 的模型列表中获取第一个启用的模型
 */
function getFirstEnabledModel(providerConfig: ProviderConfig): string | undefined {
  if (!providerConfig.models || providerConfig.models.length === 0) {
    return undefined;
  }

  // 优先查找已启用的模型
  const enabledModel = providerConfig.models.find((m: string | ModelConfig) => {
    if (typeof m === 'string') return true; // 字符串格式的模型默认启用
    return m.enabled === true;
  });

  if (enabledModel) {
    return typeof enabledModel === 'string' ? enabledModel : enabledModel.id;
  }

  // 如果没有明确启用的模型，返回第一个模型
  const firstModel = providerConfig.models[0];
  return typeof firstModel === 'string' ? firstModel : firstModel.id;
}

/**
 * 获取 provider 的默认模型
 * 以 provider 预设默认值为准，不再依赖 DB 中的 models（避免配置与静态配置不同步）
 */
function getDefaultModelForProvider(providerId: string, _providerConfig: ProviderConfig): string {
  const providerDefaultModels: Record<string, string> = {
    openai: "gpt-4o-mini",
    bailian: "qwen3-max",
    deepseek: "deepseek-chat",
    openrouter: "openai/gpt-4o-mini",
    moonshot: "kimi-k2-turbo-preview",
    aliyun: "qwen-turbo",
    volcengine: "doubao-pro-4k",
    minimax: "MiniMax-M2.1",
    siliconflow: "deepseek-ai/DeepSeek-V3",
    xai: "grok-beta",
    mistral: "mistral-small-latest",
    google: "gemini-1.5-flash-latest",
    anthropic: "claude-3-5-sonnet-latest",
  };

  const defaultModel = providerDefaultModels[providerId];
  if (defaultModel) {
    return defaultModel;
  }

  // 无预设时从配置的模型列表取第一个（如自定义 provider）
  const firstEnabledModel = getFirstEnabledModel(_providerConfig);
  if (firstEnabledModel) return firstEnabledModel;

  // 最终回退
  logger.warn("No default model found for provider, using generic fallback", { providerId });
  return "gpt-3.5-turbo";
}

export function selectProviderAndModel(
  settings: UserSettings,
  overrideProvider?: string,
  overrideModel?: string,
  reasoning?: boolean | { enabled: boolean; effort?: string | number }
): ProviderSelection | null {
  const providers = settings.providers || {};
  const enabledProviderId = Object.keys(providers).find(id => providers[id].enabled);

  let selectedProviderId: string | undefined = overrideProvider || enabledProviderId;
  let selectedProviderConfig = selectedProviderId ? providers[selectedProviderId] : undefined;

  if (!selectedProviderConfig || !selectedProviderConfig.enabled) {
    selectedProviderId = enabledProviderId;
    selectedProviderConfig = enabledProviderId ? providers[enabledProviderId] : undefined;
  }

  if (!selectedProviderId || !selectedProviderConfig) {
    return null;
  }

  // 验证 Provider 配置
  const validation = validateProviderConfig(selectedProviderId, selectedProviderConfig);
  if (!validation.valid) {
    logger.warn("Provider configuration invalid", {
      providerId: selectedProviderId,
      error: validation.error,
    });
    return null;
  }

  // 模型选择：优先使用 overrideModel，否则使用 provider 的默认模型
  let selectedModel = overrideModel || getDefaultModelForProvider(selectedProviderId, selectedProviderConfig);

  // Handle Deep Thinking toggle
  const reasoningEnabled = typeof reasoning === 'boolean' ? reasoning : reasoning?.enabled;
  if (reasoningEnabled) {
    if (selectedProviderId === "deepseek" && selectedModel === MODELS.DEEPSEEK_CHAT) {
      selectedModel = MODELS.DEEPSEEK_REASONER;
    }
  }

  const baseURL = getBaseURL(selectedProviderId, selectedProviderConfig.baseURL);

  logger.debug("Selected provider and model", { 
    providerId: selectedProviderId, 
    model: selectedModel,
    hasOverrideModel: !!overrideModel
  });

  return {
    selectedProviderId,
    selectedProviderConfig,
    selectedModel,
    baseURL,
  };
}

function getBaseURL(providerId: string, configuredBaseURL?: string): string | undefined {
  if (configuredBaseURL) return configuredBaseURL;
  const defaultBaseURL = getDefaultBaseURLForProvider(providerId);
  return defaultBaseURL || undefined;
}
