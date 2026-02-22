"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Palette,
  Cpu,
  Globe,
  MessageSquare,
  Loader2,
  Mic,
  ChevronLeft,
  Database,
  BrainCircuit,
  Brain
} from "lucide-react"
import { SettingsState, ProviderConfig, VectorProviderConfig } from "./settings/types"
import { createInitialProviders } from "./settings/constants"
import { GeneralSettings } from "./settings/general-settings"
import { ChatSettings } from "./settings/chat-settings"
import { DefaultModelSettings } from "./settings/default-model-settings"
import { AIProviderSettings } from "./settings/ai-provider-settings"
import { SearchSettings } from "./settings/search-settings"
import { VoiceSettings } from "./settings/voice-settings"
import { TTS_PROVIDERS } from "./settings/voice-settings"
import { VectorProviderSettings } from "./settings/vector-provider-settings"
import { MemorySettings } from "./settings/memory-settings"
import { AlertToast } from "@/components/ui/alert-toast"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: {
    id?: string | null
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function SettingsDialog({ open, onOpenChange, user: _user }: SettingsDialogProps) {
  const { t, setLanguage } = useI18n()
  const [activeMenu, setActiveMenu] = React.useState<"appearance" | "system" | "chat" | "ai" | "search" | "voice" | "vector" | "memory">("appearance")
  const [showContent, setShowContent] = React.useState(false) // 移动端控制是否显示内容区域
  const [isLoading, setIsLoading] = React.useState(true)
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "success" | "error">("idle")
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [alertMessage, setAlertMessage] = React.useState("")
  const [redirectToLogin, setRedirectToLogin] = React.useState(false)
  
  // 音频预加载状态
  const [audioPreloading, setAudioPreloading] = React.useState<'idle' | 'loading' | 'ready'>('idle')
  const [preloadedAudios, setPreloadedAudios] = React.useState<Map<string, HTMLAudioElement>>(new Map())
  
  const [settings, setSettings] = React.useState<SettingsState>({
    providers: createInitialProviders(),
    search: {
      activeProvider: "tavily",
      enabled: false,
      providers: {
        google: { apiKey: "", cx: "", defaultNum: 10, defaultLanguage: "", defaultCountry: "", safeSearch: "off" },
        bing: { subscriptionKey: "", endpoint: "https://api.bing.microsoft.com/v7.0/search", market: "en-US", safeSearch: "Moderate" },
        tavily: { apiKey: "", endpoint: "https://api.tavily.com/search", searchDepth: "basic", includeAnswer: false, maxResults: 5 },
        anspire: { apiKey: "", endpoint: "https://plugin.anspire.cn/api/ntsearch/search", topK: 10 },
        bocha: { apiKey: "", endpoint: "https://api.bochaai.com/v1/web-search", freshness: "oneYear", count: 8, summary: true },
        brave: { apiKey: "", endpoint: "https://api.search.brave.com/res/v1/web/search", country: "us", searchType: "web" },
        exa: { apiKey: "", endpoint: "https://api.exa.ai", type: "neural", category: "general", numResults: 10 },
        firecrawl: { apiKey: "", endpoint: "https://api.firecrawl.dev/v1/scrape", mode: "scrape" },
        jina: { mode: "free-endpoint", apiKey: "", searchBaseUrl: "https://s.jina.ai/", readBaseUrl: "https://r.jina.ai/", endpoint: "" },
        kagi: { apiToken: "", engine: "cecil", summaryType: "summary", language: "ZH", cache: true },
        search1api: { apiKey: "", searchService: "google", maxResults: 5, crawlResults: 0, language: "en", timeRange: "year" },
        searxng: { instanceUrl: "", categories: "general", engines: "", language: "zh-CN", timeRange: "", outputFormat: "json" },
        perplexity: { apiKey: "", maxResults: 10, country: "US" },
        serpapi: { apiKey: "", engine: "google", location: "Austin, Texas, United States", output: "json", noCache: false },
      }
    },
    theme: "system",
    language: "zh",
    zoom: 1,
    fontSize: 14,
    autoRename: false,
    autoRenameModel: "",
    compactMode: false,
    showQuote: true,
    contextLimit: {
      enabled: false,
      maxMessages: 10,
      compress: false,
      compressModel: ""
    },
    memory: {
      enabled: false,
      notifyOnUpdate: true,
      maxContextTokens: 2000,
      extractionModel: "",
      embeddingModel: "",
      strategy: "recency"
    },
    inputCompletion: {
      enabled: false,
      model: ""
    },
    sendShortcut: "enter",
    voice: {
      input: { mode: "browser", provider: "", providers: {} },
      output: { provider: "", providers: {} }
    },
    vectorProviders: {
      openai: { apiKey: "", enabled: false, models: [], checkModel: "text-embedding-3-small" },
      aliyun: { apiKey: "", enabled: false, models: [], checkModel: "text-embedding-v3" },
      volcengine: { apiKey: "", enabled: false, models: [], checkModel: "doubao-embedding-vision-250615" },
      ollama: { apiKey: "ollama", enabled: false, models: [], checkModel: "" },
    }
  })

  // Fetch settings on open
  React.useEffect(() => {
    if (open) {
      fetchSettings()
    }
  }, [open])

  // 同步语言设置到 I18nProvider（在渲染完成后）
  React.useEffect(() => {
    if (settings.language) {
      setLanguage(settings.language)
    }
  }, [settings.language, setLanguage])

  // 当对话框关闭时，重置状态
  React.useEffect(() => {
    if (!open) {
      setShowContent(false)
      setActiveMenu("appearance")
      setAudioPreloading('idle')
      // 清理所有音频对象
      setPreloadedAudios(prev => {
        prev.forEach(audio => {
          audio.pause()
          audio.src = ''
        })
        return new Map()
      })
    }
  }, [open])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/settings")
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setSettings(prev => {
            const mergedProviders = { ...prev.providers };
            if (data.providers) {
              Object.entries(data.providers).forEach(([id, config]) => {
                mergedProviders[id] = {
                  ...(mergedProviders[id] || {}),
                  ...(config as any),
                };
              });
            }

            const mergedSearch = {
              ...prev.search,
              ...(data.search || {}),
              providers: {
                ...prev.search.providers,
                ...(data.search?.providers || {})
              }
            };

            const mergedVectorProviders = { ...prev.vectorProviders };
            if (data.vectorProviders) {
              Object.entries(data.vectorProviders).forEach(([id, config]) => {
                mergedVectorProviders[id] = {
                  ...(mergedVectorProviders[id] || {}),
                  ...(config as any),
                };
              });
            }
            
            const newSettings = {
              ...prev,
              ...data,
              providers: mergedProviders,
              search: mergedSearch,
              vectorProviders: mergedVectorProviders,
              theme: data.theme || prev.theme,
              zoom: data.zoom || prev.zoom,
              fontSize: data.fontSize || prev.fontSize,
              autoRename: data.autoRename ?? prev.autoRename,
              autoRenameModel: data.autoRenameModel || prev.autoRenameModel,
                contextLimit: {
                ...prev.contextLimit,
                ...(data.contextLimit || {})
              },
              memory: {
                ...prev.memory,
                ...(data.memory || {})
              },
              inputCompletion: {
                ...prev.inputCompletion,
                ...(data.inputCompletion || {})
              },
              voice: {
                input: {
                  ...prev.voice.input,
                  ...(data.voice?.input || {}),
                  providers: {
                    ...(prev.voice.input.providers || {}),
                    ...(data.voice?.input?.providers || {})
                  }
                },
                output: {
                  ...prev.voice.output,
                  ...(data.voice?.output || {}),
                  providers: {
                    ...(prev.voice.output.providers || {}),
                    ...(data.voice?.output?.providers || {})
                  }
                }
              },
              language: data.language || prev.language || "zh"
            };
            return newSettings;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (stateToSave = settings) => {
    setSaveStatus("saving")
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateToSave),
      })
      if (!res.ok) {
        setSaveStatus("error")
        // Try to get error details from response
        try {
          const errorData = await res.json()
          console.error("Save failed with status:", res.status, "Error:", errorData)
          
          // Handle specific error codes
          if (errorData.code === 'USER_NOT_FOUND' || res.status === 404) {
            setAlertMessage("用户记录不存在，请重新登录")
            setRedirectToLogin(true)
            setAlertOpen(true)
            return
          }
          
          // Show user-friendly error message
          if (errorData.error) {
            const errorMsg = typeof errorData.error === 'string' 
              ? errorData.error 
              : JSON.stringify(errorData.error)
            setAlertMessage(`保存设置失败: ${errorMsg}`)
            setAlertOpen(true)
          } else {
            setAlertMessage(`保存设置失败: HTTP ${res.status}`)
            setAlertOpen(true)
          }
        } catch {
          // If we can't parse the error response, show generic error
          const text = await res.text()
          console.error("Save failed with status:", res.status, "Response:", text)
          setAlertMessage(`保存设置失败: HTTP ${res.status} - ${text.substring(0, 200)}`)
          setAlertOpen(true)
        }
      } else {
        setSaveStatus("success")
        window.dispatchEvent(new CustomEvent("settings-updated"))
        setTimeout(() => setSaveStatus("idle"), 2000)
      }
    } catch (err: any) {
      console.error("Failed to save settings:", err)
      setSaveStatus("error")
      setAlertMessage(`保存设置失败: ${err.message || "网络错误，请检查连接"}`)
      setAlertOpen(true)
    }
  }

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => {
      const newState = { ...prev, ...updates }
      handleSave(newState)
      return newState
    })
  }

  const updateProviderConfig = (id: string, updates: Partial<ProviderConfig>, shouldSave = true) => {
    setSettings(prev => {
      const newState = {
        ...prev,
        providers: {
          ...prev.providers,
          [id]: { ...prev.providers[id], ...updates },
        },
      } as SettingsState
      if (shouldSave) {
        handleSave(newState)
      }
      return newState
    })
  }

  const updateVectorProviderConfig = (id: string, updates: Partial<VectorProviderConfig>, shouldSave = true) => {
    setSettings(prev => {
      const newState = {
        ...prev,
        vectorProviders: {
          ...(prev.vectorProviders || {}),
          [id]: { ...(prev.vectorProviders?.[id] || { apiKey: "", baseURL: "", enabled: false, models: [] }), ...updates },
        },
      }
      if (shouldSave) {
        handleSave(newState)
      }
      return newState
    })
  }

  // 预加载所有音频文件
  const preloadAllAudios = React.useCallback(async () => {
    if (audioPreloading === 'loading' || audioPreloading === 'ready') {
      return
    }

    setAudioPreloading('loading')
    const audioMap = new Map<string, HTMLAudioElement>()
    const loadPromises: Promise<void>[] = []
    // 用于 OpenAI 音色去重，相同音色的不同模型共享同一个 Audio 对象
    const openaiAudioCache = new Map<string, HTMLAudioElement>()

    // 遍历所有TTS服务商、模型和音色
    TTS_PROVIDERS.forEach(provider => {
      provider.models.forEach(model => {
        model.voices?.forEach(voice => {
          const audioPath = provider.id === "openai"
            ? `/voices/OpenAI/${voice.id.toLowerCase()}.flac`
            : `/voices/Qwen/${voice.id}.wav`

          let audio: HTMLAudioElement

          if (provider.id === "openai") {
            // OpenAI 的相同音色在不同模型间共享同一个 Audio 对象
            // 使用音色 ID 作为缓存键
            const cacheKey = `openai-${voice.id.toLowerCase()}`
            if (openaiAudioCache.has(cacheKey)) {
              audio = openaiAudioCache.get(cacheKey)!
            } else {
              audio = new Audio(audioPath)
              audio.preload = "auto"
              openaiAudioCache.set(cacheKey, audio)
            }
          } else {
            audio = new Audio(audioPath)
            audio.preload = "auto"
          }

          // 创建唯一的键（provider + model + voice）
          const audioKey = `${provider.id}-${model.id}-${voice.id}`
          audioMap.set(audioKey, audio)

          // 等待音频加载完成（只对新的 Audio 对象添加监听器）
          const loadPromise = new Promise<void>((resolve) => {
            // 如果音频已经加载完成，直接 resolve
            if (audio.readyState >= 3) {
              resolve()
              return
            }

            const handleCanPlayThrough = () => {
              audio.removeEventListener('canplaythrough', handleCanPlayThrough)
              audio.removeEventListener('error', handleError)
              resolve()
            }

            const handleError = () => {
              audio.removeEventListener('canplaythrough', handleCanPlayThrough)
              audio.removeEventListener('error', handleError)
              // 即使加载失败也继续，不阻塞其他音频
              console.warn(`Failed to load audio: ${audioPath}`)
              resolve()
            }

            audio.addEventListener('canplaythrough', handleCanPlayThrough)
            audio.addEventListener('error', handleError)

            // 触发加载
            audio.load()
          })

          loadPromises.push(loadPromise)
        })
      })
    })

    try {
      await Promise.all(loadPromises)
      setPreloadedAudios(audioMap)
      setAudioPreloading('ready')
    } catch (error) {
      console.error("Audio preloading error:", error)
      // 即使有错误也设置状态，避免阻塞UI
      setPreloadedAudios(audioMap)
      setAudioPreloading('ready')
    }
  }, [audioPreloading])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !translate-x-0 !translate-y-0 !max-w-none !w-full !h-full !p-0 !gap-0 !rounded-none !border-none overflow-hidden !duration-0 [&>button]:hidden" overlayClassName="bg-background/80 backdrop-blur-sm">
        <DialogHeader className="hidden">
          <DialogTitle>{t("sidebar.settings")}</DialogTitle>
          <DialogDescription>{t("sidebar.manageAccount")}</DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex h-full w-full overflow-hidden">
            {/* 第一级：菜单列表 - 移动端全屏，桌面端左侧栏 */}
            <div className={cn(
              "absolute inset-0 md:relative md:inset-auto w-full md:w-56 border-r bg-muted/50 dark:bg-muted/30 flex flex-col transition-transform duration-300 shrink-0",
              showContent ? "-translate-x-full md:translate-x-0 md:!translate-x-0" : "translate-x-0"
            )}>
              <div className="h-14 border-b flex items-center gap-2 px-5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground -ml-2 mr-1"
                  onClick={() => onOpenChange(false)}
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                </Button>
                <h2 className="text-lg font-bold">{t("sidebar.settings")}</h2>
              </div>
              <div className="flex-1 p-2 space-y-1 overflow-y-auto">
                <Button
                  variant={activeMenu === "appearance" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("appearance")
                    setShowContent(true)
                  }}
                >
                  <Palette className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.appearance")}
                </Button>
                <Button
                  variant={activeMenu === "system" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("system")
                    setShowContent(true)
                  }}
                >
                  <Cpu className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.system")}
                </Button>
                <Button
                  variant={activeMenu === "chat" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("chat")
                    setShowContent(true)
                  }}
                >
                  <MessageSquare className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.chat")}
                </Button>
                <Button
                  variant={activeMenu === "memory" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("memory")
                    setShowContent(true)
                  }}
                >
                  <Brain className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.memory")}
                </Button>
                <Button
                  variant={activeMenu === "ai" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("ai")
                    setShowContent(true)
                  }}
                >
                  <BrainCircuit className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.ai")}
                </Button>
                <Button
                  variant={activeMenu === "search" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("search")
                    setShowContent(true)
                  }}
                >
                  <Globe className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.search")}
                </Button>
                <Button
                  variant={activeMenu === "voice" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("voice")
                    setShowContent(true)
                    // 如果音频未加载，触发预加载
                    if (audioPreloading === 'idle') {
                      preloadAllAudios()
                    }
                  }}
                >
                  <Mic className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.voice")}
                </Button>
                <Button
                  variant={activeMenu === "vector" ? "secondary" : "ghost"}
                  className="w-full justify-start h-7 text-xs"
                  onClick={() => {
                    setActiveMenu("vector")
                    setShowContent(true)
                  }}
                >
                  <Database className="mr-2 h-3.5 w-3.5" />
                  {t("sidebar.vectorization")}
                </Button>
              </div>
            </div>

            {/* 第二级：内容区域 - 移动端全屏，桌面端右侧 */}
            <div className={cn(
              "absolute inset-0 md:relative md:inset-auto flex-1 flex relative h-full overflow-hidden transition-transform duration-300 min-w-0",
              showContent ? "translate-x-0" : "translate-x-full md:!translate-x-0"
            )}>
              {activeMenu === "appearance" && (
                <GeneralSettings
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "system" && (
                <ChatSettings
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  onUpdateMemory={(memoryUpdates) => updateSettings({ memory: { ...settings.memory, ...memoryUpdates } })}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "chat" && (
                <DefaultModelSettings
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "ai" && (
                <AIProviderSettings
                  settings={settings}
                  onUpdateProviderConfig={updateProviderConfig}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "search" && (
                <SearchSettings 
                  settings={settings} 
                  onUpdateSearchConfig={(updates) => updateSettings({ search: { ...settings.search, ...updates } })}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "voice" && (
                audioPreloading === 'ready' ? (
                  <VoiceSettings 
                    settings={settings} 
                    onUpdateSettings={updateSettings}
                    saveStatus={saveStatus}
                    onSave={handleSave}
                    onBack={() => setShowContent(false)}
                    preloadedAudios={preloadedAudios}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )
              )}
              {activeMenu === "vector" && (
                <VectorProviderSettings
                  settings={settings}
                  onUpdateProviderConfig={updateVectorProviderConfig}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
              {activeMenu === "memory" && (
                <MemorySettings
                  settings={settings}
                  onUpdateMemory={(memoryUpdates) => updateSettings({ memory: { ...settings.memory, ...memoryUpdates } })}
                  saveStatus={saveStatus}
                  onSave={handleSave}
                  onBack={() => setShowContent(false)}
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <AlertToast
        open={alertOpen}
        onOpenChange={(open) => {
          setAlertOpen(open)
          if (!open && redirectToLogin) {
            setRedirectToLogin(false)
            window.location.href = '/login'
          }
        }}
        title="保存设置失败"
        message={alertMessage}
      />
    </Dialog>
  )
}
