"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Cpu,
  Sparkles,
  Check,
  Loader2,
  Gauge,
  Type,
  ChevronLeft,
  RefreshCcw
} from "lucide-react"
import { SettingsState } from "./types"
import { SystemModelPicker } from "./system-model-picker"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/lib/i18n/context"


interface ChatSettingsProps {
  settings: SettingsState
  onUpdateSettings: (updates: Partial<SettingsState>) => void
  onUpdateMemory: (updates: Partial<SettingsState["memory"]>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function ChatSettings({
  settings,
  onUpdateSettings,
  onUpdateMemory: _onUpdateMemory,
  saveStatus,
  onSave,
  onBack
}: ChatSettingsProps) {
  const { t } = useI18n()
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
              <Cpu className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("sidebar.system")}</h2>
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
          {/* 会话自动命名 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chat.autoRename")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.autoRenameDesc")}</p>
              </div>
              <Switch
                checked={settings.autoRename}
                onCheckedChange={(checked) => {
                  onUpdateSettings({ autoRename: checked })
                  onSave()
                }}
              />
            </div>
            {settings.autoRename && (
              <div className="p-4 rounded-xl border bg-card/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs font-medium">{t("chat.renameModel")}</Label>
                  <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
                    <SystemModelPicker
                      value={settings.autoRenameModel}
                      onValueChange={(val) => {
                        onUpdateSettings({ autoRenameModel: val })
                        onSave()
                      }}
                      providers={settings.providers}
                      placeholder={t("chat.selectRenameModel")}
                      chatOnly={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 输入提示补全 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chat.inputCompletion")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.inputCompletionDesc")}</p>
              </div>
              <Switch
                checked={settings.inputCompletion?.enabled || false}
                onCheckedChange={(checked) => {
                  onUpdateSettings({ 
                    inputCompletion: { 
                      ...settings.inputCompletion,
                      enabled: checked 
                    } 
                  })
                  onSave()
                }}
              />
            </div>
            {settings.inputCompletion?.enabled && (
              <div className="p-4 rounded-xl border bg-card/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-xs font-medium">{t("chat.completionModel")}</Label>
                  <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
                    <SystemModelPicker
                      value={settings.inputCompletion?.model || ""}
                      onValueChange={(val) => {
                        onUpdateSettings({ 
                          inputCompletion: { 
                            ...settings.inputCompletion,
                            model: val 
                          } 
                        })
                        onSave()
                      }}
                      providers={settings.providers}
                      placeholder={t("chat.selectCompletionModel")}
                      chatOnly={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 上下文长度 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-semibold">{t("chat.contextLimit")}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.contextLimitDesc")}</p>
              </div>
              <Switch
                checked={settings.contextLimit.enabled}
                onCheckedChange={(checked) => {
                  onUpdateSettings({ 
                    contextLimit: { 
                      ...settings.contextLimit, 
                      enabled: checked 
                    } 
                  })
                  onSave()
                }}
              />
            </div>
            {settings.contextLimit.enabled && (
              <div className="p-4 rounded-xl border bg-card/50 space-y-4">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <Label className="text-xs font-medium">{t("chat.maxMessages")}</Label>
                    <div className="flex items-center gap-4 flex-1 max-w-md">
                      <Slider
                        value={[settings.contextLimit.maxMessages]}
                        min={4}
                        max={20}
                        step={1}
                        onValueChange={([val]) => onUpdateSettings({ 
                          contextLimit: { 
                            ...settings.contextLimit, 
                            maxMessages: val 
                          } 
                        })}
                        onValueCommit={() => onSave()}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={settings.contextLimit.maxMessages}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 4
                          onUpdateSettings({ 
                            contextLimit: { 
                              ...settings.contextLimit, 
                              maxMessages: Math.min(Math.max(val, 4), 20) 
                            } 
                          })
                        }}
                        onBlur={() => onSave()}
                        className="w-20 h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium">{t("chat.compress")}</p>
                      <p className="text-[10px] text-muted-foreground">{t("chat.compressDesc")}</p>
                    </div>
                    <Switch
                      checked={settings.contextLimit.compress}
                      onCheckedChange={(checked) => {
                        onUpdateSettings({ 
                          contextLimit: { 
                            ...settings.contextLimit, 
                            compress: checked 
                          } 
                        })
                        onSave()
                      }}
                    />
                  </div>

                  {settings.contextLimit.compress && (
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed border-border">
                      <Label className="text-xs font-medium">{t("chat.compressModel")}</Label>
                      <div className="flex items-center gap-4 flex-1 max-w-md justify-end">
                        <SystemModelPicker
                          value={settings.contextLimit.compressModel || ""}
                          onValueChange={(val) => {
                            onUpdateSettings({ 
                              contextLimit: { 
                                ...settings.contextLimit, 
                                compressModel: val 
                              } 
                            })
                            onSave()
                          }}
                          providers={settings.providers}
                          placeholder={t("chat.selectCompressModel")}
                          chatOnly={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
