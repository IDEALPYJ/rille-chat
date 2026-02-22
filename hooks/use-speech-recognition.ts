"use client"

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * 创建 WAV 格式的 Blob
 */
function createWavBlob(pcmData: Int16Array, sampleRate: number): Blob {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmData.length * bytesPerSample
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
  const wavView = new Int16Array(buffer, headerSize)
  wavView.set(pcmData)

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

export interface UseSpeechRecognitionOptions {
  mode: "browser" | "ai"
  language?: string
  onResult?: (text: string) => void
  onInterimResult?: (text: string) => void
  onError?: (error: string) => void
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  interimTranscript: string
  start: () => void
  stop: () => void
  error: string | null
}

// 浏览器语音识别接口
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

/**
 * 语音识别 Hook
 * 支持浏览器自带的语音识别和 AI 服务商的语音识别
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null)
  const pcmChunksRef = useRef<Float32Array[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const [browserSupported, setBrowserSupported] = useState(true)

  // 检查浏览器是否支持语音识别 (在客户端检查)
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setBrowserSupported(supported)
  }, [])
  
  const isSupported = options.mode === "browser" ? browserSupported : true

  // 浏览器语音识别
  const startBrowserRecognition = useCallback(() => {
    if (!browserSupported) {
      setError("浏览器不支持语音识别")
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = options.language || 'zh-CN'

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
        options.onResult?.(finalTranscript)
      }
      
      setInterimTranscript(interim)
      options.onInterimResult?.(interim)
    }

    recognition.onerror = (event: any) => {
      const errorMessage = event.error === 'no-speech' 
        ? '未检测到语音' 
        : event.error === 'audio-capture'
        ? '无法访问麦克风'
        : `语音识别错误: ${event.error}`
      
      setError(errorMessage)
      options.onError?.(errorMessage)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [browserSupported, options])

  const stopBrowserRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  // AI 服务商语音识别 (使用 PCM 格式录制以兼容所有服务商)
  const startAIRecognition = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      })
      
      streamRef.current = stream
      pcmChunksRef.current = []

      // 创建 AudioContext 用于录制 PCM
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      
      // 使用 ScriptProcessorNode 收集音频数据 (虽然已弃用但兼容性更好)
      const bufferSize = 4096
      const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      
      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        // 复制数据以避免引用问题
        pcmChunksRef.current.push(new Float32Array(inputData))
      }

      source.connect(scriptProcessor)
      scriptProcessor.connect(audioContext.destination)
      workletNodeRef.current = scriptProcessor

      setIsListening(true)
      setError(null)

    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError'
        ? '麦克风权限被拒绝'
        : `无法访问麦克风: ${err.message}`
      
      setError(errorMessage)
      options.onError?.(errorMessage)
    }
  }, [options])

  const stopAIRecognition = useCallback(async () => {
    // 停止 ScriptProcessor
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    // 停止 AudioContext
    if (audioContextRef.current) {
      await audioContextRef.current.close()
      audioContextRef.current = null
    }

    // 停止媒体流
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // 处理录制的 PCM 数据
    if (pcmChunksRef.current.length > 0) {
      try {
        // 合并所有 PCM 数据
        const totalLength = pcmChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0)
        const mergedFloat32 = new Float32Array(totalLength)
        let offset = 0
        for (const chunk of pcmChunksRef.current) {
          mergedFloat32.set(chunk, offset)
          offset += chunk.length
        }

        // 将 Float32 转换为 Int16 PCM
        const pcmInt16 = new Int16Array(mergedFloat32.length)
        for (let i = 0; i < mergedFloat32.length; i++) {
          const sample = Math.max(-1, Math.min(1, mergedFloat32[i]))
          pcmInt16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        }

        // 创建 WAV 文件 (带头部，便于调试，但服务端会处理)
        const wavBlob = createWavBlob(pcmInt16, 16000)

        // 发送到 STT API
        const formData = new FormData()
        formData.append('audio', wavBlob, 'recording.wav')
        if (options.language) {
          formData.append('language', options.language)
        }

        const response = await fetch('/api/stt', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `STT API error: ${response.status}`)
        }

        const data = await response.json()
        const text = data.text

        if (text) {
          setTranscript(text)
          options.onResult?.(text)
        }
      } catch (err: any) {
        const errorMessage = `语音识别失败: ${err.message}`
        setError(errorMessage)
        options.onError?.(errorMessage)
      }
    }

    pcmChunksRef.current = []
    setIsListening(false)
  }, [options])

  // 开始识别
  const start = useCallback(() => {
    setTranscript("")
    setInterimTranscript("")
    setError(null)

    if (options.mode === "browser") {
      startBrowserRecognition()
    } else {
      startAIRecognition()
    }
  }, [options.mode, startBrowserRecognition, startAIRecognition])

  // 停止识别
  const stop = useCallback(() => {
    if (options.mode === "browser") {
      stopBrowserRecognition()
    } else {
      stopAIRecognition()
    }
  }, [options.mode, stopBrowserRecognition, stopAIRecognition])

  // 清理
  useEffect(() => {
    return () => {
      stopBrowserRecognition()
      stopAIRecognition()
    }
  }, [stopBrowserRecognition, stopAIRecognition])

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    start,
    stop,
    error
  }
}
