"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Palette,
  Moon,
  Sun,
  Monitor,
  Type,
  Check,
  Loader2,
  Languages,
  ChevronLeft,
  RefreshCcw
} from "lucide-react"
import { SettingsState } from "./types"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"

interface GeneralSettingsProps {
  settings: SettingsState
  onUpdateSettings: (updates: Partial<SettingsState>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function GeneralSettings({
  settings,
  onUpdateSettings,
  saveStatus,
  onSave,
  onBack
}: GeneralSettingsProps) {
  const { t, setLanguage } = useI18n()
  
  const applyTheme = (theme: "light" | "dark" | "system") => {
    onUpdateSettings({ theme })
    
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
    
    onSave()
  }

  const applyLanguage = (language: "zh" | "en") => {
    onUpdateSettings({ language })
    setLanguage(language)
    onSave()
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
              <Palette className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("settings.appearance")}</h2>
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
          {/* 主题选择 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">{t("settings.appearance")}</Label>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {[
                { id: "light", nameKey: "lightMode" as const, icon: Sun },
                { id: "dark", nameKey: "darkMode" as const, icon: Moon },
                { id: "system", nameKey: "systemMode" as const, icon: Monitor },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => applyTheme(theme.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 hover:border-border",
                    settings.theme === theme.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border bg-card"
                  )}
                >
                  <theme.icon className={cn("h-5 w-5 md:h-6 md:w-6", settings.theme === theme.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-medium">{t(`settings.${theme.nameKey}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 语言设置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">{t("settings.language")}</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4">
              {[
                { id: "zh", nameKey: "chinese" as const },
                { id: "en", nameKey: "english" as const },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => applyLanguage(lang.id as "zh" | "en")}
                  className={cn(
                    "flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl border-2 transition-all duration-200 hover:border-border",
                    (settings.language || "zh") === lang.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border bg-card"
                  )}
                >
                  <span className="text-xs font-medium">{t(`settings.${lang.nameKey}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 显示设置 */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">{t("settings.display")}</Label>
            </div>
            <div className="space-y-6">
              <div className="space-y-4 p-4 rounded-xl border bg-card/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-3.5 w-3.5" /> {t("settings.fontSize")}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-medium text-primary">
                    {settings.fontSize || 14}px
                  </span>
                </div>
                <Slider
                  value={[ settings.fontSize || 14 ]}
                  min={12}
                  max={24}
                  step={1}
                  onValueChange={([value]) => {
                    onUpdateSettings({ fontSize: value })
                  }}
                  onValueCommit={() => onSave()}
                  className="py-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
