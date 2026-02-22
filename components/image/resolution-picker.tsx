"use client"

import { cn } from "@/lib/utils"

import { useI18n } from "@/lib/i18n/context"

// 比例选项 - 使用空心框图标
const RATIO_OPTIONS = [
  { value: "16:9", label: "宽屏", ratioLabel: "16:9" },
  { value: "4:3", label: "标准", ratioLabel: "4:3" },
  { value: "1:1", label: "方形", ratioLabel: "1:1" },
  { value: "3:4", label: "竖屏", ratioLabel: "3:4" },
  { value: "9:16", label: "全竖屏", ratioLabel: "9:16" },
]

// 获取空心框图标（根据比例）- 缩小30%
const getRatioIcon = (ratio: string, isSelected: boolean) => {
  const strokeColor = isSelected ? "currentColor" : "currentColor"
  
  switch (ratio) {
    case "16:9":
      return (
        <svg viewBox="0 0 48 32" className="w-8 h-5">
          <rect x="1" y="1" width="46" height="30" rx="2" fill="none" stroke={strokeColor} strokeWidth="2"/>
        </svg>
      )
    case "4:3":
      return (
        <svg viewBox="0 0 48 36" className="w-8 h-6">
          <rect x="1" y="1" width="46" height="34" rx="2" fill="none" stroke={strokeColor} strokeWidth="2"/>
        </svg>
      )
    case "1:1":
      return (
        <svg viewBox="0 0 36 36" className="w-6 h-6">
          <rect x="1" y="1" width="34" height="34" rx="2" fill="none" stroke={strokeColor} strokeWidth="2"/>
        </svg>
      )
    case "3:4":
      return (
        <svg viewBox="0 0 36 48" className="w-6 h-8">
          <rect x="1" y="1" width="34" height="46" rx="2" fill="none" stroke={strokeColor} strokeWidth="2"/>
        </svg>
      )
    case "9:16":
      return (
        <svg viewBox="0 0 32 48" className="w-5 h-8">
          <rect x="1" y="1" width="30" height="46" rx="2" fill="none" stroke={strokeColor} strokeWidth="2"/>
        </svg>
      )
    default:
      return null
  }
}

// Bailian 模型预设分辨率映射
const BAILIAN_PRESET_RESOLUTIONS: Record<string, Record<string, string>> = {
  "qwen-image": {
    "16:9": "1664×928",
    "4:3": "1472×1104",
    "1:1": "1328×1328",
    "3:4": "1104×1472",
    "9:16": "928×1664",
  },
  "wan2.6-image": {
    "16:9": "1280×720",
    "4:3": "1280×960",
    "1:1": "1024×1024",
    "3:4": "960×1280",
    "9:16": "720×1280",
  },
}

// OpenAI 图像模型预设分辨率 - 只支持3档
const OPENAI_PRESET_RESOLUTIONS: Record<string, string> = {
  "1:1": "1024×1024",
  "3:4": "1024×1536",
  "4:3": "1536×1024",
}

// OpenAI 比例选项 - 只显示3个
const OPENAI_RATIO_OPTIONS = [
  { value: "4:3", label: "横屏", ratioLabel: "4:3/16:9" },
  { value: "1:1", label: "方形", ratioLabel: "1:1" },
  { value: "3:4", label: "竖屏", ratioLabel: "3:4/9:16" },
]

interface ResolutionPickerProps {
  modelType?: string
  provider?: string
  value: string
  onChange: (resolution: string) => void
  className?: string
}

export function ResolutionPicker({ modelType = "qwen-image", provider = "bailian", value, onChange, className }: ResolutionPickerProps) {
  // 判断是否为 OpenAI 模型
  const isOpenAI = provider === 'openai' || modelType?.includes('gpt-image') || modelType?.includes('chatgpt-image')
  
  // 获取当前选中的比例
  const getCurrentRatio = () => {
    // 处理可能包含空格的分辨率字符串
    const cleanValue = value.trim().replace(/\s+/g, '')
    // 标准化分辨率字符串（统一使用 × 分隔符）
    const normalizedValue = cleanValue.replace(/[\*xX]/g, '×')

    // OpenAI 模型直接匹配分辨率字符串
    if (isOpenAI) {
      switch (normalizedValue) {
        case '1536×1024': return '4:3'  // 横屏
        case '1024×1024': return '1:1'  // 方形
        case '1024×1536': return '3:4'  // 竖屏
      }
      return '1:1'
    }

    // 其他模型通过计算宽高比匹配
    const parts = normalizedValue.split('×')
    if (parts.length === 2) {
      const w = parseInt(parts[0])
      const h = parseInt(parts[1])
      if (w && h && !isNaN(w) && !isNaN(h)) {
        const ratio = w / h
        // 使用精确匹配
        if (Math.abs(ratio - 16/9) < 0.05) return "16:9"
        if (Math.abs(ratio - 4/3) < 0.05) return "4:3"
        if (Math.abs(ratio - 1) < 0.05) return "1:1"
        if (Math.abs(ratio - 3/4) < 0.05) return "3:4"
        if (Math.abs(ratio - 9/16) < 0.05) return "9:16"
      }
    }
    // 如果无法解析，默认返回 1:1
    return "1:1"
  }

  const currentRatio = getCurrentRatio()

  // 获取分辨率显示
  const getResolutionDisplay = (ratio: string) => {
    if (isOpenAI) {
      return OPENAI_PRESET_RESOLUTIONS[ratio] || OPENAI_PRESET_RESOLUTIONS["1:1"]
    } else {
      const resolutions = BAILIAN_PRESET_RESOLUTIONS[modelType] || BAILIAN_PRESET_RESOLUTIONS["qwen-image"]
      return resolutions[ratio] || resolutions["1:1"]
    }
  }

  const handleRatioSelect = (ratio: string) => {
    const resolution = getResolutionDisplay(ratio)
    onChange(resolution)
  }

  // 根据模型类型选择要显示的选项
  const displayOptions = isOpenAI ? OPENAI_RATIO_OPTIONS : RATIO_OPTIONS

  return (
    <div className={cn("space-y-4", className)}>
      {/* 比例选择网格 - 3列布局 */}
      <div className="grid grid-cols-3 gap-3">
        {displayOptions.map((option) => {
          const resolution = getResolutionDisplay(option.value)
          const isSelected = currentRatio === option.value

          return (
            <button
              key={option.value}
              onClick={() => handleRatioSelect(option.value)}
              className={cn(
                "flex flex-col items-center justify-between p-2 rounded-xl border-2 transition-all h-[88px]",
                isSelected
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                  : "border-border hover:border-gray-300 hover:bg-muted/50"
              )}
            >
              {/* 比例图标 - 使用 flex-1 占据剩余空间并居中 */}
              <div className={cn(
                "flex-1 flex items-center transition-colors",
                isSelected ? "text-blue-500" : "text-muted-foreground"
              )}>
                {getRatioIcon(option.value, isSelected)}
              </div>

              {/* 分辨率显示 - 固定在底部 */}
              <span className={cn(
                "text-[10px] font-mono mt-auto",
                isSelected ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
              )}>
                {resolution}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 自定义分辨率输入组件（用于支持自定义分辨率的模型）
interface CustomResolutionInputProps {
  value: string
  onChange: (resolution: string) => void
  className?: string
  minSize?: number
  maxSize?: number
}

export function CustomResolutionInput({
  value,
  onChange,
  className,
  minSize = 512,
  maxSize = 2048
}: CustomResolutionInputProps) {
  const { t } = useI18n()

  // 解析当前值
  const parseValue = () => {
    const parts = value.split(/[×*x]/)
    if (parts.length === 2) {
      const w = parseInt(parts[0])
      const h = parseInt(parts[1])
      return { width: isNaN(w) ? 0 : w, height: isNaN(h) ? 0 : h }
    }
    return { width: 0, height: 0 }
  }

  const { width, height } = parseValue()

  // 计算验证状态（0表示空值，不验证）
  const isWidthValid = width === 0 || (width >= minSize && width <= maxSize)
  const isHeightValid = height === 0 || (height >= minSize && height <= maxSize)
  const isValid = isWidthValid && isHeightValid

  const handleWidthChange = (inputValue: string) => {
    const num = parseInt(inputValue)
    const newWidth = isNaN(num) ? 0 : num
    onChange(`${newWidth}×${height}`)
  }

  const handleHeightChange = (inputValue: string) => {
    const num = parseInt(inputValue)
    const newHeight = isNaN(num) ? 0 : num
    onChange(`${width}×${newHeight}`)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 宽高输入 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t("imageChat.width")}</label>
          <input
            type="number"
            value={width || ''}
            onChange={(e) => handleWidthChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-card",
              isWidthValid ? "border-border" : "border-red-300 dark:border-red-700"
            )}
          />
        </div>
        <span className="text-muted-foreground pt-5">×</span>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t("imageChat.height")}</label>
          <input
            type="number"
            value={height || ''}
            onChange={(e) => handleHeightChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-card",
              isHeightValid ? "border-border" : "border-red-300 dark:border-red-700"
            )}
          />
        </div>
      </div>

      {/* 超出范围时显示提示 */}
      {!isValid && (
        <p className="text-red-500 dark:text-red-400 text-xs">
          {t("imageChat.invalidSizeRange").replace("{min}", minSize.toString()).replace("{max}", maxSize.toString())}
        </p>
      )}
    </div>
  )
}

// 带验证的自定义分辨率输入组件（用于 wan2.6 等有严格限制的模型）
interface ValidatedResolutionInputProps {
  value: string
  onChange: (resolution: string) => void
  className?: string
  minSize?: number
  maxSize?: number
  minRatio?: number
  maxRatio?: number
  minPixels?: number
  maxPixels?: number
}

export function ValidatedResolutionInput({
  value,
  onChange,
  className,
  minSize = 384,
  maxSize = 2560,
  minRatio = 0.25,
  maxRatio = 4,
  minPixels = 589824,
  maxPixels = 1638400
}: ValidatedResolutionInputProps) {
  const { t } = useI18n()

  // 解析当前值
  const parseValue = () => {
    const parts = value.split(/[×*x]/)
    if (parts.length === 2) {
      const w = parseInt(parts[0])
      const h = parseInt(parts[1])
      return { width: isNaN(w) ? 0 : w, height: isNaN(h) ? 0 : h }
    }
    return { width: 0, height: 0 }
  }

  const { width, height } = parseValue()

  // 计算验证状态（0表示空值，不验证）
  const aspectRatio = width > 0 && height > 0 ? width / height : 1
  const totalPixels = width * height
  const isAspectRatioValid = width === 0 || height === 0 || (aspectRatio >= minRatio && aspectRatio <= maxRatio)
  const isWidthValid = width === 0 || (width >= minSize && width <= maxSize)
  const isHeightValid = height === 0 || (height >= minSize && height <= maxSize)
  const isTotalPixelsValid = width === 0 || height === 0 || (totalPixels >= minPixels && totalPixels <= maxPixels)
  const isValid = isAspectRatioValid && isWidthValid && isHeightValid && isTotalPixelsValid

  const handleWidthChange = (inputValue: string) => {
    const num = parseInt(inputValue)
    const newWidth = isNaN(num) ? 0 : num
    onChange(`${newWidth}×${height}`)
  }

  const handleHeightChange = (inputValue: string) => {
    const num = parseInt(inputValue)
    const newHeight = isNaN(num) ? 0 : num
    onChange(`${width}×${newHeight}`)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 宽高输入 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t("imageChat.width")}</label>
          <input
            type="number"
            value={width || ''}
            onChange={(e) => handleWidthChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-card",
              isWidthValid ? "border-border" : "border-red-300 dark:border-red-700"
            )}
          />
        </div>
        <span className="text-muted-foreground pt-5">×</span>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">{t("imageChat.height")}</label>
          <input
            type="number"
            value={height || ''}
            onChange={(e) => handleHeightChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-card",
              isHeightValid ? "border-border" : "border-red-300 dark:border-red-700"
            )}
          />
        </div>
      </div>

      {/* 仅在不满足时显示警告，每行一个 */}
      {!isValid && width > 0 && height > 0 && (
        <div className="space-y-1">
          {!isAspectRatioValid && (
            <p className="text-red-500 dark:text-red-400 text-xs">
              {t("imageChat.invalidAspectRatio")}
            </p>
          )}
          {(!isWidthValid || !isHeightValid) && (
            <p className="text-red-500 dark:text-red-400 text-xs">
              {t("imageChat.invalidSizeRange").replace("{min}", minSize.toString()).replace("{max}", maxSize.toString())}
            </p>
          )}
          {!isTotalPixelsValid && (
            <p className="text-red-500 dark:text-red-400 text-xs">
              {t("imageChat.invalidTotalPixels").replace("{min}", minPixels.toLocaleString()).replace("{max}", maxPixels.toLocaleString())}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// 为了保持向后兼容，保留原名导出
export const Wan26ResolutionInput = ValidatedResolutionInput
