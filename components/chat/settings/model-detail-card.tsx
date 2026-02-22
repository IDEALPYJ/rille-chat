"use client"

import * as React from "react"
import { 
  Image, 
  Video, 
  Mic, 
  Lightbulb, 
  SquareFunction, 
  Braces, 
  Globe, 
  ImagePlus, 
  Terminal,
  Layers,
  ArrowRight,
  Copy,
  Check,
  Type,
  Database,
  Link,
  Map,
  Search,
  Twitter,
  Pencil
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModelIcon } from "@/components/ui/model-icon"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ModelConfig } from "@/lib/types/model"
import { useI18n } from "@/lib/i18n/context"

// 格式化辅助函数
export const formatTokens = (tokens: number, detailed: boolean = false): string => {
  if (detailed) {
    return tokens.toLocaleString()
  }
  if (tokens >= 1048576) {
    const m = tokens / 1048576
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (tokens >= 1024) {
    const k = tokens / 1024
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return tokens.toString()
}

export const formatPrice = (rate: number, currency: string): string => {
  const symbol = currency === 'USD' ? '$' : '¥'
  return `${symbol}${rate.toFixed(2)}`
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

// 这些翻译函数已移至 i18n 系统，保留用于向后兼容
export const translateFeature = (feature: string, t?: any): string => {
  if (t && t(`modelDetail.features.${feature}`, { defaultValue: '' })) {
    return t(`modelDetail.features.${feature}`)
  }
  return feature
}

export const translateTool = (tool: string, t?: any): string => {
  if (t && t(`modelDetail.tools.${tool}`, { defaultValue: '' })) {
    return t(`modelDetail.tools.${tool}`)
  }
  return tool
}

export const translateModality = (modality: string, t?: any): string => {
  if (t && t(`modelDetail.modalityTypes.${modality}`, { defaultValue: '' })) {
    return t(`modelDetail.modalityTypes.${modality}`)
  }
  return modality
}

export const translatePricingName = (name: string, t?: any): string => {
  if (t && t(`modelDetail.pricingNames.${name}`, { defaultValue: '' })) {
    return t(`modelDetail.pricingNames.${name}`)
  }
  return name
}

export const translatePricingUnit = (unit: string, t?: any): string => {
  if (t && t(`modelDetail.pricingUnits.${unit}`, { defaultValue: '' })) {
    return t(`modelDetail.pricingUnits.${unit}`)
  }
  return unit
}

// 图标映射
const modalityIcons: Record<string, React.ElementType> = {
  text: Type,
  image: Image,
  video: Video,
  audio: Mic,
}

const featureIcons: Record<string, React.ElementType> = {
  reasoning: Lightbulb,
  function_call: SquareFunction,
  function_calling: SquareFunction,
  structured_outputs: Braces,
  'structured-outputs': Braces,
  'context-1m': Database,
  image_generation: ImagePlus,
  image_edit: Pencil,
  interleave: Layers,
}

const toolIcons: Record<string, React.ElementType> = {
  web_search: Globe,
  'web-search': Globe,
  google_search: Search,
  x_search: Twitter,
  image_generation: ImagePlus,
  code_interpreter: Terminal,
  code_execution: Terminal,
  code_runner: Terminal,
  web_fetch: Link,
  url_context: Link,
  tool_search_tool: Search,
  google_maps: Map,
}

interface ModelDetailCardProps {
  model: ModelConfig
  provider?: string
  className?: string
}

export function ModelDetailCard({ model, provider, className }: ModelDetailCardProps) {
  const { t } = useI18n()
  // 类型断言辅助函数，用于处理新增的 modelDetail 翻译键
  const td = (key: string, params?: Record<string, string | number>) => t(key as any, params)
  const [copied, setCopied] = React.useState(false)
  const [selectedTierIndex, setSelectedTierIndex] = React.useState<Record<string, number>>({})

  const handleCopyId = () => {
    navigator.clipboard.writeText(model.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 检测是否有阶梯定价
  const hasTieredPricing = React.useMemo(() => {
    if (!model.pricing) return false
    return model.pricing.items.some(item => item.tiers && item.tiers.length > 1)
  }, [model.pricing])

  // 格式化阶梯描述
  const formatTierCondition = (tier: any, index: number) => {
    if (!tier.condition) return `阶梯 ${index + 1}`
    
    if (typeof tier.condition === 'string') {
      return tier.condition
    }
    
    if (tier.condition.input || tier.condition.output) {
      const parts = []
      if (tier.condition.input) {
        const [min, max] = tier.condition.input
        if (min === 0 && max !== 'infinity') {
          parts.push(`输入<=${formatTokens(max, true)}`)
        } else if (min !== 0 && max === 'infinity') {
          parts.push(`${formatTokens(min, true)}<输入`)
        } else if (min !== 0 && max !== 'infinity') {
          parts.push(`${formatTokens(min, true)}<输入<=${formatTokens(max, true)}`)
        }
      }
      if (tier.condition.output) {
        const [min, max] = tier.condition.output
        if (min === 0 && max !== 'infinity') {
          parts.push(`输出<=${formatTokens(max, true)}`)
        } else if (min !== 0 && max === 'infinity') {
          parts.push(`${formatTokens(min, true)}<输出`)
        } else if (min !== 0 && max !== 'infinity') {
          parts.push(`${formatTokens(min, true)}<输出<=${formatTokens(max, true)}`)
        }
      }
      return parts.join('，')
    }
    
    return `阶梯 ${index + 1}`
  }

  return (
    <Card className={cn("w-full max-w-4xl shadow-none", className)}>
      <CardContent className="pt-4 px-4 pb-4 space-y-4">
        {/* 第一行栏 - 模型基本信息（两侧对齐） */}
        <div className="flex items-start justify-between -mt-6">
          {/* 左侧 - 名称、ID 和 modelType */}
          <div className="flex-1 flex flex-col gap-2">
            {/* 第一行：名称 + ID + 复制按钮 */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-foreground">
                {model.displayName}
              </h2>
              <code className="text-[10px] text-muted-foreground font-mono">
                {model.id}
              </code>
              <TooltipProvider>
                <Tooltip open={copied ? true : undefined}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCopyId}
                      className="p-0.5 hover:bg-muted rounded transition-colors"
                      aria-label="复制模型ID"
                    >
                      {copied ? (
                        <Check className="h-2.5 w-2.5 text-green-600" />
                      ) : (
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{copied ? td('modelDetail.copied') : td('modelDetail.copyId')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* 第二行：modelType 和 features */}
            {model.modelType && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>
                  {model.modelType === 'chat' ? td('modelDetail.modelTypeChat') : 
                   model.modelType === 'image' ? td('modelDetail.modelTypeImage') : 
                   model.modelType === 'research' ? td('modelDetail.modelTypeResearch') :
                   model.modelType}
                </span>

              </div>
            )}
          </div>
          
          {/* 右侧 - Avatar */}
          <div className="flex-shrink-0 ml-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              <ModelIcon
                model={model.id}
                provider={provider}
                avatar={model.avatar}
                size={32}
                variant="color"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* 第二行栏 - 模型规格（单个卡片，竖线分隔） */}
        <Card className="shadow-none">
          <CardContent className="pt-0.5 px-1.5 pb-1.5">
            <div className="flex items-stretch divide-x">
              {model.releasedAt && (
                <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.releaseDate')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatDate(model.releasedAt)}
                  </div>
                </div>
              )}
              {model.knowledgeCutoff && (
                <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.knowledgeCutoff')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatDate(model.knowledgeCutoff)}
                  </div>
                </div>
              )}
              {model.contextWindow && (
                <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.contextWindow')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatTokens(model.contextWindow, true)}
                  </div>
                </div>
              )}
              {model.maxOutput && (
                <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.maxOutput')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatTokens(model.maxOutput, true)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 第三行栏 - 模态、能力和工具（卡片展示） */}
        <div className="flex gap-4 flex-wrap md:flex-nowrap">
          {/* 模态卡片（输入 → 输出） */}
          {model.modalities && (
            <Card className="shadow-none flex-1 min-w-0">
              <CardContent className="pt-0.5 px-1.5 pb-1.5">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.modalities')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {/* 输入模态 */}
                    <div className="flex items-center gap-1.5">
                      {model.modalities.input.map((modality) => {
                        const Icon = modalityIcons[modality]
                        return Icon ? (
                          <TooltipProvider key={modality}>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center cursor-pointer">
                                  <Icon className="h-3.5 w-3.5 text-foreground" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{td('modelDetail.inputModalities')}: {translateModality(modality, t)}</p>
                            </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null
                      })}
                    </div>
                    
                    {/* 箭头 */}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    
                    {/* 输出模态 */}
                    <div className="flex items-center gap-1.5">
                      {model.modalities.output.map((modality) => {
                        const Icon = modalityIcons[modality]
                        return Icon ? (
                          <TooltipProvider key={modality}>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center cursor-pointer">
                                  <Icon className="h-3.5 w-3.5 text-foreground" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{td('modelDetail.outputModalities')}: {translateModality(modality, t)}</p>
                            </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 模型能力卡片 */}
          {model.features && model.features.length > 0 && (
            <Card className="shadow-none flex-1 min-w-0">
              <CardContent className="pt-0.5 px-1.5 pb-1.5">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.modelCapabilities')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
                    {model.features.map((feature) => {
                      const Icon = featureIcons[feature]
                      return Icon ? (
                        <TooltipProvider key={feature}>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center cursor-pointer">
                                <Icon className="h-3.5 w-3.5 text-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{translateFeature(feature, t)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span key={feature} className="text-xs text-foreground">
                          {translateFeature(feature)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 内置工具卡片 */}
          {model.builtinTools && model.builtinTools.length > 0 && (
            <Card className="shadow-none flex-1 min-w-0">
              <CardContent className="pt-0.5 px-1.5 pb-1.5">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('modelDetail.builtinTools')}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
                    {model.builtinTools.map((tool) => {
                      const Icon = toolIcons[tool]
                      return Icon ? (
                        <TooltipProvider key={tool}>
                          <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                              <div className="flex items-center cursor-pointer">
                                <Icon className="h-3.5 w-3.5 text-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{translateTool(tool, t)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span key={tool} className="text-xs text-foreground">
                          {translateTool(tool)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 第四行栏 - 定价信息（卡片展示） */}
        {model.pricing && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground">{td('modelDetail.pricing')}</h3>
                {hasTieredPricing && (
                  <Select 
                    defaultValue="0"
                    onValueChange={(value) => {
                      // 更新所有项的阶梯索引
                      const newIndex = parseInt(value)
                      const updates: Record<string, number> = {}
                      model.pricing?.items.forEach((item, itemIndex) => {
                        if (item.tiers && item.tiers.length > newIndex) {
                          updates[`${item.type}-${itemIndex}`] = newIndex
                        }
                      })
                      setSelectedTierIndex(updates)
                    }}
                  >
                    <SelectTrigger className="w-auto h-7 text-[11px] border-none shadow-none">
                      <SelectValue placeholder={t('modelDetail.selectTier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {model.pricing.items
                        .find(item => item.tiers && item.tiers.length > 1)
                        ?.tiers.map((tier, index) => (
                          <SelectItem key={index} value={index.toString()} className="text-[11px]">
                            {formatTierCondition(tier, index)}
                          </SelectItem>
                        )) || null}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-4">
                {/* 按类型分组 */}
                {(() => {
                  const groupedItems = model.pricing.items.reduce((acc, item) => {
                    if (!acc[item.type]) {
                      acc[item.type] = []
                    }
                    acc[item.type].push(item)
                    return acc
                  }, {} as Record<string, typeof model.pricing.items>)

                  return Object.entries(groupedItems).map(([type, items]) => (
                    <div key={type} className="flex items-start gap-3">
                      {/* 标题在左侧 - 左对齐 */}
                      <div className="w-16 flex-shrink-0 pt-2">
                        <span className="text-xs font-medium text-foreground">
                          {td(`modelDetail.pricingTypes.${type}` as any) || type}
                        </span>
                      </div>
                      
                      {/* 卡片容器 - 右对齐 */}
                      <div className="flex-1 flex justify-end">
                        <div className="w-[84%]">
                          <Card className="shadow-none">
                            <CardContent className="p-1.5">
                              <div className="flex items-stretch divide-x">
                                {items.map((item, itemIndex) => {
                                  const tierIndex = selectedTierIndex[`${type}-${itemIndex}`] || 0
                                  const tier = item.tiers[tierIndex] || item.tiers[0]
                                  
                                  return (
                                    <div key={itemIndex} className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                                      <div className="text-xs text-foreground text-center">
                                        {translatePricingName(item.name, t)}
                                        {/* 显示 condition（如果存在且为字符串） */}
                                        {tier.condition && typeof tier.condition === 'string' && (
                                          <div className="text-[10px] text-muted-foreground mt-0.5">
                                            {tier.condition}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-xs font-mono text-foreground mt-1">
                                        {formatPrice(tier.rate, model.pricing!.currency)}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {translatePricingUnit(item.unit, t)}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
