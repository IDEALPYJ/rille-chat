/**
 * 阿里云语音服务提供者
 * 支持 TTS (Qwen3-TTS-Flash-Realtime) 和 STT (Qwen3-ASR-Flash-Realtime)
 * 使用 WebSocket 协议实现实时语音合成和识别
 */

import WebSocket from 'ws'
import { VoiceProvider } from './base'
import {
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceProviderInfo,
  TTSStreamCallback,
} from '../types'
import { logger } from '@/lib/logger'

// 默认配置
const DEFAULT_BASE_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime'
const DEFAULT_VOICE = 'Cherry'
const DEFAULT_SAMPLE_RATE = 24000

// 超时配置
const CONNECTION_TIMEOUT = 10000
const RESPONSE_TIMEOUT = 30000

/**
 * 阿里云语音服务提供者
 */
export class AliyunVoiceProvider extends VoiceProvider {
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
  }

  getInfo(): VoiceProviderInfo {
    return {
      id: 'aliyun',
      name: '阿里云',
      supportsTTS: true,
      supportsSTT: true,
      ttsModels: ['qwen3-tts-flash-realtime'],
      sttModels: ['qwen3-asr-flash-realtime'],
    }
  }

  /**
   * 生成唯一事件 ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 检测音频格式
   */
  private detectAudioFormat(buffer: Buffer): string {
    // WAV: RIFF header
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'RIFF') {
      return 'wav'
    }
    // WebM: EBML header
    if (buffer.length >= 4 && buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return 'webm'
    }
    // MP3: ID3 or sync word
    if (buffer.length >= 3 && (buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0))) {
      return 'mp3'
    }
    // OGG: OggS header
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') {
      return 'ogg'
    }
    // FLAC: fLaC header
    if (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'fLaC') {
      return 'flac'
    }
    // Default to PCM
    return 'pcm'
  }

  /**
   * 判断是否为 WAV 格式
   */
  private isWavFormat(buffer: Buffer): boolean {
    return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'RIFF'
  }

  /**
   * 文本转语音 (TTS)
   * 使用 WebSocket 连接到阿里云实时语音合成服务
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    this.validateOptions()

    const voice = request.voice || this.options.voice || DEFAULT_VOICE
    const sampleRate = request.sampleRate || DEFAULT_SAMPLE_RATE

    return new Promise((resolve, reject) => {
      const audioChunks: Buffer[] = []
      let connectionTimeout: NodeJS.Timeout // eslint-disable-line prefer-const
      let responseTimeout: NodeJS.Timeout  
      let isResolved = false

      // 构建 WebSocket URL (需要在 URL 中指定模型)
      const baseUrl = this.options.baseURL || DEFAULT_BASE_URL
      const wsUrl = `${baseUrl}?model=${this.options.model}`

      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
      })

      const cleanup = () => {
        clearTimeout(connectionTimeout)
        clearTimeout(responseTimeout)
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }

      const resolveOnce = (result: TTSResponse) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          resolve(result)
        }
      }

      const rejectOnce = (error: Error) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(error)
        }
      }

      // 连接超时
      connectionTimeout = setTimeout(() => {
        rejectOnce(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(connectionTimeout)

        // 发送会话配置
        const sessionUpdate = {
          event_id: this.generateEventId(),
          type: 'session.update',
          session: {
            mode: 'server_commit',
            voice: voice,
            language_type: 'Auto',
            response_format: 'pcm',
            sample_rate: sampleRate,
          },
        }
        ws.send(JSON.stringify(sessionUpdate))

        // 发送文本
        const appendText = {
          event_id: this.generateEventId(),
          type: 'input_text_buffer.append',
          text: request.text,
        }
        ws.send(JSON.stringify(appendText))

        // 发送结束信号
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const finishSession = {
              event_id: this.generateEventId(),
              type: 'session.finish',
            }
            ws.send(JSON.stringify(finishSession))
          }
        }, 500)

        // 响应超时
        responseTimeout = setTimeout(() => {
          rejectOnce(new Error('Response timeout'))
        }, RESPONSE_TIMEOUT)
      })

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString())
          const eventType = message.type

          if (eventType === 'error') {
            const error = message.error || {}
            rejectOnce(new Error(`Aliyun TTS Error: ${error.message || 'Unknown error'}`))
            return
          }

          // 处理音频数据
          if (eventType === 'response.audio.delta' && message.delta) {
            const audioData = Buffer.from(message.delta, 'base64')
            audioChunks.push(audioData)
          }

          // 会话结束
          if (eventType === 'session.finished' || eventType === 'response.done') {
            // 合并所有音频块
            const audioBuffer = Buffer.concat(audioChunks)
            
            // 将 PCM 转换为 ArrayBuffer
            const arrayBuffer = audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + audioBuffer.byteLength
            )

            resolveOnce({
              audio: arrayBuffer,
              contentType: 'audio/pcm',
            })
          }
        } catch (e) {
          // 忽略解析错误，但记录日志
          logger.debug('Failed to parse WebSocket message in TTS', { error: e });
        }
      })

      ws.on('error', (error) => {
        rejectOnce(new Error(`WebSocket error: ${error.message}`))
      })

      ws.on('close', (code, reason) => {
        if (!isResolved && audioChunks.length > 0) {
          // 连接关闭但有数据，返回已收到的数据
          const audioBuffer = Buffer.concat(audioChunks)
          const arrayBuffer = audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          )
          resolveOnce({
            audio: arrayBuffer,
            contentType: 'audio/pcm',
          })
        } else if (!isResolved) {
          rejectOnce(new Error(`WebSocket closed: ${code} - ${reason}`))
        }
      })
    })
  }

  /**
   * 流式 TTS
   */
  async synthesizeStream(request: TTSRequest, callback: TTSStreamCallback): Promise<void> {
    this.validateOptions()

    const voice = request.voice || this.options.voice || DEFAULT_VOICE
    const sampleRate = request.sampleRate || DEFAULT_SAMPLE_RATE

    return new Promise((resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout // eslint-disable-line prefer-const
      let isResolved = false

      // 构建 WebSocket URL (需要在 URL 中指定模型)
      const baseUrl = this.options.baseURL || DEFAULT_BASE_URL
      const wsUrl = `${baseUrl}?model=${this.options.model}`

      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
      })

      const cleanup = () => {
        clearTimeout(connectionTimeout)
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }

      const resolveOnce = () => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          resolve()
        }
      }

      const rejectOnce = (error: Error) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(error)
        }
      }

      // 连接超时
      connectionTimeout = setTimeout(() => {
        rejectOnce(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(connectionTimeout)

        // 发送会话配置
        const sessionUpdate = {
          event_id: this.generateEventId(),
          type: 'session.update',
          session: {
            mode: 'server_commit',
            voice: voice,
            language_type: 'Auto',
            response_format: 'pcm',
            sample_rate: sampleRate,
          },
        }
        ws.send(JSON.stringify(sessionUpdate))

        // 发送文本
        const appendText = {
          event_id: this.generateEventId(),
          type: 'input_text_buffer.append',
          text: request.text,
        }
        ws.send(JSON.stringify(appendText))

        // 发送结束信号
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const finishSession = {
              event_id: this.generateEventId(),
              type: 'session.finish',
            }
            ws.send(JSON.stringify(finishSession))
          }
        }, 500)
      })

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString())
          const eventType = message.type

          if (eventType === 'error') {
            const error = message.error || {}
            rejectOnce(new Error(`Aliyun TTS Error: ${error.message || 'Unknown error'}`))
            return
          }

          // 流式返回音频数据
          if (eventType === 'response.audio.delta' && message.delta) {
            const audioData = Buffer.from(message.delta, 'base64')
            const arrayBuffer = audioData.buffer.slice(
              audioData.byteOffset,
              audioData.byteOffset + audioData.byteLength
            )
            callback(arrayBuffer, false)
          }

          // 会话结束
          if (eventType === 'session.finished') {
            callback(new ArrayBuffer(0), true)
            resolveOnce()
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      })

      ws.on('error', (error) => {
        rejectOnce(new Error(`WebSocket error: ${error.message}`))
      })

      ws.on('close', () => {
        if (!isResolved) {
          callback(new ArrayBuffer(0), true)
          resolveOnce()
        }
      })
    })
  }

  /**
   * 语音转文本 (STT)
   * 使用 WebSocket 连接到阿里云实时语音识别服务
   * 注意: 阿里云实时 ASR 需要 PCM 格式的音频 (16kHz, 16-bit, mono)
   */
  async transcribe(request: STTRequest): Promise<STTResponse> {
    this.validateOptions()

    // 获取音频数据
    let audioBuffer: Buffer
    if (request.audio instanceof File || request.audio instanceof Blob) {
      const arrayBuffer = await (request.audio as Blob).arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
    } else {
      audioBuffer = Buffer.from(request.audio as ArrayBuffer)
    }

    // 检查音频格式
    const audioFormat = request.format || this.detectAudioFormat(audioBuffer)
    
    // 如果不是 PCM 格式，尝试提取原始数据或报错
    if (audioFormat !== 'pcm' && audioFormat !== 'wav') {
      // 对于 webm/mp4 等格式，阿里云实时 ASR 不支持
      // 这里我们尝试将 WAV 文件去掉头部处理
      if (audioFormat === 'wav' || this.isWavFormat(audioBuffer)) {
        // WAV 文件，跳过 44 字节的头部
        audioBuffer = audioBuffer.slice(44)
      } else {
        throw new Error(`阿里云实时语音识别不支持 ${audioFormat} 格式，请使用 PCM 或 WAV 格式`)
      }
    }

    const sampleRate = request.sampleRate || 16000
    const language = request.language || 'zh'

    return new Promise((resolve, reject) => {
      let connectionTimeout: NodeJS.Timeout // eslint-disable-line prefer-const
      let responseTimeout: NodeJS.Timeout  
      let isResolved = false
      let transcript = ''

      // 构建 WebSocket URL (带模型参数)
      const baseUrl = this.options.baseURL || DEFAULT_BASE_URL
      const wsUrl = `${baseUrl}?model=${this.options.model}`

      const ws = new WebSocket(wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.options.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      const cleanup = () => {
        clearTimeout(connectionTimeout)
        clearTimeout(responseTimeout)
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }

      const resolveOnce = (result: STTResponse) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          resolve(result)
        }
      }

      const rejectOnce = (error: Error) => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(error)
        }
      }

      connectionTimeout = setTimeout(() => {
        rejectOnce(new Error('Connection timeout'))
      }, CONNECTION_TIMEOUT)

      ws.on('open', () => {
        clearTimeout(connectionTimeout)

        // 发送会话配置
        // 注意：阿里云 Qwen3-ASR 不需要显式指定 language，模型会自动检测
        const sessionUpdate = {
          event_id: this.generateEventId(),
          type: 'session.update',
          session: {
            modalities: ['text'],
            input_audio_format: 'pcm',
            sample_rate: sampleRate,
            // 关闭 VAD，使用手动提交模式
            turn_detection: null,
          },
        }
        ws.send(JSON.stringify(sessionUpdate))

        // 分块发送音频数据 (快速发送，不模拟实时流速)
        const chunkSize = 16000 // 更大的块以提高吞吐量
        let offset = 0

        // 等待会话配置完成后开始发送
        // 简单延迟一点确保 session.update 先到达
        setTimeout(() => {
          try {
            while (offset < audioBuffer.length && ws.readyState === WebSocket.OPEN) {
              const chunk = audioBuffer.slice(offset, offset + chunkSize)
              offset += chunkSize

              const appendAudio = {
                event_id: this.generateEventId(),
                type: 'input_audio_buffer.append',
                audio: chunk.toString('base64'),
              }
              ws.send(JSON.stringify(appendAudio))
            }

            // 发送提交信号
            if (ws.readyState === WebSocket.OPEN) {
              const commit = {
                event_id: this.generateEventId(),
                type: 'input_audio_buffer.commit',
              }
              ws.send(JSON.stringify(commit))
            }
          } catch (e) {
            logger.error('Error sending audio chunks in STT', e as Error, {});
            rejectOnce(e instanceof Error ? e : new Error(String(e)))
          }
        }, 100)

        // 响应超时
        responseTimeout = setTimeout(() => {
          if (transcript) {
            resolveOnce({ text: transcript, language })
          } else {
            rejectOnce(new Error('Response timeout'))
          }
        }, RESPONSE_TIMEOUT)
      })

      ws.on('message', (data: Buffer | string) => {
        try {
          const message = JSON.parse(data.toString())
          const eventType = message.type

          if (eventType === 'error') {
            const error = message.error || {}
            rejectOnce(new Error(`Aliyun STT Error: ${error.message || 'Unknown error'}`))
            return
          }

          // 实时转写结果
          if (eventType === 'conversation.item.input_audio_transcription.text') {
            // 更新临时结果
            transcript = (message.text || '') + (message.stash || '')
          }

          // 最终转写结果
          if (eventType === 'conversation.item.input_audio_transcription.completed') {
            const finalTranscript = message.transcript || transcript
            resolveOnce({
              text: finalTranscript,
              language: message.language || language,
            })
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      })

      ws.on('error', (error) => {
        rejectOnce(new Error(`WebSocket error: ${error.message}`))
      })

      ws.on('close', (code, reason) => {
        if (!isResolved) {
          if (transcript) {
            resolveOnce({ text: transcript, language })
          } else {
            rejectOnce(new Error(`WebSocket closed: ${code} - ${reason}`))
          }
        }
      })
    })
  }
}

