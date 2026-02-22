/**
 * 语音服务提供者抽象基类
 */

import {
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceProviderOptions,
  VoiceProviderInfo,
  TTSStreamCallback,
  STTStreamCallback
} from '../types'

/**
 * 语音服务提供者抽象接口
 */
export abstract class VoiceProvider {
  protected options: VoiceProviderOptions

  constructor(options: VoiceProviderOptions) {
    this.options = options
  }

  /**
   * 获取提供者信息
   */
  abstract getInfo(): VoiceProviderInfo

  /**
   * 文本转语音 (TTS)
   * @param request TTS 请求参数
   * @returns 音频响应
   */
  abstract synthesize(request: TTSRequest): Promise<TTSResponse>

  /**
   * 语音转文本 (STT)
   * @param request STT 请求参数
   * @returns 转写结果
   */
  abstract transcribe(request: STTRequest): Promise<STTResponse>

  /**
   * 流式 TTS (可选实现)
   * @param request TTS 请求参数
   * @param callback 音频块回调
   */
  async synthesizeStream(request: TTSRequest, callback: TTSStreamCallback): Promise<void> {
    // 默认实现：调用非流式接口
    const response = await this.synthesize(request)
    callback(response.audio, true)
  }

  /**
   * 流式 STT (可选实现)
   * @param request STT 请求参数
   * @param callback 转写结果回调
   */
  async transcribeStream(request: STTRequest, callback: STTStreamCallback): Promise<void> {
    // 默认实现：调用非流式接口
    const response = await this.transcribe(request)
    callback({ text: response.text, interim: '', done: true })
  }

  /**
   * 验证配置
   */
  protected validateOptions(): void {
    if (!this.options.apiKey) {
      throw new Error('API key is required')
    }
    if (!this.options.model) {
      throw new Error('Model is required')
    }
  }
}

/**
 * TTS 专用提供者接口 (只实现 TTS)
 */
export abstract class TTSProvider extends VoiceProvider {
  async transcribe(_request: STTRequest): Promise<STTResponse> {
    throw new Error(`${this.getInfo().name} does not support STT`)
  }
}

/**
 * STT 专用提供者接口 (只实现 STT)
 */
export abstract class STTProvider extends VoiceProvider {
  async synthesize(_request: TTSRequest): Promise<TTSResponse> {
    throw new Error(`${this.getInfo().name} does not support TTS`)
  }
}

