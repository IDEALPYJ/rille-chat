/**
 * 语音服务提供者工厂
 * 统一管理和创建所有语音服务提供者实例
 */

import { VoiceProvider } from './base'
import { OpenAIVoiceProvider } from './openai'
import { AliyunVoiceProvider } from './aliyun'
import { VoiceProviderOptions, VoiceProviderInfo } from '../types'
import {
  getVoiceModelsByProvider,
  getTTSModelsByProvider,
  getSTTModelsByProvider,
  getDefaultVoiceForModel,
} from '@/lib/data/voice-models'

// 支持的提供者类型
export type VoiceProviderType = 'openai' | 'aliyun'

// 默认 Base URL（从模型定义中动态获取）
export async function getDefaultBaseURLs(): Promise<Record<VoiceProviderType, string>> {
  const openaiModels = await getVoiceModelsByProvider('openai');
  const aliyunModels = await getVoiceModelsByProvider('aliyun');
  
  return {
    openai: openaiModels[0]?.baseURL || 'https://api.openai.com/v1',
    aliyun: aliyunModels[0]?.baseURL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
  }
}

// 默认音色（从模型定义中动态获取）
export async function getDefaultVoices(): Promise<Record<VoiceProviderType, string>> {
  const openaiTTSModels = await getTTSModelsByProvider('openai');
  const aliyunTTSModels = await getTTSModelsByProvider('aliyun');
  
  return {
    openai: openaiTTSModels[0]?.defaultVoice || 'alloy',
    aliyun: aliyunTTSModels[0]?.defaultVoice || 'Cherry',
  }
}

/**
 * 获取 Provider 信息（从模型定义中动态构建）
 */
export async function buildProviderInfo(providerId: VoiceProviderType): Promise<VoiceProviderInfo> {
  const ttsModels = await getTTSModelsByProvider(providerId);
  const sttModels = await getSTTModelsByProvider(providerId);
  
  const providerNames: Record<VoiceProviderType, string> = {
    openai: 'OpenAI',
    aliyun: '阿里云',
  };
  
  return {
    id: providerId,
    name: providerNames[providerId],
    supportsTTS: ttsModels.length > 0,
    supportsSTT: sttModels.length > 0,
    ttsModels: ttsModels.map(m => m.id),
    sttModels: sttModels.map(m => m.id),
  };
}

/**
 * 创建语音服务提供者实例
 */
export async function createVoiceProvider(
  providerId: VoiceProviderType,
  options: VoiceProviderOptions
): Promise<VoiceProvider> {
  // 获取默认配置
  const defaultVoices = await getDefaultVoices();
  const defaultBaseURLs = await getDefaultBaseURLs();
  
  switch (providerId) {
    case 'openai':
      return new OpenAIVoiceProvider({
        apiKey: options.apiKey,
        baseURL: options.baseURL || defaultBaseURLs.openai,
        model: options.model,
        voice: options.voice || defaultVoices.openai,
      })

    case 'aliyun':
      return new AliyunVoiceProvider({
        apiKey: options.apiKey,
        baseURL: options.baseURL || defaultBaseURLs.aliyun,
        model: options.model,
        voice: options.voice || defaultVoices.aliyun,
      })

    default:
      throw new Error(`Unsupported voice provider: ${providerId}`)
  }
}

/**
 * 同步创建语音服务提供者实例（兼容旧代码）
 * 注意：这会使用硬编码的默认值，而不是从模型定义中读取
 */
export function createVoiceProviderSync(
  providerId: VoiceProviderType,
  options: VoiceProviderOptions
): VoiceProvider {
  // 硬编码默认值（用于同步场景）
  const DEFAULT_BASE_URLS: Record<VoiceProviderType, string> = {
    openai: 'https://api.openai.com/v1',
    aliyun: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
  }
  
  const DEFAULT_VOICES: Record<VoiceProviderType, string> = {
    openai: 'alloy',
    aliyun: 'Cherry',
  }
  
  switch (providerId) {
    case 'openai':
      return new OpenAIVoiceProvider({
        apiKey: options.apiKey,
        baseURL: options.baseURL || DEFAULT_BASE_URLS.openai,
        model: options.model,
        voice: options.voice || DEFAULT_VOICES.openai,
      })

    case 'aliyun':
      return new AliyunVoiceProvider({
        apiKey: options.apiKey,
        baseURL: options.baseURL || DEFAULT_BASE_URLS.aliyun,
        model: options.model,
        voice: options.voice || DEFAULT_VOICES.aliyun,
      })

    default:
      throw new Error(`Unsupported voice provider: ${providerId}`)
  }
}

/**
 * 获取所有支持的提供者信息
 */
export async function getAllProviderInfos(): Promise<VoiceProviderInfo[]> {
  const providers: VoiceProviderType[] = ['openai', 'aliyun'];
  const infos = await Promise.all(
    providers.map(provider => buildProviderInfo(provider))
  );
  return infos;
}

/**
 * 获取指定提供者的信息（同步版本，使用硬编码配置）
 */
export function getProviderInfoSync(providerId: VoiceProviderType): VoiceProviderInfo {
  // 硬编码配置（用于同步场景）
  const PROVIDER_CONFIGS: Record<VoiceProviderType, VoiceProviderInfo> = {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      supportsTTS: true,
      supportsSTT: true,
      ttsModels: ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'],
      sttModels: ['whisper-1'],
    },
    aliyun: {
      id: 'aliyun',
      name: '阿里云',
      supportsTTS: true,
      supportsSTT: true,
      ttsModels: ['qwen3-tts-flash-realtime'],
      sttModels: ['qwen3-asr-flash-realtime'],
    },
  };
  
  return PROVIDER_CONFIGS[providerId];
}

/**
 * 检查提供者是否支持 TTS
 */
export async function providerSupportsTTS(providerId: VoiceProviderType): Promise<boolean> {
  const ttsModels = await getTTSModelsByProvider(providerId);
  return ttsModels.length > 0;
}

/**
 * 检查提供者是否支持 STT
 */
export async function providerSupportsSTT(providerId: VoiceProviderType): Promise<boolean> {
  const sttModels = await getSTTModelsByProvider(providerId);
  return sttModels.length > 0;
}

/**
 * 获取提供者的默认 Base URL
 */
export async function getDefaultBaseURL(providerId: VoiceProviderType): Promise<string> {
  const models = await getVoiceModelsByProvider(providerId);
  return models[0]?.baseURL || '';
}

/**
 * 获取提供者的默认音色
 */
export async function getDefaultVoice(providerId: VoiceProviderType): Promise<string> {
  const ttsModels = await getTTSModelsByProvider(providerId);
  return ttsModels[0]?.defaultVoice || '';
}

/**
 * 获取模型的默认音色
 */
export async function getDefaultVoiceForModelId(modelId: string): Promise<string | undefined> {
  return getDefaultVoiceForModel(modelId);
}

// 导出所有提供者类
export { VoiceProvider } from './base'
export { OpenAIVoiceProvider } from './openai'
export { AliyunVoiceProvider } from './aliyun'

// 为了保持向后兼容，导出硬编码的默认值
export const DEFAULT_BASE_URLS: Record<VoiceProviderType, string> = {
  openai: 'https://api.openai.com/v1',
  aliyun: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
}

export const DEFAULT_VOICES: Record<VoiceProviderType, string> = {
  openai: 'alloy',
  aliyun: 'Cherry',
}
