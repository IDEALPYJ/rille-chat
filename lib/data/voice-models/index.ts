import { VoiceModelConfig } from '@/lib/types/voice_model';

// 缓存所有模型配置
let allVoiceModelsCache: VoiceModelConfig[] | null = null;

/**
 * 获取所有语音模型配置
 * @returns 所有语音模型配置数组
 */
export async function getAllVoiceModels(): Promise<VoiceModelConfig[]> {
  if (allVoiceModelsCache) {
    return allVoiceModelsCache;
  }

  const providers = [
    'openai', 'aliyun'
  ];

  const allModels: VoiceModelConfig[] = [];

  for (const provider of providers) {
    const models = await loadVoiceModelsForProvider(provider);
    allModels.push(...models);
  }

  allVoiceModelsCache = allModels;
  return allModels;
}

/**
 * 根据模型ID获取模型配置
 * @param modelId 模型ID
 * @returns 模型配置，未找到返回undefined
 */
export async function getVoiceModelById(modelId: string): Promise<VoiceModelConfig | undefined> {
  const allModels = await getAllVoiceModels();
  return allModels.find(model => model.id === modelId);
}

/**
 * 根据 Provider ID 获取该 Provider 的所有模型
 * @param providerId Provider ID
 * @returns 该 Provider 的模型配置数组
 */
export async function getVoiceModelsByProvider(providerId: string): Promise<VoiceModelConfig[]> {
  const allModels = await getAllVoiceModels();
  return allModels.filter(model => model.provider === providerId);
}

/**
 * 获取所有 TTS 模型
 * @returns TTS 模型配置数组
 */
export async function getTTSModels(): Promise<VoiceModelConfig[]> {
  const allModels = await getAllVoiceModels();
  return allModels.filter(model => model.modelType === 'tts');
}

/**
 * 获取所有 STT 模型
 * @returns STT 模型配置数组
 */
export async function getSTTModels(): Promise<VoiceModelConfig[]> {
  const allModels = await getAllVoiceModels();
  return allModels.filter(model => model.modelType === 'stt');
}

/**
 * 获取指定 Provider 的 TTS 模型
 * @param providerId Provider ID
 * @returns TTS 模型配置数组
 */
export async function getTTSModelsByProvider(providerId: string): Promise<VoiceModelConfig[]> {
  const allModels = await getAllVoiceModels();
  return allModels.filter(model => model.provider === providerId && model.modelType === 'tts');
}

/**
 * 获取指定 Provider 的 STT 模型
 * @param providerId Provider ID
 * @returns STT 模型配置数组
 */
export async function getSTTModelsByProvider(providerId: string): Promise<VoiceModelConfig[]> {
  const allModels = await getAllVoiceModels();
  return allModels.filter(model => model.provider === providerId && model.modelType === 'stt');
}

/**
 * 获取模型的默认音色
 * @param modelId 模型ID
 * @returns 默认音色ID，如果没有则返回undefined
 */
export async function getDefaultVoiceForModel(modelId: string): Promise<string | undefined> {
  const model = await getVoiceModelById(modelId);
  return model?.defaultVoice;
}

/**
 * 获取模型支持的所有音色
 * @param modelId 模型ID
 * @returns 音色选项数组，如果没有则返回空数组
 */
export async function getVoicesForModel(modelId: string) {
  const model = await getVoiceModelById(modelId);
  return model?.voices || [];
}

/**
 * 动态加载指定 Provider 的模型配置
 * @param providerId Provider ID，如 "openai", "aliyun" 等
 * @returns 模型配置数组，如果加载失败则返回空数组
 */
export async function loadVoiceModelsForProvider(providerId: string): Promise<VoiceModelConfig[]> {
  try {
    // 构造导出变量名：providerId + "VoiceModelConfigs"
    const exportName = `${providerId}VoiceModelConfigs`;
    
    // 动态导入模块
    const providerModule = await import(`./${providerId}`);
    
    // 获取导出的模型配置
    const configs = providerModule[exportName];
    
    if (!configs || !Array.isArray(configs)) {
      console.warn(`[VoiceModelLoader] Invalid model configs for provider: ${providerId}`);
      return [];
    }
    
    return configs;
  } catch (error) {
    // 如果文件不存在或加载失败，返回空数组
    console.warn(`[VoiceModelLoader] Failed to load models for provider: ${providerId}`, error);
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
    'openai:tts': 'openai',
    'openai:stt': 'openai',
    'aliyun:tts-realtime': 'aliyun',
    'aliyun:stt-realtime': 'aliyun',
  };
  
  return apiTypeMap[apiType] || 'openai';
}

/**
 * 根据模型ID推断模型类型（TTS 或 STT）
 * @param modelId 模型ID
 * @returns 模型类型
 */
export function inferModelTypeFromModelId(modelId: string): 'tts' | 'stt' {
  const ttsKeywords = ['tts', 'speech', 'voice'];
  const sttKeywords = ['asr', 'stt', 'whisper', 'transcribe'];
  
  const lowerModelId = modelId.toLowerCase();
  
  if (ttsKeywords.some(kw => lowerModelId.includes(kw))) {
    return 'tts';
  }
  
  if (sttKeywords.some(kw => lowerModelId.includes(kw))) {
    return 'stt';
  }
  
  // 默认返回 tts
  return 'tts';
}

/**
 * 获取模型的默认 Base URL
 * @param modelId 模型ID
 * @returns 默认 Base URL
 */
export async function getDefaultBaseURLForVoiceModel(modelId: string): Promise<string | undefined> {
  const model = await getVoiceModelById(modelId);
  return model?.baseURL;
}

/**
 * 获取模型的默认音频格式
 * @param modelId 模型ID
 * @returns 默认音频格式
 */
export async function getDefaultFormatForVoiceModel(modelId: string): Promise<string | undefined> {
  const model = await getVoiceModelById(modelId);
  return model?.defaultFormat;
}

/**
 * 清除缓存（用于开发环境热更新）
 */
export function clearVoiceModelsCache(): void {
  allVoiceModelsCache = null;
}
