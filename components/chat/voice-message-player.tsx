"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceMessagePlayerProps {
  audioUrl: string
  audioDuration?: number
  className?: string
  /** 容器参考宽度，用于计算波形图长度，默认700px */
  containerWidth?: number
}

// 常量配置
const WAVEFORM_CONFIG = {
  // 60秒占容器宽度的30%
  SECONDS_FOR_30_PERCENT: 60,
  WIDTH_PERCENTAGE: 0.3,
  // 最短5秒
  MIN_DURATION_FOR_WIDTH: 5,
  // 播放按钮区域的高度/宽度（也是半圆的直径）
  BUTTON_AREA_SIZE: 36,
  // 播放按钮的大小
  PLAY_BUTTON_SIZE: 24,
  // 波形条的宽度和间距
  BAR_WIDTH: 2,
  BAR_GAP: 1,
}

export function VoiceMessagePlayer({
  audioUrl,
  audioDuration = 0,
  className,
  containerWidth = 700
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(audioDuration || 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // 检查数字是否有效
  const isValidNumber = (n: number) => {
    return typeof n === 'number' && !isNaN(n) && isFinite(n)
  }

  // 生成默认波形 - 必须在 extractWaveform 之前定义
  const generateDefaultWaveform = useCallback((dur: number): number[] => {
    const count = Math.max(8, Math.min(60, Math.ceil(dur * 8)))
    return Array.from({ length: count }, (_, i) => {
      return 0.3 + 0.7 * Math.abs(Math.sin((i * Math.PI) / 5))
    })
  }, [])

  // 从音频提取波形数据
  const extractWaveform = useCallback(async (url: string) => {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const channelData = audioBuffer.getChannelData(0)

      // 根据音频时长决定采样数量（每秒约8个采样点）
      const audioDur = audioBuffer.duration
      const samplesPerSecond = 8
      const numSamples = Math.max(8, Math.min(60, Math.ceil(audioDur * samplesPerSecond)))
      const blockSize = Math.floor(channelData.length / numSamples)

      const waveform: number[] = []
      for (let i = 0; i < numSamples; i++) {
        let sum = 0
        const start = i * blockSize
        const end = Math.min(start + blockSize, channelData.length)

        for (let j = start; j < end; j++) {
          sum += Math.abs(channelData[j])
        }

        const avg = sum / (end - start)
        waveform.push(avg)
      }

      // 归一化到 0.2 - 1.0 范围
      const maxVal = Math.max(...waveform, 0.01)
      const normalized = waveform.map(v => 0.2 + (v / maxVal) * 0.8)

      setWaveformData(normalized)

      if (isValidNumber(audioBuffer.duration)) {
        setDuration(audioBuffer.duration)
      }

      audioContext.close()
    } catch (err) {
      console.error('Failed to extract waveform:', err)
      // 使用默认波形
      setWaveformData(generateDefaultWaveform(audioDuration || 3))
    }
  }, [audioDuration, generateDefaultWaveform])

  useEffect(() => {
    if (audioUrl) {
      extractWaveform(audioUrl)
    }
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [audioUrl, extractWaveform])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (audio.duration && isValidNumber(audio.duration) && isValidNumber(audio.currentTime)) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && isValidNumber(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      try {
        await audio.play()
      } catch (err) {
        console.error('Failed to play audio:', err)
      }
    }
  }, [isPlaying])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return
    
    if (!isValidNumber(audio.duration) || audio.duration <= 0) {
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * audio.duration
    
    if (isValidNumber(newTime)) {
      audio.currentTime = newTime
    }
  }, [])

  const formatTime = useCallback((seconds: number) => {
    if (!isValidNumber(seconds) || seconds < 0) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // 使用提取的波形或默认波形
  const bars = useMemo(() => {
    if (waveformData.length > 0) {
      return waveformData
    }
    return generateDefaultWaveform(audioDuration || 3)
  }, [waveformData, audioDuration])

  // 显示的时长
  const displayDuration = isValidNumber(duration) ? duration : (audioDuration || 0)
  const displayTime = isPlaying ? currentTime : displayDuration
  
  // 计算波形图宽度：60秒=30%容器宽度，最短按5秒计算
  const waveformWidth = useMemo(() => {
    const effectiveDuration = Math.max(
      WAVEFORM_CONFIG.MIN_DURATION_FOR_WIDTH, 
      displayDuration
    )
    // 每秒对应的宽度
    const widthPerSecond = (containerWidth * WAVEFORM_CONFIG.WIDTH_PERCENTAGE) / WAVEFORM_CONFIG.SECONDS_FOR_30_PERCENT
    // 计算波形宽度
    const calculatedWidth = effectiveDuration * widthPerSecond
    // 最大宽度限制为容器的45%，防止超出
    const maxWidth = containerWidth * 0.45
    return Math.min(calculatedWidth, maxWidth)
  }, [displayDuration, containerWidth])

  // 根据宽度计算需要的波形条数
  const barCount = useMemo(() => {
    return Math.max(8, Math.floor(waveformWidth / (WAVEFORM_CONFIG.BAR_WIDTH + WAVEFORM_CONFIG.BAR_GAP)))
  }, [waveformWidth])

  // 根据条数重采样波形数据
  const resampledBars = useMemo(() => {
    if (bars.length === barCount) return bars
    if (bars.length === 0) return []
    
    const result: number[] = []
    for (let i = 0; i < barCount; i++) {
      const sourceIndex = Math.floor((i / barCount) * bars.length)
      result.push(bars[Math.min(sourceIndex, bars.length - 1)])
    }
    return result
  }, [bars, barCount])

  // 气泡半圆半径
  const bubbleRadius = WAVEFORM_CONFIG.BUTTON_AREA_SIZE / 2

  return (
    <div 
      className={cn(
        "inline-flex items-center bg-muted dark:bg-muted relative",
        className
      )}
      style={{
        // 左右两侧半圆形
        borderRadius: `${bubbleRadius}px`,
        height: `${WAVEFORM_CONFIG.BUTTON_AREA_SIZE}px`,
        // 防止超出父容器
        maxWidth: '100%',
      }}
    >
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      
      {/* 播放按钮 - 左侧半圆的同心圆 */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 flex items-center justify-center rounded-full bg-muted dark:bg-muted text-white dark:text-foreground hover:bg-muted dark:hover:bg-muted transition-colors absolute"
        style={{
          width: `${WAVEFORM_CONFIG.PLAY_BUTTON_SIZE}px`,
          height: `${WAVEFORM_CONFIG.PLAY_BUTTON_SIZE}px`,
          left: `${(WAVEFORM_CONFIG.BUTTON_AREA_SIZE - WAVEFORM_CONFIG.PLAY_BUTTON_SIZE) / 2}px`,
        }}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </button>

      {/* 波形图区域 */}
      <div 
        className="flex items-center cursor-pointer"
        onClick={handleProgressClick}
        style={{ 
          marginLeft: `${WAVEFORM_CONFIG.BUTTON_AREA_SIZE}px`,
          width: `${waveformWidth}px`,
          height: `${WAVEFORM_CONFIG.BUTTON_AREA_SIZE - 12}px`, // 上下各留6px padding
        }}
      >
        {resampledBars.map((height, index) => {
          const barProgress = ((index + 0.5) / resampledBars.length) * 100
          const isActive = barProgress <= progress
          
          return (
            <div
              key={index}
              className={cn(
                "rounded-full transition-colors duration-75",
                isActive
                  ? "bg-muted dark:bg-muted"
                  : "bg-muted dark:bg-muted"
              )}
              style={{ 
                width: `${WAVEFORM_CONFIG.BAR_WIDTH}px`,
                marginRight: index < resampledBars.length - 1 ? `${WAVEFORM_CONFIG.BAR_GAP}px` : 0,
                height: `${Math.max(20, height * 100)}%`,
              }}
            />
          )
        })}
      </div>

      {/* 时长显示 - 紧挨在波形图右侧 */}
      <span 
        className="flex-shrink-0 text-[10px] text-muted-foreground dark:text-muted-foreground tabular-nums"
        style={{
          paddingLeft: '4px',
          paddingRight: `${bubbleRadius}px`, // 右侧半圆内的padding
        }}
      >
        {formatTime(displayTime)}
      </span>
    </div>
  )
}
