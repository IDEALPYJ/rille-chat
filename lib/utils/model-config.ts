/**
 * 模型配置工具函数
 * 提供访问和查询模型配置的工具函数
 */

import { ModelConfig as TypesModelConfig } from '@/lib/types';
import { ModelConfig, ModelParameter } from '@/lib/types/model';
import { openaiModelConfigs } from '@/lib/data/models/openai';
import { anthropicModelConfigs } from '@/lib/data/models/anthropic';
import { siliconflowModelConfigs } from '@/lib/data/models/siliconflow';
import { googleModelConfigs } from '@/lib/data/models/google';
import { bailianModelConfigs } from '@/lib/data/models/bailian';
import { volcengineModelConfigs } from '@/lib/data/models/volcengine';
import { deepseekModelConfigs } from '@/lib/data/models/deepseek';
import { moonshotModelConfigs } from '@/lib/data/models/moonshot';
import { minimaxModelConfigs } from '@/lib/data/models/minimax';
import { zaiModelConfigs } from '@/lib/data/models/zai';
import { xaiModelConfigs } from '@/lib/data/models/xai';
import { openrouterModelConfigs } from '@/lib/data/models/openrouter';

/**
 * 所有静态模型配置
 */
const allStaticConfigs: Record<string, ModelConfig[]> = {
  openai: openaiModelConfigs,
  anthropic: anthropicModelConfigs,
  siliconflow: siliconflowModelConfigs,
  google: googleModelConfigs,
  bailian: bailianModelConfigs,
  volcengine: volcengineModelConfigs,
  deepseek: deepseekModelConfigs,
  moonshot: moonshotModelConfigs,
  minimax: minimaxModelConfigs,
  zai: zaiModelConfigs,
  xai: xaiModelConfigs,
  openrouter: openrouterModelConfigs,
};

// 配置缓存
const configCache = new Map<string, ModelConfig | null>();

/**
 * 获取模型配置
 * @param providerId 服务商ID
 * @param modelId 模型ID
 * @returns 模型配置，如果未找到则返回null
 */
export function getModelConfig(providerId: string, modelId: string): ModelConfig | null {
  const cacheKey = `${providerId}:${modelId}`;

  // 从缓存获取
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)!;
  }

  // 从静态配置查找
  const configs = allStaticConfigs[providerId];
  if (!configs) {
    configCache.set(cacheKey, null);
    return null;
  }

  const config = configs.find(m => m.id === modelId);
  configCache.set(cacheKey, config || null);

  return config || null;
}

/**
 * 获取服务商的所有模型配置
 * @param providerId 服务商ID
 * @returns 模型配置数组
 */
export function getProviderModels(providerId: string): ModelConfig[] {
  return allStaticConfigs[providerId] || [];
}

/**
 * 检查模型是否支持某个特性
 * @param config 模型配置
 * @param feature 特性名称
 * @returns 是否支持
 */
export function hasFeature(config: ModelConfig, feature: string): boolean {
  return config.features?.includes(feature) || false;
}

/**
 * 检查模型是否有某个内置工具
 * @param config 模型配置
 * @param tool 工具名称
 * @returns 是否有该工具
 */
export function hasBuiltinTool(config: ModelConfig, tool: string): boolean {
  return config.builtinTools?.includes(tool) || false;
}

/**
 * 获取模型的某个参数配置
 * @param config 模型配置
 * @param paramId 参数ID
 * @returns 参数配置，如果未找到则返回null
 */
export function getModelParameter(config: ModelConfig, paramId: string): ModelParameter | null {
  if (!config.parameters) {
    return null;
  }

  return config.parameters.find(p => p.id === paramId) || null;
}

/**
 * 获取所有可用的参数配置
 * @param config 模型配置
 * @returns 参数配置数组
 */
export function getAllAvailableParameters(config: ModelConfig): ModelParameter[] {
  return config.parameters || [];
}

/**
 * 获取采样参数
 * @param config 模型配置
 * @returns 采样参数数组 (temperature, top_p, top_k等)
 */
export function getSamplingParameters(config: ModelConfig): ModelParameter[] {
  const samplingParamIds = ['temperature', 'top_p', 'top_k', 'presence_penalty', 'frequency_penalty'];
  return (config.parameters || []).filter(p => samplingParamIds.includes(p.id));
}

/**
 * 检查模型是否为reasoning-only模型
 * (只支持推理，不支持常规采样参数)
 * @param config 模型配置
 * @returns 是否为reasoning-only
 */
export function isReasoningOnlyModel(config: ModelConfig): boolean {
  const hasReasoning = hasFeature(config, 'reasoning');
  const hasTemperature = getModelParameter(config, 'temperature') !== null;
  const isReadOnly = config.reasoning?.readonly !== false; // 默认视为只读，除非明确设为 false

  return hasReasoning && !hasTemperature && isReadOnly;
}

/**
 * 合并模型配置
 * 将静态配置和用户配置合并
 * @param staticConfig 静态配置(来自lib/data/models/)
 * @param userConfig 用户配置(来自数据库)
 * @returns 合并后的配置
 */
export function mergeModelConfig(
  staticConfig: ModelConfig,
  userConfig?: string | TypesModelConfig
): ModelConfig {
  // 如果用户配置是字符串，直接返回静态配置
  if (!userConfig || typeof userConfig === 'string') {
    return staticConfig;
  }

  // 合并配置，用户配置的enabled优先
  return {
    ...staticConfig,
    enabled: userConfig.enabled ?? true,
    // 保留用户可能自定义的字段
    name: userConfig.name || staticConfig.displayName,
  } as ModelConfig;
}

/**
 * 将新的ModelConfig转换为旧格式(用于兼容性)
 * @param config 新格式的模型配置
 * @returns 旧格式的模型配置
 */
export function convertToLegacyModelConfig(config: ModelConfig): TypesModelConfig {
  return {
    id: config.id,
    name: config.displayName,
    enabled: true,
    contextWindow: config.contextWindow,
    contextLength: config.contextWindow, // 兼容字段
    maxOutput: config.maxOutput,
    modalities: config.modalities,
    modelType: config.modelType as any,
    pricing: config.pricing,

    // 新增字段
    displayName: config.displayName,
    avatar: config.avatar,
    releasedAt: config.releasedAt,
    knowledgeCutoff: config.knowledgeCutoff,
    features: config.features,
    builtinTools: config.builtinTools,
    parameters: config.parameters,

    // 向后兼容的特性标记 (web_search + google_search 均为内置搜索)
    deepThinking: hasFeature(config, 'reasoning'),
    webSearch: hasBuiltinTool(config, 'web_search') || hasBuiltinTool(config, 'google_search'),
    toolCall: hasFeature(config, 'function_call'),
  } as any;
}

/**
 * 清除配置缓存
 */
export function clearConfigCache(): void {
  configCache.clear();
}
