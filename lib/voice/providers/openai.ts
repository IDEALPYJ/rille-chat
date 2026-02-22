/**
 * OpenAI 语音服务提供者
 * 支持 TTS (tts-1, tts-1-hd, gpt-4o-mini-tts) 和 STT (whisper-1)
 */

import OpenAI from 'openai'
import { VoiceProvider } from './base'
import {
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceProviderInfo,
  TTSStreamCallback,
} from '../types'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_VOICE = 'alloy'

export class OpenAIVoiceProvider extends VoiceProvider {
  private client: OpenAI

  constructor(options: {
    apiKey: string
    baseURL?: string
    model: string
    voice?: string
  }) {
    super({
      ...options,
      baseURL: options.baseURL || DEFAULT_BASE_URL,
      voice: options.voice || DEFAULT_VOICE,
    })
    
    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      baseURL: this.options.baseURL,
    })
  }

  getInfo(): VoiceProviderInfo {
    return {
      id: 'openai',
      name: 'OpenAI',
      supportsTTS: true,
      supportsSTT: true,
      ttsModels: ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'],
      sttModels: ['whisper-1'],
    }
  }

  /**
   * 文本转语音
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    this.validateOptions()

    const voice = request.voice || this.options.voice || DEFAULT_VOICE
    const speed = request.speed || 1.0
    const format = request.format || 'mp3'

    // 调用 OpenAI TTS API
    const response = await this.client.audio.speech.create({
      model: this.options.model,
      voice: voice as any,
      input: request.text,
      speed: speed,
      response_format: format as any,
    })

    const audioBuffer = await response.arrayBuffer()

    // 确定 MIME 类型
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      opus: 'audio/opus',
      aac: 'audio/aac',
      flac: 'audio/flac',
      wav: 'audio/wav',
      pcm: 'audio/pcm',
    }

    return {
      audio: audioBuffer,
      contentType: mimeTypes[format] || 'audio/mpeg',
    }
  }

  /**
   * 流式 TTS
   */
  async synthesizeStream(request: TTSRequest, callback: TTSStreamCallback): Promise<void> {
    this.validateOptions()

    const voice = request.voice || this.options.voice || DEFAULT_VOICE
    const speed = request.speed || 1.0
    const format = request.format || 'mp3'

    // 调用 OpenAI TTS API
    const response = await this.client.audio.speech.create({
      model: this.options.model,
      voice: voice as any,
      input: request.text,
      speed: speed,
      response_format: format as any,
    })

    // 获取可读流
    if (!response.body) {
      throw new Error('OpenAI TTS API did not return a response body')
    }

    // 处理流数据
    // 注意: 在 web 环境和 node 环境下 body 的类型不同
    // 这里我们假设是在 Node.js 环境下运行 (Next.js API Route)
    const stream = response.body as unknown as AsyncIterable<Uint8Array>
    
    for await (const chunk of stream) {
      // 确保 chunk 是 ArrayBuffer
      const arrayBuffer = chunk.buffer.slice(
        chunk.byteOffset,
        chunk.byteOffset + chunk.byteLength
      ) as ArrayBuffer
      callback(arrayBuffer, false)
    }

    // 结束
    callback(new ArrayBuffer(0), true)
  }

  /**
   * 语音转文本
   */
  async transcribe(request: STTRequest): Promise<STTResponse> {
    this.validateOptions()

    // 将音频转换为 File 对象
    let audioFile: File
    if (request.audio instanceof File) {
      audioFile = request.audio
    } else if (request.audio instanceof Blob) {
      audioFile = new File([request.audio], 'audio.webm', { type: request.audio.type })
    } else {
      // ArrayBuffer
      const blob = new Blob([request.audio], { type: 'audio/webm' })
      audioFile = new File([blob], 'audio.webm', { type: 'audio/webm' })
    }

    // 调用 OpenAI STT API
    const response = await this.client.audio.transcriptions.create({
      model: this.options.model,
      file: audioFile,
      language: request.language,
      response_format: 'json',
    })

    return {
      text: response.text,
      language: request.language,
    }
  }
}

