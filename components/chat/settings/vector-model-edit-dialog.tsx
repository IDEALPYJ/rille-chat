"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  HelpCircle,
  Database,
  Box,
  FileText,
  Type,
  Layers
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { ModelConfig } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  openaiEmbeddingModelConfigs,
  aliyunEmbeddingModelConfigs,
  volcengineEmbeddingModelConfigs,
  ollamaEmbeddingModelConfigs,
} from "@/lib/data/embedding-models"
import { EmbeddingModelConfig } from "@/lib/types/embedding_model"
import { Separator } from "@/components/ui/separator"

// 获取所有模型配置的映射
const ALL_EMBEDDING_MODELS: Record<string, EmbeddingModelConfig[]> = {
  openai: openaiEmbeddingModelConfigs,
  aliyun: aliyunEmbeddingModelConfigs,
  volcengine: volcengineEmbeddingModelConfigs,
  ollama: ollamaEmbeddingModelConfigs,
}

interface VectorModelEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelConfig: ModelConfig
  onSave: (config: ModelConfig) => void
  providerId?: string
}

export function VectorModelEditDialog({
  open,
  onOpenChange,
  modelConfig: initialConfig,
  onSave,
  providerId
}: VectorModelEditDialogProps) {
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

  // 获取模型的完整配置
  const getModelFullConfig = (): EmbeddingModelConfig | undefined => {
    if (!providerId) return undefined
    const providerModels = ALL_EMBEDDING_MODELS[providerId] || []
    return providerModels.find(m => m.id === config.id)
  }

  const fullConfig = getModelFullConfig()

  // 获取默认baseURL
  const getDefaultBaseURL = (): string => {
    if (!providerId) return "例如：https://api.openai.com/v1"
    
    const providerLower = providerId.toLowerCase()
    const modelId = config.id.toLowerCase()
    const isMultimodal = config.features?.includes('multimodalVectorization') ||
                         modelId.includes("vision") ||
                         modelId.includes("multimodal") ||
                         modelId.includes("vl-embedding")

    if (providerLower === "openai") {
      return "https://api.openai.com/v1"
    }
    
    if (providerLower === "aliyun" || providerLower === "dashscope") {
      if (isMultimodal) {
        return "https://dashscope.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding"
      } else {
        return "https://dashscope.aliyuncs.com/compatible-mode/v1"
      }
    }
    
    if (providerLower === "volcengine" || providerLower === "doubao") {
      return "https://ark.cn-beijing.volces.com/api/v3"
    }
    
    if (providerLower === "ollama") {
      return "http://localhost:11434"
    }

    return "例如：https://api.openai.com/v1"
  }

  // 获取可用的维度选项
  const getDimensionOptions = (): number[] => {
    if (fullConfig?.vectorDimensions) {
      return fullConfig.vectorDimensions.dimensions
    }
    return [config.vectorDimensions || 1024]
  }

  // 获取模型类型选项
  const modelTypeOptions = [
    { value: 'text', label: '文本 Embedding', icon: Type },
    { value: 'multimodal', label: '多模态 Embedding', icon: Layers },
  ]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" overlayClassName="bg-background/80 backdrop-blur-sm">
        <AlertDialogHeader>
          <VisuallyHidden>
            <AlertDialogTitle>编辑模型</AlertDialogTitle>
          </VisuallyHidden>
        </AlertDialogHeader>
        <div className="space-y-6 py-4">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("modelEdit.basicInfo")}</h3>
            
            <div className="space-y-2">
              <Label htmlFor="vector-model-name-edit" className="text-xs font-semibold">{t("modelEdit.modelName")}</Label>
              <Input
                id="vector-model-name-edit"
                placeholder={t("modelEdit.modelNamePlaceholder")}
                className="h-8.5 text-xs"
                value={config.name || config.id}
                onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vector-model-id-edit" className="text-xs font-semibold">模型ID</Label>
              <Input
                id="vector-model-id-edit"
                placeholder="例如：text-embedding-3-small"
                className="h-8.5 text-xs"
                value={config.id}
                disabled={true}
                onChange={(e) => setConfig(prev => ({ ...prev, id: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                模型ID用于API调用，不可修改
              </p>
            </div>
          </div>

          <Separator />

          {/* 模型配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">模型配置</h3>
            
            {/* 模型类型 */}
            <div className="space-y-2">
              <Label htmlFor="vector-model-type-edit" className="text-xs font-semibold">模型类型</Label>
              <Select
                value={fullConfig?.modelType || 'text'}
                disabled={true}
              >
                <SelectTrigger id="vector-model-type-edit" className="h-8.5 text-xs">
                  <SelectValue placeholder="选择模型类型" />
                </SelectTrigger>
                <SelectContent>
                  {modelTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <option.icon className="h-3.5 w-3.5" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                模型类型由系统根据模型ID自动识别
              </p>
            </div>

            {/* 向量维度 */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="vector-dimensions-edit" className="text-xs font-semibold">向量维度</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">选择向量嵌入的维度大小。部分模型支持多种维度。</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {getDimensionOptions().length > 1 ? (
                <Select
                  value={String(config.vectorDimensions || fullConfig?.vectorDimensions?.default || 1024)}
                  onValueChange={(value) => setConfig(prev => ({ 
                    ...prev, 
                    vectorDimensions: parseInt(value) 
                  }))}
                >
                  <SelectTrigger id="vector-dimensions-edit" className="h-8.5 text-xs">
                    <SelectValue placeholder="选择向量维度" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDimensionOptions().map((dim) => (
                      <SelectItem key={dim} value={String(dim)} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5" />
                          {dim}
                          {dim === fullConfig?.vectorDimensions?.default && (
                            <span className="text-[10px] text-muted-foreground">(默认)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="vector-dimensions-edit"
                  type="number"
                  placeholder="例如：1536、3072、1024"
                  className="h-8.5 text-xs"
                  value={config.vectorDimensions || fullConfig?.vectorDimensions?.default || ""}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || undefined
                    setConfig(prev => ({ ...prev, vectorDimensions: value }))
                  }}
                />
              )}
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                {getDimensionOptions().length > 1 
                  ? `该模型支持多种维度: ${getDimensionOptions().join(', ')}，默认: ${fullConfig?.vectorDimensions?.default}`
                  : "向量嵌入的维度大小，用于向量搜索和相似度计算"
                }
              </p>
            </div>

            {/* API 代理地址 */}
            <div className="space-y-2">
              <Label htmlFor="vector-baseurl-edit" className="text-xs font-semibold">API代理地址</Label>
              <Input
                id="vector-baseurl-edit"
                placeholder={getDefaultBaseURL()}
                className="h-8.5 text-xs"
                value={config.baseURL || ""}
                onChange={(e) => setConfig(prev => ({ ...prev, baseURL: e.target.value || undefined }))}
              />
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                该模型的API代理地址，留空使用默认地址。多模态和文本embedding模型的代理地址可能不同
              </p>
            </div>
          </div>

          <Separator />

          {/* 规格配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">规格配置</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 最大输入长度 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="vector-max-input-edit" className="text-xs font-semibold">最大输入长度</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">单次请求的最大输入token数</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="vector-max-input-edit"
                    type="number"
                    placeholder="例如：2048"
                    className="h-8.5 text-xs flex-1"
                    value={fullConfig?.maxInputTokens || ""}
                    disabled={true}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                  该模型支持的最大输入token数
                </p>
              </div>

              {/* 批量大小 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="vector-batch-size-edit" className="text-xs font-semibold">批量处理大小</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">单次请求支持的最大文本数量</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-2">
                  <Box className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="vector-batch-size-edit"
                    type="number"
                    placeholder="例如：25"
                    className="h-8.5 text-xs flex-1"
                    value={fullConfig?.maxBatchSize || ""}
                    disabled={true}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                  该模型支持的最大批量处理数量
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 特性配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("modelEdit.features")}</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label htmlFor="multimodal-vectorization-edit" className="text-xs font-medium">多模态向量化</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">是否支持图像、视频等多模态内容的向量化</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="multimodal-vectorization-edit"
                checked={fullConfig?.modelType === 'multimodal' || config.features?.includes('multimodalVectorization') || false}
                disabled={true}
              />
            </div>
            
            {fullConfig?.modelType === 'multimodal' && (
              <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                该模型支持多模态向量化，可以处理文本、图片等内容
              </p>
            )}
          </div>
        </div>
        
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
            className="h-7 px-3 text-xs rounded-md"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90"
          >
            {t("common.save")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
