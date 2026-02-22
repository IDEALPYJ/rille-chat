"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Mic,
  Volume2,
  Check,
  Loader2,
  RefreshCcw,
  ChevronLeft,
  ChevronDown,
} from "lucide-react"
import { VoicePlayButton } from "./voice-play-button"
import { cn } from "@/lib/utils"
import { SettingsState, VoiceConfig } from "./types"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"

interface VoiceSettingsProps {
  settings: SettingsState
  onUpdateSettings: (updates: Partial<SettingsState>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
  preloadedAudios?: Map<string, HTMLAudioElement>
}

// 语音识别服务商配置
const STT_PROVIDERS = [
  {
    id: "browser",
    name: "浏览器自带",
    models: [],
    requiresApiKey: false,
    defaultBaseURL: ""
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "whisper-1", name: "Whisper" }
    ],
    requiresApiKey: true,
    defaultBaseURL: "https://api.openai.com/v1"
  },
  {
    id: "aliyun",
    name: "阿里云",
    models: [
      { id: "qwen3-asr-flash-realtime", name: "Qwen3-ASR-Flash-Realtime" }
    ],
    requiresApiKey: true,
    defaultBaseURL: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"
  }
]

// 语音合成服务商配置
export const TTS_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { 
        id: "tts-1", 
        name: "TTS-1",
        voices: [
          { id: "alloy", name: "Alloy" },
          { id: "ash", name: "Ash" },
          { id: "coral", name: "Coral" },
          { id: "echo", name: "Echo" },
          { id: "fable", name: "Fable" },
          { id: "nova", name: "Nova" },
          { id: "onyx", name: "Onyx" },
          { id: "sage", name: "Sage" },
          { id: "shimmer", name: "Shimmer" }
        ]
      },
      { 
        id: "tts-1-hd", 
        name: "TTS-1 HD",
        voices: [
          { id: "alloy", name: "Alloy" },
          { id: "ash", name: "Ash" },
          { id: "coral", name: "Coral" },
          { id: "echo", name: "Echo" },
          { id: "fable", name: "Fable" },
          { id: "nova", name: "Nova" },
          { id: "onyx", name: "Onyx" },
          { id: "sage", name: "Sage" },
          { id: "shimmer", name: "Shimmer" }
        ]
      },
      { 
        id: "gpt-4o-mini-tts", 
        name: "GPT-4o Mini TTS",
        voices: [
          { id: "alloy", name: "Alloy" },
          { id: "ash", name: "Ash" },
          { id: "ballad", name: "Ballad" },
          { id: "cedar", name: "Cedar" },
          { id: "coral", name: "Coral" },
          { id: "echo", name: "Echo" },
          { id: "fable", name: "Fable" },
          { id: "marin", name: "Marin" },
          { id: "nova", name: "Nova" },
          { id: "onyx", name: "Onyx" },
          { id: "sage", name: "Sage" },
          { id: "shimmer", name: "Shimmer" },
          { id: "verse", name: "Verse" }
        ]
      }
    ],
    requiresApiKey: true,
    defaultBaseURL: "https://api.openai.com/v1"
  },
  {
    id: "aliyun",
    name: "阿里云",
    models: [
      { 
        id: "qwen3-tts-flash-realtime", 
        name: "Qwen3-TTS-Flash-Realtime",
        voices: [
          { id: "Cherry", name: "芊悦" },
          { id: "Ethan", name: "晨煦" },
          { id: "Nofish", name: "不吃鱼" },
          { id: "Jennifer", name: "詹妮弗" },
          { id: "Ryan", name: "甜茶" },
          { id: "Katerina", name: "卡捷琳娜" },
          { id: "Elias", name: "墨讲师" }
        ]
      }
    ],
    requiresApiKey: true,
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  }
]

export function VoiceSettings({
  settings,
  onUpdateSettings,
  saveStatus,
  onSave,
  onBack,
  preloadedAudios
}: VoiceSettingsProps) {
  const { t } = useI18n()
  const voiceConfig = settings.voice || {
    input: { mode: "browser", provider: "", providers: {} },
    output: { provider: "", providers: {} }
  }

  // 获取服务商的翻译名称
  const getProviderDisplayName = (providerId: string) => {
    if (providerId === "browser") return t("voice.browser")
    if (providerId === "aliyun") return t("voice.aliyun")
    if (providerId === "openai") return "OpenAI"
    return providerId
  }

  // 更新语音输入配置
  const updateInputConfig = (updates: Partial<VoiceConfig["input"]>) => {
    const newVoice = {
      ...voiceConfig,
      input: { ...voiceConfig.input, ...updates }
    }
    onUpdateSettings({ voice: newVoice })
  }

  // 更新语音输出配置
  const updateOutputConfig = (updates: Partial<VoiceConfig["output"]>) => {
    const newVoice = {
      ...voiceConfig,
      output: { ...voiceConfig.output, ...updates }
    }
    onUpdateSettings({ voice: newVoice })
  }

  // 更新语音输入服务商字段
  const handleUpdateInputProviderField = (provider: string, field: string, value: any, shouldSave = false) => {
    const newProviders = {
      ...(voiceConfig.input.providers || {}),
      [provider]: {
        ...(voiceConfig.input.providers?.[provider] || {}),
        [field]: value
      }
    }
    updateInputConfig({ providers: newProviders })
    if (shouldSave) {
      onSave()
    }
  }

  // 更新语音输出服务商字段
  const handleUpdateOutputProviderField = (provider: string, field: string, value: any, shouldSave = false) => {
    const newProviders = {
      ...(voiceConfig.output.providers || {}),
      [provider]: {
        ...(voiceConfig.output.providers?.[provider] || {}),
        [field]: value
      }
    }
    updateOutputConfig({ providers: newProviders })
    if (shouldSave) {
      onSave()
    }
  }

  const activeSTTProvider = STT_PROVIDERS.find(p => p.id === voiceConfig.input.provider)
  const activeTTSProvider = TTS_PROVIDERS.find(p => p.id === voiceConfig.output.provider)
  
  // 获取当前选中的 TTS 模型配置
  const selectedTTSModel = activeTTSProvider?.models.find(
    m => m.id === voiceConfig.output.providers?.[activeTTSProvider.id]?.model
  )

  const [playingVoiceId, setPlayingVoiceId] = React.useState<string | null>(null)
  const [voiceProgress, setVoiceProgress] = React.useState(0)
  const [voicePopoverOpen, setVoicePopoverOpen] = React.useState(false)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const eventHandlersRef = React.useRef<{
    ended?: (e: Event) => void
    pause?: (e: Event) => void
    canplay?: (e: Event) => void
  }>({})
  const rafIdRef = React.useRef<number | null>(null)

  // 清理音频播放状态的函数
  const cleanupAudio = React.useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      // 清理所有事件监听器
      if (eventHandlersRef.current.ended) {
        audioRef.current.removeEventListener('ended', eventHandlersRef.current.ended)
      }
      if (eventHandlersRef.current.pause) {
        audioRef.current.removeEventListener('pause', eventHandlersRef.current.pause)
      }
      if (eventHandlersRef.current.canplay) {
        audioRef.current.removeEventListener('canplay', eventHandlersRef.current.canplay)
      }
      eventHandlersRef.current = {}
      audioRef.current = null
    }
    setVoiceProgress(0)
    setPlayingVoiceId(null)
  }, [])

  // 更新进度的函数
  const updateProgress = React.useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.duration && isFinite(audio.duration)) {
      const progress = (audio.currentTime / audio.duration) * 100
      setVoiceProgress(progress)
    }
  }, [])

  // 播放音频的函数
  const handlePlayAudio = React.useCallback((e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!activeTTSProvider || !selectedTTSModel || !preloadedAudios) return

    // 如果点击的是正在播放的音色，则暂停
    if (playingVoiceId === voiceId && audioRef.current) {
      cleanupAudio()
      return
    }

    // 立即停止上一个可能正在播放的音频
    cleanupAudio()

    // 从预加载的音频Map中获取对应的音频对象
    const audioKey = `${activeTTSProvider.id}-${selectedTTSModel.id}-${voiceId}`
    const audio = preloadedAudios.get(audioKey)

    if (!audio) {
      console.error(`Audio not found for key: ${audioKey}`)
      return
    }

    // 重置音频到开头
    audio.currentTime = 0
    audioRef.current = audio

    // 先更新状态，确保进度条立即显示（即使音频还在加载）
    setPlayingVoiceId(voiceId)
    setVoiceProgress(0)

    // 创建 ended 事件处理器
    const handleEnded = () => {
      cleanupAudio()
    }
    eventHandlersRef.current.ended = handleEnded
    audio.addEventListener('ended', handleEnded)

    // 创建 pause 事件处理器 - 只在用户手动暂停时清理
    const handlePause = () => {
      // 检查音频是否真的暂停了（不是结束）
      if (audio.ended || audio.currentTime >= audio.duration) {
        return // 如果是自然结束，让 ended 事件处理
      }
      cleanupAudio()
    }
    eventHandlersRef.current.pause = handlePause
    audio.addEventListener('pause', handlePause)

    // 定义启动播放和进度更新的函数
    const startPlayback = () => {
      // 立即开始进度更新循环（不等待 play 事件）
      const loop = () => {
        updateProgress()
        rafIdRef.current = requestAnimationFrame(loop)
      }
      rafIdRef.current = requestAnimationFrame(loop)

      // 播放音频
      audio.play().catch(err => {
        console.error("Playback failed:", err)
        cleanupAudio()
      })
    }

    // 检查音频是否已准备好播放
    if (audio.readyState >= 2) {
      // 音频已准备好，立即开始播放和更新进度
      startPlayback()
    } else {
      // 音频还没准备好，等待 canplay 事件
      const handleCanPlay = () => {
        // 清理 canplay 监听器
        if (eventHandlersRef.current.canplay) {
          audio.removeEventListener('canplay', eventHandlersRef.current.canplay)
          delete eventHandlersRef.current.canplay
        }
        startPlayback()
      }
      eventHandlersRef.current.canplay = handleCanPlay
      audio.addEventListener('canplay', handleCanPlay)
    }

  }, [activeTTSProvider, selectedTTSModel, playingVoiceId, preloadedAudios, cleanupAudio, updateProgress])


  return (
    <div className="w-full overflow-y-auto">
      <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-6">
        <div className="h-14 border-b flex items-center gap-2 px-5 md:px-0 shrink-0 mb-6 md:mb-6">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 -ml-2 shrink-0"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-1.5 bg-muted dark:bg-muted rounded-lg shrink-0">
              <Mic className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("voice.title")}</h2>
          </div>
          <div className="flex items-center gap-4">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground text-xs animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("common.saving")}
              </div>
            )}
            {saveStatus === "error" && (
              <button
                onClick={() => onSave()}
                className="flex items-center gap-2 text-destructive text-xs hover:opacity-80 transition-opacity"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("search.saveFailed")}
              </button>
            )}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-500 text-xs">
                <Check className="h-3.5 w-3.5" />
                {t("common.saved")}
              </div>
            )}
          </div>
        </div>

        {/* 语音输入设置 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">{t("voice.input")}</Label>
          </div>

          <div className="p-4 rounded-xl border bg-card/50 space-y-4">
            {/* 服务商和模型分行展示（移动端） */}
            <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">{t("voice.provider")}</Label>
                <Select
                  value={voiceConfig.input.provider || "browser"}
                  onValueChange={(val: string) => {
                    // 同时更新 provider 和 mode
                    const mode = val === "browser" ? "browser" : "ai"
                    updateInputConfig({ provider: val, mode })
                    onSave()
                  }}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder={t("voice.selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {STT_PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs block w-full">
                        {p.id === "browser" ? t("voice.browser") : p.id === "aliyun" ? t("voice.aliyun") : p.id === "openai" ? "OpenAI" : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeSTTProvider && activeSTTProvider.models.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("voice.model")}</Label>
                  <Select
                    value={voiceConfig.input.providers?.[activeSTTProvider.id]?.model || ""}
                    onValueChange={(val) => {
                      handleUpdateInputProviderField(activeSTTProvider.id, "model", val, true)
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue placeholder={t("voice.selectModel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSTTProvider.models.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs block w-full">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {activeSTTProvider && activeSTTProvider.requiresApiKey && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{getProviderDisplayName(activeSTTProvider.id)} {t("voice.apiKey")}</Label>
                  <Input
                    type="password"
                    placeholder={t("search.placeholder") + " " + getProviderDisplayName(activeSTTProvider.id) + " " + t("voice.apiKey")}
                    className="h-8.5 text-xs"
                    value={voiceConfig.input.providers?.[activeSTTProvider.id]?.apiKey || ""}
                    onChange={(e) => handleUpdateInputProviderField(activeSTTProvider.id, "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 语音输出设置 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">{t("voice.voiceOutput")}</Label>
          </div>

          <div className="p-4 rounded-xl border bg-card/50 space-y-4">
            {/* 服务商、模型、音色分行展示（移动端） */}
            <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">{t("voice.voiceSynthesisProvider")}</Label>
                <Select
                  value={voiceConfig.output.provider || ""}
                  onValueChange={(val: string) => {
                    updateOutputConfig({ provider: val })
                    onSave()
                  }}
                >
                  <SelectTrigger className="h-8.5 text-xs">
                    <SelectValue placeholder={t("voice.selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs block w-full">
                        {p.id === "aliyun" ? t("voice.aliyun") : p.id === "openai" ? "OpenAI" : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {activeTTSProvider && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("voice.voiceSynthesisModel")}</Label>
                  <Select
                    value={voiceConfig.output.providers?.[activeTTSProvider.id]?.model || ""}
                    onValueChange={(val) => {
                      // 切换模型时同时清空音色选择（一次性更新避免状态覆盖）
                      const newProviders = {
                        ...(voiceConfig.output.providers || {}),
                        [activeTTSProvider.id]: {
                          ...(voiceConfig.output.providers?.[activeTTSProvider.id] || {}),
                          model: val,
                          voice: ""
                        }
                      }
                      updateOutputConfig({ providers: newProviders })
                      onSave()
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue placeholder={t("voice.selectModel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTTSProvider.models.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs block w-full">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTTSModel && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("voice.voice")}</Label>
                  <Popover open={voicePopoverOpen} onOpenChange={setVoicePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-8.5 text-xs w-full justify-between"
                      >
                        <span className="truncate">
                          {(() => {
                            const selectedVoiceId = voiceConfig.output.providers?.[activeTTSProvider!.id]?.voice || ""
                            const selectedVoice = selectedTTSModel.voices.find(v => v.id === selectedVoiceId)
                            return selectedVoice ? selectedVoice.name : t("voice.selectVoice")
                          })()}
                        </span>
                        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                      <div 
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {selectedTTSModel.voices.map((v) => {
                          const selectedVoiceId = voiceConfig.output.providers?.[activeTTSProvider!.id]?.voice || ""
                          const isSelected = selectedVoiceId === v.id
                          const isPlaying = playingVoiceId === v.id
                          
                          return (
                            <div
                              key={v.id}
                              className={cn(
                                "w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-sm)] transition-colors hover:bg-muted relative cursor-pointer",
                                isSelected ? "bg-muted font-medium text-[#2563eb] dark:text-[#60a5fa]" : "text-foreground"
                              )}
                              onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button[data-play-button]')) {
                                  e.stopPropagation()
                                  return
                                }
                                handleUpdateOutputProviderField(activeTTSProvider!.id, "voice", v.id, true)
                                setVoicePopoverOpen(false)
                              }}
                            >
                              <span className="flex-1 text-left truncate">{v.name}</span>
                              <VoicePlayButton
                                isPlaying={isPlaying}
                                progress={isPlaying ? voiceProgress : 0}
                                onClick={(e) => handlePlayAudio(e, v.id)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {activeTTSProvider && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{getProviderDisplayName(activeTTSProvider.id)} {t("voice.apiKey")}</Label>
                  <Input
                    type="password"
                    placeholder={t("search.placeholder") + " " + getProviderDisplayName(activeTTSProvider.id) + " " + t("voice.apiKey")}
                    className="h-8.5 text-xs"
                    value={voiceConfig.output.providers?.[activeTTSProvider.id]?.apiKey || ""}
                    onChange={(e) => handleUpdateOutputProviderField(activeTTSProvider.id, "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
