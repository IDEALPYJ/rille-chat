/**
 * TTS (Text-to-Speech) 服务
 * 用于管理语音合成的播放队列和流式断句
 */

import { StreamAudioPlayer } from './stream-player'
import { logger } from '@/lib/logger'

export interface TTSQueueItem {
  id: string
  text: string
  status: 'pending' | 'loading' | 'playing' | 'completed' | 'error'
  audio?: HTMLAudioElement
  audioUrl?: string
}

// 断句结束符正则
const SENTENCE_END_REGEX = /[。！？.!?\n]/

/**
 * 将 PCM 数据转换为 WAV Blob
 * PCM 格式: 16-bit signed integer, mono, 24kHz
 */
function pcmToWav(pcmData: ArrayBuffer, sampleRate: number = 24000): Blob {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmData.byteLength
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const buffer = new ArrayBuffer(totalSize)
  const view = new DataView(buffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalSize - 8, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // audio format (PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Copy PCM data
  const pcmView = new Uint8Array(pcmData)
  const wavView = new Uint8Array(buffer)
  wavView.set(pcmView, headerSize)

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/**
 * 流式断句器
 * 用于将流式文本拆分为句子
 */
export class StreamSentenceSplitter {
  private buffer: string = ''
  private sentences: string[] = []

  /**
   * 添加文本片段到缓冲区
   * @param chunk 新的文本片段
   * @returns 完整的句子（如果有的话）
   */
  addChunk(chunk: string): string | null {
    this.buffer += chunk
    
    // 检查是否有断句符
    const match = this.buffer.match(SENTENCE_END_REGEX)
    if (match && match.index !== undefined) {
      // 提取完整的句子
      const endIndex = match.index + 1
      const sentence = this.buffer.slice(0, endIndex).trim()
      this.buffer = this.buffer.slice(endIndex)
      
      if (sentence) {
        this.sentences.push(sentence)
        return sentence
      }
    }
    
    return null
  }

  /**
   * 获取剩余的文本（流结束时调用）
   */
  flush(): string | null {
    const remaining = this.buffer.trim()
    this.buffer = ''
    return remaining || null
  }

  /**
   * 重置状态
   */
  reset() {
    this.buffer = ''
    this.sentences = []
  }

  /**
   * 获取所有已处理的句子
   */
  getSentences(): string[] {
    return [...this.sentences]
  }
}

/**
 * TTS 播放队列管理器（支持流式播放）
 */
export class TTSQueueManager {
  private queue: TTSQueueItem[] = []
  private isProcessing: boolean = false
  private currentItem: TTSQueueItem | null = null
  private onStatusChange?: (queue: TTSQueueItem[], current: TTSQueueItem | null) => void
  private abortController: AbortController | null = null
  private streamPlayer: StreamAudioPlayer

  constructor() {
    this.streamPlayer = new StreamAudioPlayer(() => {
        // 当一段音频流播放结束时调用
        // 注意：这里的结束可能只是当前缓冲播放完了，不代表整个任务结束
        // 我们主要依赖 processQueue 来驱动
    })
  }

  setOnStatusChange(callback: (queue: TTSQueueItem[], current: TTSQueueItem | null) => void) {
    this.onStatusChange = callback
  }

  private notifyStatusChange() {
    this.onStatusChange?.(this.queue, this.currentItem)
  }

  /**
   * 将句子添加到播放队列
   */
  enqueue(text: string): string {
    const id = Math.random().toString(36).substring(7)
    const item: TTSQueueItem = {
      id,
      text,
      status: 'pending'
    }
    this.queue.push(item)
    this.notifyStatusChange()
    
    // 如果没有正在处理，立即开始
    if (!this.isProcessing) {
      this.processQueue()
    }
    
    return id
  }

  /**
   * 处理队列：顺序处理
   */
  private async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false
      this.currentItem = null
      this.notifyStatusChange()
      return
    }

    this.isProcessing = true
    const item = this.queue[0] // 获取队首元素
    this.currentItem = item
    
    // 标记为正在播放 (实际上是开始请求并边下边播)
    item.status = 'playing'
    this.notifyStatusChange()

    this.abortController = new AbortController()

    try {
      await this.streamSynthesize(item.text, this.abortController.signal)
      
      // 播放完成后移除
      item.status = 'completed'
      this.queue.shift()
    } catch (error: unknown) {
        if (error instanceof Error && error.name !== 'AbortError') {
            logger.error('TTS synthesis error', error, { itemId: item.id });
            item.status = 'error'
        }
        // 即使出错也移除，以免阻塞队列
        this.queue.shift()
    } finally {
        this.abortController = null
        this.currentItem = null
        this.notifyStatusChange()
        
        // 处理下一项
        this.processQueue()
    }
  }

  /**
   * 调用流式 TTS API 并播放
   */
  private async streamSynthesize(text: string, signal: AbortSignal): Promise<void> {
    const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal
    })

    if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`)
    }

    // 获取音频格式信息
    const contentType = response.headers.get('Content-Type') || ''
    const isPCM = contentType.includes('audio/pcm')
    let sampleRate = 24000
    if (isPCM) {
        sampleRate = parseInt(response.headers.get('X-Audio-Sample-Rate') || '24000', 10)
        this.streamPlayer.setSampleRate(sampleRate)
    }

    if (!response.body) {
        throw new Error('Response body is empty')
    }

    const reader = response.body.getReader()

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        if (value) {
            // 将接收到的 chunk 送入播放器
            if (isPCM) {
                await this.streamPlayer.playPCMChunk(value.buffer)
            } else {
                await this.streamPlayer.playAudioChunk(value.buffer)
            }
        }
    }
  }

  /**
   * 停止播放并清空队列
   */
  stop() {
    // 中止当前请求
    if (this.abortController) {
        this.abortController.abort()
        this.abortController = null
    }
    
    // 停止播放器
    this.streamPlayer.stop()
    
    // 清空队列
    this.queue = []
    this.isProcessing = false
    this.currentItem = null
    this.notifyStatusChange()
  }

  /**
   * 获取当前队列状态
   */
  getQueueStatus(): { queue: TTSQueueItem[], current: TTSQueueItem | null, isPlaying: boolean } {
    return {
      queue: [...this.queue],
      current: this.currentItem,
      isPlaying: this.isProcessing || this.streamPlayer.isAudioPlaying
    }
  }
}

/**
 * 单次 TTS 播放（非流式）
 * 用于播放完整的消息内容
 */
export async function speakText(text: string): Promise<HTMLAudioElement | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`)
    }

    const contentType = response.headers.get('Content-Type') || ''
    const arrayBuffer = await response.arrayBuffer()
    
    let blob: Blob
    
    // 处理 PCM 格式 (阿里云返回)
    if (contentType.includes('audio/pcm')) {
      const sampleRate = parseInt(response.headers.get('X-Audio-Sample-Rate') || '24000', 10)
      blob = pcmToWav(arrayBuffer, sampleRate)
    } else {
      // MP3 或其他格式
      blob = new Blob([arrayBuffer], { type: contentType || 'audio/mpeg' })
    }
    
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    audio.onended = () => {
      URL.revokeObjectURL(url)
    }
    
    await audio.play()
    return audio
  } catch (error: unknown) {
    logger.error('TTS error', error, { text });
    return null
  }
}
