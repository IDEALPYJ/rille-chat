/**
 * 语音模型类型定义
 * 与 Chat 模型的 ModelConfig 保持一致的结构
 */

export type VoiceModality = 'audio' | 'text';

export type VoiceApiType =
  | 'openai:tts'
  | 'openai:stt'
  | 'aliyun:tts-realtime'
  | 'aliyun:stt-realtime';

export type Currency = 'USD' | 'CNY';
export type PricingUnit = '1M_tokens' | '1K_tokens' | 'per_minute' | 'per_character';

export interface PricingTier {
  rate: number;
  condition?: Record<string, [number, number | 'infinity']> | string;
}

export interface PricingItem {
  type: 'audio' | 'text';
  name: 'input' | 'output';
  unit: PricingUnit;
  tiers: PricingTier[];
}

/**
 * 音色配置
 */
export interface VoiceOption {
  id: string;
  name: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  language?: string[];
  previewUrl?: string;
}

/**
 * 语音模型配置
 */
export interface VoiceModelConfig {
  id: string;
  displayName: string;
  avatar?: string;
  provider: string;
  releasedAt?: string;

  /**
   * API 类型，格式: provider:api-name
   * 用于路由到正确的适配器实现
   */
  apiType: VoiceApiType;

  /**
   * 模型类型
   * - tts: 文本转语音
   * - stt: 语音转文本
   */
  modelType: 'tts' | 'stt';

  /**
   * 支持的模态类型
   */
  modalities: {
    input: VoiceModality[];
    output: VoiceModality[];
  };

  /**
   * 模型特性
   * - streaming: 支持流式处理
   * - realtime: 支持实时处理
   * - multilingual: 支持多语言
   * - emotion: 支持情感控制
   * - speed: 支持语速调节
   */
  features: string[];

  /**
   * 支持的音色列表（仅 TTS）
   */
  voices?: VoiceOption[];

  /**
   * 默认音色（仅 TTS）
   */
  defaultVoice?: string;

  /**
   * 支持的音频格式
   */
  supportedFormats?: string[];

  /**
   * 默认音频格式
   */
  defaultFormat?: string;

  /**
   * 采样率（Hz）
   */
  sampleRate?: number;

  /**
   * 支持的采样率列表
   */
  supportedSampleRates?: number[];

  /**
   * 计费信息
   */
  pricing?: {
    currency: Currency;
    items: PricingItem[];
  };

  /**
   * 默认 Base URL
   */
  baseURL?: string;

  /**
   * 最大输入长度（tokens 或 characters）
   */
  maxInputLength?: number;

  /**
   * 语速范围（仅 TTS）
   * 默认: { min: 0.25, max: 4.0, default: 1.0 }
   */
  speedRange?: {
    min: number;
    max: number;
    default: number;
    step?: number;
  };
}

/**
 * 语音 Provider 配置
 */
export interface VoiceProviderConfig {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  supportsTTS: boolean;
  supportsSTT: boolean;
}
