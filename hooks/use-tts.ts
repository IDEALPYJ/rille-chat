"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { TTSQueueManager, StreamSentenceSplitter, TTSQueueItem } from '@/lib/voice/tts-service'

// 分句正则表达式
const SENTENCE_SPLIT_REGEX = /(?<=[。！？.!?\n])/

// 最小句子长度（字符数），避免发送太短的文本导致停顿
const MIN_SENTENCE_LENGTH = 50
// 理想句子长度
const IDEAL_SENTENCE_LENGTH = 150

// 将长文本分割成句子（确保每个句子足够长）
function splitTextToSentences(text: string): string[] {
  // 先按句号等断句符分割
  const rawSentences = text.split(SENTENCE_SPLIT_REGEX)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  if (rawSentences.length === 0) return []
  
  // 合并短句子，确保每个句子足够长
  const sentences: string[] = []
  let currentSentence = ''
  
  for (const sentence of rawSentences) {
    const combined = currentSentence ? currentSentence + sentence : sentence
    
    // 如果合并后的长度达到理想长度，或者当前句子已经足够长且合并后会超过理想长度，就提交当前句子
    if (combined.length >= IDEAL_SENTENCE_LENGTH || 
        (currentSentence.length >= MIN_SENTENCE_LENGTH && combined.length > IDEAL_SENTENCE_LENGTH * 1.5)) {
      if (currentSentence) {
        sentences.push(currentSentence)
      }
      currentSentence = sentence
    } else {
      currentSentence = combined
    }
  }
  
  // 添加最后一个句子
  if (currentSentence) {
    sentences.push(currentSentence)
  }
  
  // 如果还是没有分割成功（整个文本很短），按固定长度分割
  if (sentences.length === 1 && text.length > IDEAL_SENTENCE_LENGTH * 2) {
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
      // 尝试在标点或空格处分割，目标长度IDEAL_SENTENCE_LENGTH
      let splitPoint = Math.min(IDEAL_SENTENCE_LENGTH, remaining.length)
      if (splitPoint < remaining.length) {
        // 寻找最近的断点（在MIN_SENTENCE_LENGTH之后）
        const commaPos = remaining.lastIndexOf('，', splitPoint)
        const spacePos = remaining.lastIndexOf(' ', splitPoint)
        const colonPos = remaining.lastIndexOf('：', splitPoint)
        const semicolonPos = remaining.lastIndexOf('；', splitPoint)
        const periodPos = remaining.lastIndexOf('。', splitPoint)
        
        const candidates = [commaPos, spacePos, colonPos, semicolonPos, periodPos]
          .filter(p => p >= MIN_SENTENCE_LENGTH)
        if (candidates.length > 0) {
          splitPoint = Math.max(...candidates) + 1
        } else if (splitPoint < MIN_SENTENCE_LENGTH) {
          // 如果找不到合适的断点且还没到最小长度，继续扩展
          splitPoint = Math.min(IDEAL_SENTENCE_LENGTH * 1.5, remaining.length)
        }
      }
      chunks.push(remaining.slice(0, splitPoint).trim())
      remaining = remaining.slice(splitPoint).trim()
    }
    return chunks.filter(s => s.length > 0)
  }
  
  return sentences.length > 0 ? sentences : [text]
}

export interface UseTTSReturn {
  // 状态
  isPlaying: boolean
  isSpeaking: boolean // Alias for isPlaying for backward compatibility
  queue: TTSQueueItem[]
  
  // 方法
  speak: (text: string) => Promise<void>
  stop: () => void
  
  // 流式TTS相关
  startStreamTTS: () => void
  addStreamChunk: (chunk: string) => void
  endStreamTTS: () => void
}

/**
 * TTS Hook
 * 用于在组件中管理语音合成
 */
export function useTTS(): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false)
  const [queue, setQueue] = useState<TTSQueueItem[]>([])
  
  const queueManagerRef = useRef<TTSQueueManager | null>(null)
  const splitterRef = useRef<StreamSentenceSplitter | null>(null)

  // 初始化队列管理器
  useEffect(() => {
    const manager = new TTSQueueManager()
    manager.setOnStatusChange((newQueue, _current) => {
      setQueue([...newQueue])
      // 只要队列不为空或有当前项，或者 manager 报告正在播放，就认为是在播放中
      const status = manager.getQueueStatus()
      setIsPlaying(status.isPlaying)
    })
    queueManagerRef.current = manager

    return () => {
      manager.stop()
    }
  }, [])

  /**
   * 播放完整文本（支持长文本流式分句播放）
   */
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return
    
    setIsPlaying(true)
    
    try {
      // 将文本分割成句子
      const sentences = splitTextToSentences(text)
      
      if (sentences.length === 0) {
        setIsPlaying(false)
        return
      }
      
      // 使用队列管理器播放每个句子
      const manager = queueManagerRef.current
      if (!manager) {
        console.error('TTS queue manager not initialized')
        setIsPlaying(false)
        return
      }
      
      // 将所有句子加入队列
      for (const sentence of sentences) {
        if (sentence.trim()) {
          manager.enqueue(sentence)
        }
      }
      
    } catch (error) {
      console.error('TTS speak error:', error)
      setIsPlaying(false)
    }
  }, [])

  /**
   * 停止播放
   */
  const stop = useCallback(() => {
    queueManagerRef.current?.stop()
    setIsPlaying(false)
    setQueue([])
  }, [])

  /**
   * 开始流式TTS
   */
  const startStreamTTS = useCallback(() => {
    splitterRef.current = new StreamSentenceSplitter()
    setIsPlaying(true)
  }, [])

  /**
   * 添加流式文本块
   */
  const addStreamChunk = useCallback((chunk: string) => {
    if (!splitterRef.current) return
    
    const sentence = splitterRef.current.addChunk(chunk)
    if (sentence) {
      queueManagerRef.current?.enqueue(sentence)
    }
  }, [])

  /**
   * 结束流式TTS
   */
  const endStreamTTS = useCallback(() => {
    if (!splitterRef.current) return
    
    const remaining = splitterRef.current.flush()
    if (remaining) {
      queueManagerRef.current?.enqueue(remaining)
    }
    
    splitterRef.current = null
  }, [])

  return {
    isPlaying,
    isSpeaking: isPlaying,
    queue,
    speak,
    stop,
    startStreamTTS,
    addStreamChunk,
    endStreamTTS
  }
}
