import { UserSettings, ProviderConfig } from "./types";

/**
 * 验证 Provider 配置是否有效
 * 在用户尝试使用某个 Provider 时进行校验
 */
export function validateProviderConfig(
  providerId: string,
  providerConfig: ProviderConfig | undefined
): { valid: boolean; error?: string } {
  if (!providerConfig) {
    return {
      valid: false,
      error: `Provider ${providerId} 未配置`,
    };
  }

  if (!providerConfig.enabled) {
    return {
      valid: false,
      error: `Provider ${providerId} 未启用`,
    };
  }

  if (!providerConfig.apiKey || providerConfig.apiKey.trim() === "") {
    return {
      valid: false,
      error: `Provider ${providerId} 的 API Key 未配置`,
    };
  }

  return { valid: true };
}

/**
 * 检查用户设置中是否有至少一个可用的 Provider
 */
export function hasAvailableProvider(settings: UserSettings): boolean {
  const providers = settings.providers || {};
  
  for (const [providerId, config] of Object.entries(providers)) {
    if (validateProviderConfig(providerId, config).valid) {
      return true;
    }
  }
  
  return false;
}

/**
 * 获取所有配置错误的 Provider 列表（用于诊断）
 */
export function getInvalidProviders(settings: UserSettings): Array<{ id: string; error: string }> {
  const providers = settings.providers || {};
  const invalid: Array<{ id: string; error: string }> = [];
  
  for (const [providerId, config] of Object.entries(providers)) {
    if (config.enabled) {
      const validation = validateProviderConfig(providerId, config);
      if (!validation.valid) {
        invalid.push({
          id: providerId,
          error: validation.error || "未知错误",
        });
      }
    }
  }
  
  return invalid;
}

