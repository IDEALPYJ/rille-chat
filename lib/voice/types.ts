/**
 * 语音服务统一类型定义
 */

/**
 * TTS 请求参数
 */
export interface TTSRequest {
  /** 要合成的文本 */
  text: string
  /** 音色 ID */
  voice?: string
  /** 语速 (0.25 - 4.0) */
  speed?: number
  /** 输出格式 */
  format?: 'mp3' | 'pcm' | 'wav' | 'opus'
  /** 采样率 */
  sampleRate?: number
}

/**
 * TTS 响应
 */
export interface TTSResponse {
  /** 音频数据 (ArrayBuffer) */
  audio: ArrayBuffer
  /** MIME 类型 */
  contentType: string
  /** 音频时长 (秒，可选) */
  duration?: number
}

/**
 * STT 请求参数
 */
export interface STTRequest {
  /** 音频文件 */
  audio: File | Blob | ArrayBuffer
  /** 音频格式 */
  format?: 'mp3' | 'wav' | 'pcm' | 'webm' | 'ogg' | 'flac'
  /** 语言代码 (如 zh, en) */
  language?: string
  /** 采样率 (PCM 格式需要) */
  sampleRate?: number
}

/**
 * STT 响应
 */
export interface STTResponse {
  /** 识别出的文本 */
  text: string
  /** 检测到的语言 */
  language?: string
  /** 置信度 (0-1) */
  confidence?: number
  /** 是否包含分段信息 */
  segments?: STTSegment[]
}

/**
 * STT 分段信息
 */
export interface STTSegment {
  /** 分段 ID */
  id: string | number
  /** 开始时间 (秒) */
  start: number
  /** 结束时间 (秒) */
  end: number
  /** 分段文本 */
  text: string
}

/**
 * 语音服务提供者配置
 */
export interface VoiceProviderOptions {
  /** API Key */
  apiKey: string
  /** API Base URL (可选) */
  baseURL?: string
  /** 模型 ID */
  model: string
  /** 音色 (TTS) */
  voice?: string
  /** 额外配置 */
  extraConfig?: Record<string, any>
}

/**
 * 语音服务提供者信息
 */
export interface VoiceProviderInfo {
  /** 提供者 ID */
  id: string
  /** 提供者名称 */
  name: string
  /** 是否支持 TTS */
  supportsTTS: boolean
  /** 是否支持 STT */
  supportsSTT: boolean
  /** 支持的 TTS 模型 */
  ttsModels?: string[]
  /** 支持的 STT 模型 */
  sttModels?: string[]
}

/**
 * TTS 流式回调 (用于实时音频)
 */
export type TTSStreamCallback = (chunk: ArrayBuffer, done: boolean) => void

/**
 * STT 流式回调 (用于实时转写)
 */
export type STTStreamCallback = (result: { text: string; interim: string; done: boolean }) => void

