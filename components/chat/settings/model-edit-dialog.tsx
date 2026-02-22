"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ModelConfig } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"
import { snapToNearestPreset } from "./utils"
import { CONTEXT_LENGTH_PRESETS } from "./constants"

interface ModelEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelConfig: ModelConfig
  onSave: (config: ModelConfig) => void
}

export function ModelEditDialog({
  open,
  onOpenChange,
  modelConfig: initialConfig,
  onSave
}: ModelEditDialogProps) {
  const { t } = useI18n()
  const [config, setConfig] = React.useState<ModelConfig>(initialConfig)

  React.useEffect(() => {
    if (open) {
      setConfig(initialConfig)
    }
  }, [open, initialConfig])

  const handleSave = () => {
    onSave(config)
  }

  // 11个点：0 + 10个预设
  const allPresets = [0, ...CONTEXT_LENGTH_PRESETS]

  // 将实际 token 数转换为 slider 的 0-100 进度
  const getSliderValue = (tokens: number) => {
    if (tokens <= 0) return [0]
    if (tokens >= allPresets[allPresets.length - 1]) return [100]

    // 找到所在的区间
    for (let i = 0; i < allPresets.length - 1; i++) {
      if (tokens >= allPresets[i] && tokens < allPresets[i + 1]) {
        const segmentWidth = 100 / (allPresets.length - 1)
        const progressInSegment = (tokens - allPresets[i]) / (allPresets[i + 1] - allPresets[i])
        return [i * segmentWidth + progressInSegment * segmentWidth]
      }
    }
    return [0]
  }

  // 将 slider 的 0-100 进度转换为实际 token 数
  const getValueFromSlider = (pos: number) => {
    if (pos <= 0) return 0
    if (pos >= 100) return allPresets[allPresets.length - 1]

    const segmentWidth = 100 / (allPresets.length - 1)
    const index = Math.floor(pos / segmentWidth)
    const remainder = (pos % segmentWidth) / segmentWidth

    if (index >= allPresets.length - 1) return allPresets[allPresets.length - 1]

    const val = allPresets[index] + remainder * (allPresets[index + 1] - allPresets[index])
    
    // 增大吸附范围：如果偏离预设点在区间宽度的 15% 以内，则进行吸附
    const snappedValue = snapToNearestPreset(val, true)
    if (Math.abs(val - snappedValue) / (allPresets[index + 1] - allPresets[index]) < 0.15) {
      return snappedValue
    }

    return Math.round(val)
  }

  // 模态选项
  const modalityOptions = [
    { value: 'text', label: t("modelEdit.modalityText" as any) },
    { value: 'image', label: t("modelEdit.modalityImage" as any) },
    { value: 'video', label: t("modelEdit.modalityVideo" as any) },
    { value: 'audio', label: t("modelEdit.modalityAudio" as any) }
  ]

  // 模型用途选项
  const modelTypeOptions = [
    { value: 'chat', label: t("modelEdit.modelTypeChat" as any) },
    { value: 'image', label: t("modelEdit.modelTypeImage" as any) },
  ]

  const isEditing = !!initialConfig.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? t("modelEdit.titleEdit" as any) : t("modelEdit.titleAdd" as any)}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* 模型调用ID 和 模型名称 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-id" className="text-xs font-semibold text-foreground dark:text-foreground/70">
                {t("modelEdit.modelId" as any)} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="model-id"
                value={config.id || ""}
                onChange={(e) => setConfig({ ...config, id: e.target.value })}
                placeholder={t("modelEdit.modelIdPlaceholder" as any)}
                disabled={isEditing}
                className="bg-background/50 h-7 min-h-[28px] text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-name" className="text-xs font-semibold text-foreground dark:text-foreground/70">
                {t("modelEdit.modelName" as any)}
              </Label>
              <Input
                id="model-name"
                value={config.name || ""}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder={t("modelEdit.modelNamePlaceholder" as any)}
                className="bg-background/50 h-7 min-h-[28px] text-xs"
              />
            </div>
          </div>

          {/* 最大上下文长度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground dark:text-foreground/70">
                {t("modelEdit.contextLength" as any)}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  value={config.contextLength || 0}
                  onChange={(e) => {
                    const val = Math.round(parseInt(e.target.value) || 0)
                    setConfig({ ...config, contextLength: val })
                  }}
                  onBlur={(e) => {
                    const val = Math.round(parseInt(e.target.value) || 0)
                    setConfig({ ...config, contextLength: val })
                  }}
                  className="w-24 h-7 text-xs text-right bg-background/50"
                />
                <span className="text-xs text-muted-foreground">tokens</span>
              </div>
            </div>
            <Slider
              value={getSliderValue(config.contextLength || 0)}
              onValueChange={(value) => {
                const tokens = Math.round(getValueFromSlider(value[0]))
                setConfig({ ...config, contextLength: tokens })
              }}
              onValueCommit={(value) => {
                const tokens = Math.round(getValueFromSlider(value[0]))
                const snapped = snapToNearestPreset(tokens, false)
                setConfig({ ...config, contextLength: snapped })
              }}
              max={100}
              step={0.1}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {allPresets.map((preset, i) => (
                <span key={i} className={cn("text-center", i === 0 && "text-left", i === allPresets.length - 1 && "text-right")}>
                  {preset >= 1000000 ? `${(preset / 1000000).toFixed(0)}M` :
                   preset >= 1000 ? `${(preset / 1000).toFixed(0)}K` :
                   preset}
                </span>
              ))}
            </div>
          </div>

          {/* 最大输出长度 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground dark:text-foreground/70">
                {t("modelEdit.maxOutput" as any)}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="1"
                  value={(config as any).maxOutput || 0}
                  onChange={(e) => {
                    const val = Math.round(parseInt(e.target.value) || 0)
                    setConfig({ ...config, maxOutput: val } as any)
                  }}
                  onBlur={(e) => {
                    const val = Math.round(parseInt(e.target.value) || 0)
                    setConfig({ ...config, maxOutput: val } as any)
                  }}
                  className="w-24 h-7 text-xs text-right bg-background/50"
                />
                <span className="text-xs text-muted-foreground">tokens</span>
              </div>
            </div>
            <Slider
              value={getSliderValue((config as any).maxOutput || 0)}
              onValueChange={(value) => {
                const tokens = Math.round(getValueFromSlider(value[0]))
                setConfig({ ...config, maxOutput: tokens } as any)
              }}
              onValueCommit={(value) => {
                const tokens = Math.round(getValueFromSlider(value[0]))
                const snapped = snapToNearestPreset(tokens, false)
                setConfig({ ...config, maxOutput: snapped } as any)
              }}
              max={100}
              step={0.1}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {allPresets.map((preset, i) => (
                <span key={i} className={cn("text-center", i === 0 && "text-left", i === allPresets.length - 1 && "text-right")}>
                  {preset >= 1000000 ? `${(preset / 1000000).toFixed(0)}M` :
                   preset >= 1000 ? `${(preset / 1000).toFixed(0)}K` :
                   preset}
                </span>
              ))}
            </div>
          </div>

          {/* 输入输出模态（一行） */}
          <div className="grid grid-cols-2 gap-4">
            {/* 输入模态 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground dark:text-foreground/70">{t("modelEdit.inputModality" as any)}</Label>
              <div className="flex flex-wrap items-center gap-3">
                {modalityOptions.map((option) => (
                  <div key={`input-${option.value}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`input-${option.value}`}
                      checked={(config as any).modalities?.input?.includes(option.value) || false}
                      onCheckedChange={(checked) => {
                        const currentInput = (config as any).modalities?.input || []
                        const newInput = checked
                          ? [...currentInput, option.value]
                          : currentInput.filter((m: string) => m !== option.value)
                        setConfig({
                          ...config,
                          modalities: {
                            ...(config as any).modalities,
                            input: newInput,
                            output: (config as any).modalities?.output || []
                          }
                        } as any)
                      }}
                    />
                    <Label htmlFor={`input-${option.value}`} className="text-xs cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* 输出模态 */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground dark:text-foreground/70">{t("modelEdit.outputModality" as any)}</Label>
              <div className="flex flex-wrap items-center gap-3">
                {modalityOptions.map((option) => (
                  <div key={`output-${option.value}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`output-${option.value}`}
                      checked={(config as any).modalities?.output?.includes(option.value) || false}
                      onCheckedChange={(checked) => {
                        const currentOutput = (config as any).modalities?.output || []
                        const newOutput = checked
                          ? [...currentOutput, option.value]
                          : currentOutput.filter((m: string) => m !== option.value)
                        setConfig({
                          ...config,
                          modalities: {
                            ...(config as any).modalities,
                            input: (config as any).modalities?.input || [],
                            output: newOutput
                          }
                        } as any)
                      }}
                    />
                    <Label htmlFor={`output-${option.value}`} className="text-xs cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 模型用途 */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground dark:text-foreground/70">
              {t("modelEdit.modelType" as any)}
            </Label>
            <Select
              value={(config as any).modelType || 'chat'}
              onValueChange={(value) => setConfig({ ...config, modelType: value } as any)}
            >
              <SelectTrigger className="w-[200px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {modelTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs h-7 rounded-md">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={!config.id?.trim()}
            className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
