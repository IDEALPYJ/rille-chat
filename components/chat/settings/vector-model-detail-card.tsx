"use client"

import * as React from "react"
import { 
  Type, 
  Image, 
  FileText,
  Calendar,
  Database,
  Layers,
  Copy,
  Check,
  Video
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
import { EmbeddingModelConfig } from "@/lib/types/embedding_model"
import { useI18n } from "@/lib/i18n/context"

// 格式化辅助函数
export const formatTokens = (tokens: number, detailed: boolean = false): string => {
  if (detailed) {
    return tokens.toLocaleString()
  }
  if (tokens >= 1000000) {
    const m = tokens / 1000000
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (tokens >= 1000) {
    const k = tokens / 1000
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return tokens.toString()
}

// 价格保留三位小数
export const formatPrice = (rate: number, currency: string): string => {
  const symbol = currency === 'USD' ? '$' : '¥'
  return `${symbol}${rate.toFixed(3)}`
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

// 图标映射
const modalityIcons: Record<string, React.ElementType> = {
  text: Type,
  image: Image,
  video: Video,
  multimodal: Layers,
}

interface VectorModelDetailCardProps {
  model: EmbeddingModelConfig
  provider?: string
  className?: string
}

export function VectorModelDetailCard({ model, provider, className }: VectorModelDetailCardProps) {
  const { t } = useI18n()
  // 类型断言辅助函数
  const td = (key: string) => t(key as any)
  const [copied, setCopied] = React.useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(model.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 渲染维度列表，默认维度加粗
  const renderDimensions = (dimensions: { dimensions: number[]; default: number }) => {
    if (dimensions.dimensions.length === 1) {
      return <span className="font-bold">{dimensions.default}</span>
    }
    
    return (
      <span>
        {dimensions.dimensions.map((dim, index) => (
          <span key={dim}>
            {index > 0 && ", "}
            <span className={cn(dim === dimensions.default && "font-bold")}>
              {dim}
            </span>
          </span>
        ))}
      </span>
    )
  }

  return (
    <Card className={cn("w-full max-w-4xl shadow-none", className)}>
      <CardContent className="pt-4 px-4 pb-4 space-y-4">
        {/* 第一行栏 - 模型基本信息（两侧对齐） */}
        <div className="flex items-start justify-between -mt-6">
          {/* 左侧 - 名称、ID */}
          <div className="flex-1 flex flex-col gap-2">
            {/* 名称 + ID + 复制按钮 */}
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
                    <p className="text-xs">{copied ? td('vectorModelDetail.copied') : td('vectorModelDetail.copyId')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
                    <Calendar className="h-3 w-3" />
                    <span>{td('vectorModelDetail.releaseDate')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatDate(model.releasedAt)}
                  </div>
                </div>
              )}
              <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                  <Database className="h-3 w-3" />
                  <span>{td('vectorModelDetail.vectorDimensions')}</span>
                </div>
                <div className="text-xs font-mono text-foreground mt-1">
                  {renderDimensions(model.vectorDimensions)}
                </div>
              </div>
              {model.maxInputTokens && (
                <div className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                  <div className="flex items-center gap-1 text-foreground text-xs font-medium">
                    <FileText className="h-3 w-3" />
                    <span>{td('vectorModelDetail.maxInput')}</span>
                  </div>
                  <div className="text-xs font-mono text-foreground mt-1">
                    {formatTokens(model.maxInputTokens, true)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 第三行栏 - 模态支持（仅输入模态） */}
        <div className="flex gap-4 flex-wrap md:flex-nowrap">
          {/* 模态卡片（仅输入） */}
          {model.modalities && (
            <Card className="shadow-none flex-1 min-w-0">
              <CardContent className="pt-0.5 px-1.5 pb-1.5">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-center justify-center gap-1 text-foreground text-xs font-medium">
                    <span>{td('vectorModelDetail.supportedModalities')}</span>
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
                                <p className="text-xs">
                                  {modality === 'text' ? td('vectorModelDetail.text') : 
                                   modality === 'image' ? td('vectorModelDetail.image') : 
                                   modality === 'video' ? td('vectorModelDetail.video') : 
                                   modality === 'multimodal' ? td('vectorModelDetail.multimodal') : modality}
                                </p>
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
        </div>

        {/* 第四行栏 - 定价信息（卡片展示） */}
        {model.pricing && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground">{td('vectorModelDetail.pricing')}</h3>
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
                          {type === 'text' ? td('vectorModelDetail.text') : 
                           type === 'image' ? td('vectorModelDetail.image') : 
                           type === 'video' ? td('vectorModelDetail.video') : type}
                        </span>
                      </div>
                      
                      {/* 卡片容器 - 右对齐 */}
                      <div className="flex-1 flex justify-end">
                        <div className="w-[84%]">
                          <Card className="shadow-none">
                            <CardContent className="p-1.5">
                              <div className="flex items-stretch divide-x">
                                {items.map((item, itemIndex) => {
                                  const tier = item.tiers[0]
                                  
                                  return (
                                    <div key={itemIndex} className="flex-1 flex flex-col items-center justify-between px-1.5 py-0.5">
                                      <div className="text-xs text-foreground text-center">
                                        {item.name === 'input' ? td('vectorModelDetail.input') : '输出'}
                                      </div>
                                      <div className="text-xs font-mono text-foreground mt-1">
                                        {formatPrice(tier.rate, model.pricing!.currency)}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {item.unit === '1M_tokens' ? '/M tokens' : 
                                         item.unit === '1K_tokens' ? '/K tokens' : 
                                         item.unit === 'per_image' ? `/${td('vectorModelDetail.image')}` : 
                                         item.unit}
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
