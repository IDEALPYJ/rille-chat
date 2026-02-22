"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  MessageSquare,
  Bot,
  Image,
  Database,
  Keyboard,
  Check,
  Loader2,
  ChevronLeft,
  RefreshCcw,
  X
} from "lucide-react"
import { SettingsState } from "./types"
import { ModelPicker } from "./model-picker"
import { useI18n } from "@/lib/i18n/context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DefaultModelSettingsProps {
  settings: SettingsState
  onUpdateSettings: (updates: Partial<SettingsState>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function DefaultModelSettings({
  settings,
  onUpdateSettings,
  saveStatus,
  onSave,
  onBack
}: DefaultModelSettingsProps) {
  const { t } = useI18n()

  // 检查模型是否仍然启用的辅助函数
  const isModelEnabled = (modelValue: string): boolean => {
    if (!modelValue) return false
    const parts = modelValue.split(":")
    if (parts.length !== 2) return false
    const [providerId, modelId] = parts
    const provider = settings.providers[providerId]
    if (!provider || !provider.enabled) return false
    return provider.models.some(m => m.id === modelId)
  }

  // 组件加载时检查默认模型是否仍启用
  React.useEffect(() => {
    const updates: Partial<SettingsState> = {}
    let needsUpdate = false

    if (settings.defaultChatModel && !isModelEnabled(settings.defaultChatModel)) {
      updates.defaultChatModel = ""
      needsUpdate = true
    }
    if (settings.defaultImageModel && !isModelEnabled(settings.defaultImageModel)) {
      updates.defaultImageModel = ""
      needsUpdate = true
    }
    if (settings.defaultVectorModel && !isModelEnabled(settings.defaultVectorModel)) {
      updates.defaultVectorModel = ""
      needsUpdate = true
    }

    if (needsUpdate) {
      onUpdateSettings(updates)
    }
  }, [settings.providers])

  // 过滤图像模型（支持图像生成的模型）
  const getImageModels = () => {
    const filtered: typeof settings.providers = {}
    Object.entries(settings.providers).forEach(([id, config]) => {
      if (config.enabled) {
        const imageModels = config.models.filter(m => {
          if (typeof m === 'string') return false
          return m.purpose === 'image_generation'
        })
        if (imageModels.length > 0) {
          filtered[id] = { ...config, models: imageModels }
        }
      }
    })
    return filtered
  }

  // 过滤向量化模型
  const getVectorModels = () => {
    const filtered: typeof settings.providers = {}
    Object.entries(settings.providers).forEach(([id, config]) => {
      if (config.enabled) {
        const vectorModels = config.models.filter(m => {
          if (typeof m === 'string') return false
          return m.vectorDimensions !== undefined
        })
        if (vectorModels.length > 0) {
          filtered[id] = { ...config, models: vectorModels }
        }
      }
    })
    return filtered
  }

  return (
    <div className="w-full overflow-y-auto">
      <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-8">
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
              <MessageSquare className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("chatSettings.title")}</h2>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground text-xs animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("common.saving")}
              </div>
            )}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-500 text-xs animate-in fade-in duration-300">
                <Check className="h-3.5 w-3.5" />
                {t("common.saved")}
              </div>
            )}
            {saveStatus === "error" && (
              <button
                onClick={() => onSave()}
                className="flex items-center gap-2 text-destructive text-xs hover:opacity-80 transition-opacity"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("common.retry") || "重试"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* 发送快捷键设置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chatSettings.sendShortcut")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chatSettings.sendShortcutDesc")}</p>
              </div>
              <Select
                value={settings.sendShortcut || "enter"}
                onValueChange={(val: "enter" | "ctrl-enter") => {
                  onUpdateSettings({ sendShortcut: val })
                  onSave()
                }}
              >
                <SelectTrigger className="w-[280px] h-8 text-xs">
                  <SelectValue placeholder={t("chatSettings.selectShortcut")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enter" className="text-xs">Enter</SelectItem>
                  <SelectItem value="ctrl-enter" className="text-xs">Ctrl + Enter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 默认对话模型 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chatSettings.defaultChatModel")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chatSettings.defaultChatModelDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                {settings.defaultChatModel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      onUpdateSettings({ defaultChatModel: "" })
                      onSave()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="w-[280px]">
                  <ModelPicker
                    value={settings.defaultChatModel || ""}
                    onValueChange={(val) => {
                      onUpdateSettings({ defaultChatModel: val })
                      onSave()
                    }}
                    providers={settings.providers}
                    placeholder={t("chatSettings.selectDefaultChatModel")}
                    chatOnly={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 默认图像模型 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chatSettings.defaultImageModel")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chatSettings.defaultImageModelDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                {settings.defaultImageModel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      onUpdateSettings({ defaultImageModel: "" })
                      onSave()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="w-[280px]">
                  <ModelPicker
                    value={settings.defaultImageModel || ""}
                    onValueChange={(val) => {
                      onUpdateSettings({ defaultImageModel: val })
                      onSave()
                    }}
                    providers={getImageModels()}
                    placeholder={t("chatSettings.selectDefaultImageModel")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 默认向量化模型 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chatSettings.defaultVectorModel")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chatSettings.defaultVectorModelDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                {settings.defaultVectorModel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      onUpdateSettings({ defaultVectorModel: "" })
                      onSave()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="w-[280px]">
                  <ModelPicker
                    value={settings.defaultVectorModel || ""}
                    onValueChange={(val) => {
                      onUpdateSettings({ defaultVectorModel: val })
                      onSave()
                    }}
                    providers={getVectorModels()}
                    placeholder={t("chatSettings.selectDefaultVectorModel")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
