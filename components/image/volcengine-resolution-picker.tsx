"use client"

import { cn } from "@/lib/utils"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/context"

// 分辨率选项 - API 需要小写
const RESOLUTION_OPTIONS = [
  { value: "1k", label: "1K" },
  { value: "2k", label: "2K" },
  { value: "4k", label: "4K" },
]

interface VolcengineResolutionPickerProps {
  modelId: string // 用于判断 4.5(2K/4K) 还是 4.0(1K/2K/4K)
  sizeMode: 'resolution' | 'custom'
  resolution: string
  customWidth: number
  customHeight: number
  onSizeModeChange: (mode: 'resolution' | 'custom') => void
  onResolutionChange: (resolution: string) => void
  onCustomSizeChange: (width: number, height: number) => void
  className?: string
}

export function VolcengineResolutionPicker({
  modelId,
  sizeMode,
  resolution,
  customWidth,
  customHeight,
  onSizeModeChange,
  onResolutionChange,
  onCustomSizeChange,
  className,
}: VolcengineResolutionPickerProps) {
  const { t } = useI18n()

  // 判断模型版本
  const is45 = modelId.includes('4-5') || modelId.includes('4.5')
  
  // 根据模型版本过滤分辨率选项
  const availableOptions = is45 
    ? RESOLUTION_OPTIONS.filter(opt => opt.value !== '1K') // 4.5 不支持 1K
    : RESOLUTION_OPTIONS

  // 获取当前分辨率在可用选项中的索引
  const currentIndex = availableOptions.findIndex(opt => opt.value === resolution)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  
  // 处理 Slider 变化
  const handleSliderChange = (value: number[]) => {
    const index = value[0]
    if (availableOptions[index]) {
      onResolutionChange(availableOptions[index].value)
    }
  }

  // 处理自定义宽度变化
  const handleWidthChange = (value: string) => {
    const num = parseInt(value)
    const width = isNaN(num) ? 0 : num
    onCustomSizeChange(width, customHeight)
  }

  // 处理自定义高度变化
  const handleHeightChange = (value: string) => {
    const num = parseInt(value)
    const height = isNaN(num) ? 0 : num
    onCustomSizeChange(customWidth, height)
  }

  // 验证自定义分辨率
  const totalPixels = customWidth * customHeight
  const is45Valid = is45
    ? totalPixels >= 3686400 && totalPixels <= 16777216
    : totalPixels >= 921600 && totalPixels <= 16777216
  
  const aspectRatio = customWidth > 0 && customHeight > 0 ? customWidth / customHeight : 1
  const isAspectRatioValid = aspectRatio >= 1/16 && aspectRatio <= 16
  
  const isCustomValid = is45Valid && isAspectRatioValid

  return (
    <div className={cn("space-y-3", className)}>
      {/* 顶部切换按钮 - 互斥按钮样式 */}
      <div className="flex gap-1">
        {([
          { value: 'resolution', label: t("imageChat.resolution") },
          { value: 'custom', label: t("imageChat.custom") }
        ] as const).map((option) => (
          <button
            key={option.value}
            onClick={() => onSizeModeChange(option.value)}
            className={cn(
              "flex-1 px-2 py-1 text-xs rounded-md border transition-all",
              sizeMode === option.value
                ? "bg-primary/10 border-primary text-primary"
                : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 分辨率选择模式 */}
      {sizeMode === 'resolution' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">{t("imageChat.resolution")}</Label>
              <span className="text-xs font-semibold text-primary">
                {availableOptions[safeIndex]?.label || '2K'}
              </span>
            </div>
            
            {/* Slider 拖动条 */}
            <Slider
              value={[safeIndex]}
              onValueChange={handleSliderChange}
              max={availableOptions.length - 1}
              step={1}
              className="w-full"
            />
            
            {/* 选项标签 */}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              {availableOptions.map((opt) => (
                <span key={opt.value} className={cn(
                  resolution === opt.value && "text-primary font-medium"
                )}>
                  {opt.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 自定义模式 */}
      {sizeMode === 'custom' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="custom-width" className="text-xs">{t("imageChat.width")}</Label>
              <Input
                id="custom-width"
                type="number"
                placeholder="480-16384"
                value={customWidth || ''}
                onChange={(e) => handleWidthChange(e.target.value)}
                className={cn(
                  "h-8 text-xs",
                  customWidth > 0 && !isCustomValid && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-height" className="text-xs">{t("imageChat.height")}</Label>
              <Input
                id="custom-height"
                type="number"
                placeholder="480-16384"
                value={customHeight || ''}
                onChange={(e) => handleHeightChange(e.target.value)}
                className={cn(
                  "h-8 text-xs",
                  customHeight > 0 && !isCustomValid && "border-red-500 focus-visible:ring-red-500"
                )}
              />
            </div>
          </div>

          {/* 仅在不满足时显示警告，每行一个 */}
          {!isCustomValid && customWidth > 0 && customHeight > 0 && (
            <div className="space-y-1">
              {!isAspectRatioValid && (
                <p className="text-red-500 dark:text-red-400 text-[10px]">
                  {t("imageChat.invalidAspectRatioRange")}
                </p>
              )}
              {!is45Valid && (
                <p className="text-red-500 dark:text-red-400 text-[10px]">
                  {is45 
                    ? t("imageChat.invalidTotalPixels").replace("{min}", "3,686,400").replace("{max}", "16,777,216")
                    : t("imageChat.invalidTotalPixels").replace("{min}", "921,600").replace("{max}", "16,777,216")
                  }
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
