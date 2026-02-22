/**
 * 流式音频播放器
 * 使用 Web Audio API 实现无缝流式播放
 */

// 前端 logger 工具（完整版，用于客户端代码）
// 支持完整的日志级别和上下文记录
const clientLogger = {
  error: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
       
      console.error(`[ERROR] ${message}`, error, context);
    }
    // 在生产环境也可以选择性地发送错误到日志服务
    // 这里可以添加错误上报逻辑
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
       
      console.warn(`[WARN] ${message}`, context);
    }
  },
  info: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(`[INFO] ${message}`, context);
    }
  },
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG === 'true') {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}`, context);
    }
  },
  log: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[LOG] ${message}`, context);
    }
  }
};

export class StreamAudioPlayer {
  private audioContext: AudioContext | null = null
  private nextStartTime: number = 0
  private isPlaying: boolean = false
  private audioQueue: AudioBufferSourceNode[] = []
  private gainNode: GainNode | null = null
  private onEnded?: () => void
  private endedTimeout: NodeJS.Timeout | null = null
  private hasReceivedData: boolean = false
  private sampleRate: number = 24000 // 默认采样率

  constructor(onEnded?: () => void) {
    this.onEnded = onEnded
  }

  /**
   * 初始化 AudioContext
   */
  private initAudioContext(sampleRate?: number) {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioContextClass({
          sampleRate: sampleRate // 尝试使用指定的采样率，但浏览器可能会忽略
      })
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.nextStartTime = 0
    }
  }

  /**
   * 设置采样率 (应在播放前调用)
   */
  setSampleRate(rate: number) {
    this.sampleRate = rate
  }

  /**
   * 处理 PCM 音频块 (16-bit signed integer)
   */
  async playPCMChunk(chunk: ArrayBuffer) {
    if (!chunk || chunk.byteLength === 0) return

    this.hasReceivedData = true
    this.initAudioContext(this.sampleRate)

    if (!this.audioContext || !this.gainNode) return

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    // 转换 PCM 数据 (Int16 -> Float32)
    const int16Array = new Int16Array(chunk)
    const float32Array = new Float32Array(int16Array.length)
    
    for (let i = 0; i < int16Array.length; i++) {
      // 归一化到 [-1.0, 1.0]
      const s = Math.max(-1, Math.min(1, int16Array[i] / 32768))
      float32Array[i] = s
    }

    // 创建 AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      1, // 单声道
      float32Array.length,
      this.sampleRate // 使用正确的采样率
    )
    
    audioBuffer.copyToChannel(float32Array, 0)

    this.scheduleBuffer(audioBuffer)
  }

  /**
   * 处理普通音频块 (MP3/WAV 等，需要解码)
   */
  async playAudioChunk(chunk: ArrayBuffer) {
    if (!chunk || chunk.byteLength === 0) return

    this.hasReceivedData = true
    this.initAudioContext()

    if (!this.audioContext || !this.gainNode) return

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    try {
      // 解码音频数据
      // 注意: decodeAudioData 会 detach array buffer，所以如果需要复用需要复制
      const audioBuffer = await this.audioContext.decodeAudioData(chunk.slice(0))
      this.scheduleBuffer(audioBuffer)
    } catch (e) {
      clientLogger.error('Error decoding audio chunk', e, { chunkSize: chunk.byteLength });
    }
  }

  /**
   * 调度 AudioBuffer 播放
   */
  private scheduleBuffer(audioBuffer: AudioBuffer) {
    if (!this.audioContext || !this.gainNode) return

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.gainNode)

    // 计算开始时间，确保无缝连接
    // 如果 nextStartTime 已经过期（小于当前时间），则重置为当前时间
    // 加一个小延迟以避免"咔哒"声
    const currentTime = this.audioContext.currentTime
    // 允许 0.05s 的重叠容差
    if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.05
    }

    source.start(this.nextStartTime)
    
    this.nextStartTime += audioBuffer.duration
    this.audioQueue.push(source)
    this.isPlaying = true

    // 清除之前的结束计时器
    if (this.endedTimeout) {
      clearTimeout(this.endedTimeout)
      this.endedTimeout = null
    }

    // 设置新的结束计时器
    const timeUntilEnd = (this.nextStartTime - currentTime) * 1000
    this.endedTimeout = setTimeout(() => {
      if (this.audioContext && this.audioContext.currentTime >= this.nextStartTime - 0.1) {
        this.handleEnded()
      }
    }, timeUntilEnd + 100) // 多加 100ms 缓冲
  }

  /**
   * 处理播放结束
   */
  private handleEnded() {
    this.isPlaying = false
    this.nextStartTime = 0
    this.hasReceivedData = false
    this.audioQueue = []
    this.onEnded?.()
  }

  /**
   * 停止播放
   */
  stop() {
    this.audioQueue.forEach(source => {
      try {
        source.stop()
      } catch {
        // Ignore errors if already stopped
      }
    })
    this.audioQueue = []
    this.isPlaying = false
    this.nextStartTime = 0
    this.hasReceivedData = false
    
    if (this.endedTimeout) {
      clearTimeout(this.endedTimeout)
      this.endedTimeout = null
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().then(() => {
            this.audioContext = null;
        });
    } else {
        this.audioContext = null;
    }
  }

  get isAudioPlaying() {
    return this.isPlaying
  }
}