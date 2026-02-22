"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/context"

interface ZaiResolutionPickerProps {
  modelId: string
  value: string
  onChange: (value: string) => void
  resolutionRange: { min: number; max: number }
  resolutionStep: number
  className?: string
}

// 预设分辨率选项
const PRESET_RESOLUTIONS = [
  { width: 1024, height: 1024, label: "1:1" },
  { width: 1280, height: 1280, label: "1:1" },
  { width: 1568, height: 1056, label: "3:2" },
  { width: 1056, height: 1568, label: "2:3" },
  { width: 1472, height: 1088, label: "4:3" },
  { width: 1088, height: 1472, label: "3:4" },
  { width: 1728, height: 960, label: "16:9" },
  { width: 960, height: 1728, label: "9:16" },
]

export function ZaiResolutionPicker({
  modelId: _modelId,
  value,
  onChange,
  resolutionRange,
  resolutionStep,
  className,
}: ZaiResolutionPickerProps) {
  const { t } = useI18n()

  // 解析当前值
  const [currentWidth, currentHeight] = useMemo(() => {
    const match = value.match(/(\d+)[x×*](\d+)/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2])]
    }
    return [resolutionRange.min, resolutionRange.min]
  }, [value, resolutionRange.min])

  // 过滤符合当前模型要求的分辨率
  const availablePresets = useMemo(() => {
    return PRESET_RESOLUTIONS.filter(preset => {
      const { min, max } = resolutionRange
      return preset.width >= min && preset.width <= max &&
             preset.height >= min && preset.height <= max &&
             preset.width % resolutionStep === 0 &&
             preset.height % resolutionStep === 0
    })
  }, [resolutionRange, resolutionStep])

  // 计算当前值在范围内的位置（用于滑块）
  const widthSliderValue = useMemo(() => {
    const { min, max } = resolutionRange
    const steps = (max - min) / resolutionStep
    const currentStep = (currentWidth - min) / resolutionStep
    return Math.round((currentStep / steps) * 100)
  }, [currentWidth, resolutionRange, resolutionStep])

  const heightSliderValue = useMemo(() => {
    const { min, max } = resolutionRange
    const steps = (max - min) / resolutionStep
    const currentStep = (currentHeight - min) / resolutionStep
    return Math.round((currentStep / steps) * 100)
  }, [currentHeight, resolutionRange, resolutionStep])

  // 处理宽度滑块变化
  const handleWidthChange = (values: number[]) => {
    const { min, max } = resolutionRange
    const percentage = values[0] / 100
    const steps = (max - min) / resolutionStep
    const targetStep = Math.round(percentage * steps)
    const newWidth = min + targetStep * resolutionStep
    onChange(`${newWidth}×${currentHeight}`)
  }

  // 处理高度滑块变化
  const handleHeightChange = (values: number[]) => {
    const { min, max } = resolutionRange
    const percentage = values[0] / 100
    const steps = (max - min) / resolutionStep
    const targetStep = Math.round(percentage * steps)
    const newHeight = min + targetStep * resolutionStep
    onChange(`${currentWidth}×${newHeight}`)
  }

  // 处理预设选择
  const handlePresetClick = (width: number, height: number) => {
    onChange(`${width}×${height}`)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 预设分辨率按钮 */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("imageChat.presetResolution")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <button
              key={`${preset.width}x${preset.height}`}
              onClick={() => handlePresetClick(preset.width, preset.height)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md border transition-all",
                currentWidth === preset.width && currentHeight === preset.height
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
              )}
            >
              {preset.width}×{preset.height}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义宽度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("imageChat.width")}</Label>
          <span className="text-xs font-semibold text-primary">{currentWidth}px</span>
        </div>
        <Slider
          value={[widthSliderValue]}
          onValueChange={handleWidthChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{resolutionRange.min}</span>
          <span>{resolutionRange.max}</span>
        </div>
      </div>

      {/* 自定义高度 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("imageChat.height")}</Label>
          <span className="text-xs font-semibold text-primary">{currentHeight}px</span>
        </div>
        <Slider
          value={[heightSliderValue]}
          onValueChange={handleHeightChange}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{resolutionRange.min}</span>
          <span>{resolutionRange.max}</span>
        </div>
      </div>

    </div>
  )
}
