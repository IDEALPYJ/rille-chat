"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Search, 
  ToggleRight,
  Database,
  Type,
  Layers,
  Image,
  Video,
  Plus,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelIcon } from "@/components/ui/model-icon"
import { ModelConfig } from "@/lib/types"
import { VectorModelDetailCard } from "./vector-model-detail-card"
import { useI18n } from "@/lib/i18n/context"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import {
  openaiEmbeddingModelConfigs,
  aliyunEmbeddingModelConfigs,
  volcengineEmbeddingModelConfigs,
  zaiEmbeddingModelConfigs,
  geminiEmbeddingModelConfigs,
  openrouterEmbeddingModelConfigs,
  ollamaEmbeddingModelConfigs,
} from "@/lib/data/embedding-models"
import { EmbeddingModelConfig } from "@/lib/types/embedding_model"
import { Checkbox } from "@/components/ui/checkbox"

// 获取所有模型配置的映射
const ALL_EMBEDDING_MODELS: Record<string, EmbeddingModelConfig[]> = {
  openai: openaiEmbeddingModelConfigs,
  aliyun: aliyunEmbeddingModelConfigs,
  volcengine: volcengineEmbeddingModelConfigs,
  zai: zaiEmbeddingModelConfigs,
  gemini: geminiEmbeddingModelConfigs,
  openrouter: openrouterEmbeddingModelConfigs,
  ollama: ollamaEmbeddingModelConfigs,
}

// 模态选项
const MODALITY_OPTIONS = [
  { value: 'text', label: '文本', icon: Type },
  { value: 'image', label: '图片', icon: Image },
  { value: 'video', label: '视频', icon: Video },
] as const

interface VectorModelListProps {
  providerId: string
  models: ModelConfig[]
  onUpdateModels: (models: ModelConfig[]) => void
  checkModel?: string
  apiKey?: string
  onError?: (error: Error) => void
}

export function VectorModelList({
  providerId,
  models,
  onUpdateModels,
  checkModel,
}: VectorModelListProps) {
  const { t } = useI18n()
  const [modelSearchQuery, setModelSearchQuery] = React.useState("")
  const [selectedModelDetail, setSelectedModelDetail] = React.useState<EmbeddingModelConfig | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false)
  
  // Ollama 添加自定义模型对话框状态
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newModelId, setNewModelId] = React.useState("")
  const [newModelDisplayName, setNewModelDisplayName] = React.useState("")
  const [newModelDimensions, setNewModelDimensions] = React.useState<number[]>([1024])
  const [newModelDefaultDimension, setNewModelDefaultDimension] = React.useState(1024)
  const [newModelModalities, setNewModelModalities] = React.useState<string[]>(['text'])

  // 判断是否为 Ollama provider
  const isOllama = providerId === 'ollama'

  // 从 embedding-models 获取预定义模型配置
  const predefinedModels = React.useMemo(() => {
    return ALL_EMBEDDING_MODELS[providerId] || []
  }, [providerId])

  // 合并预定义模型和用户配置的启用状态
  const allModels = React.useMemo(() => {
    if (isOllama) {
      // Ollama 只显示用户添加的模型
      return models
    }
    
    // 其他 provider：从预定义模型生成列表，合并用户配置的启用状态
    const userModelMap = new Map(models.map(m => [m.id, m]))
    
    return predefinedModels.map(predefined => {
      const userConfig = userModelMap.get(predefined.id)
      return {
        id: predefined.id,
        displayName: predefined.displayName,
        enabled: userConfig?.enabled ?? false, // 默认未启用
        vectorDimensions: predefined.vectorDimensions.default,
        features: predefined.modalities.input,
        modelType: 'chat' as const,
        apiType: predefined.apiType,
        modalities: predefined.modalities,
        baseURL: predefined.baseURL,
      } as ModelConfig
    })
  }, [predefinedModels, models, isOllama])

  // 获取模型的完整配置（用于详情弹窗）
  const getModelFullConfig = (modelId: string): EmbeddingModelConfig | undefined => {
    if (isOllama) {
      // Ollama 从用户配置的模型构建 EmbeddingModelConfig
      const userModel = models.find(m => m.id === modelId)
      if (!userModel) return undefined
      
      return {
        id: userModel.id,
        displayName: userModel.displayName || userModel.id,
        provider: providerId,
        apiType: 'ollama:embeddings',
        modelType: 'text',
        vectorDimensions: {
          dimensions: [userModel.vectorDimensions || 1024],
          default: userModel.vectorDimensions || 1024,
        },
        modalities: userModel.modalities || { input: ['text'], output: ['embedding'] },
        baseURL: userModel.baseURL || 'http://localhost:11434',
      } as EmbeddingModelConfig
    }
    
    // 其他 provider 从预定义配置获取
    return predefinedModels.find(m => m.id === modelId)
  }

  // 获取模态图标
  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'text':
        return <Type className="h-3.5 w-3.5" />
      case 'image':
        return <Image className="h-3.5 w-3.5" />
      case 'video':
        return <Video className="h-3.5 w-3.5" />
      case 'multimodal':
        return <Layers className="h-3.5 w-3.5" />
      default:
        return <Database className="h-3.5 w-3.5" />
    }
  }

  // 格式化价格显示 - 保留三位小数
  const formatPriceDisplay = (modelConfig: ModelConfig): string => {
    const fullConfig = getModelFullConfig(modelConfig.id)
    if (!fullConfig?.pricing) return ''
    
    const textItem = fullConfig.pricing.items.find(item => item.type === 'text')
    if (textItem) {
      const rate = textItem.tiers[0]?.rate || 0
      const symbol = fullConfig.pricing.currency === 'USD' ? '$' : '¥'
      const unit = textItem.unit === '1M_tokens' ? '/M' : 
                   textItem.unit === '1K_tokens' ? '/K' : ''
      return `${symbol}${rate.toFixed(3)}${unit}`
    }
    return ''
  }

  // 处理添加维度
  const handleAddDimension = () => {
    // 生成一个默认的新维度值（使用当前最大维度 + 256 或 1024）
    const maxDim = Math.max(...newModelDimensions, 0)
    const newDim = maxDim > 0 ? maxDim + 256 : 1024
    setNewModelDimensions([...newModelDimensions, newDim])
  }

  // 处理删除维度
  const handleRemoveDimension = (dim: number) => {
    const updated = newModelDimensions.filter(d => d !== dim)
    setNewModelDimensions(updated)
    // 如果删除的是默认维度，重置默认
    if (dim === newModelDefaultDimension && updated.length > 0) {
      setNewModelDefaultDimension(updated[0])
    }
  }

  // 处理修改维度值
  const handleDimensionChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0
    const updated = [...newModelDimensions]
    const oldValue = updated[index]
    updated[index] = numValue
    setNewModelDimensions(updated)
    // 如果修改的是默认维度，更新默认值
    if (oldValue === newModelDefaultDimension) {
      setNewModelDefaultDimension(numValue)
    }
  }

  // 处理添加自定义模型（仅 Ollama）
  const handleAddCustomModel = () => {
    if (!newModelId.trim() || !newModelDisplayName.trim()) return
    
    const customModel: ModelConfig = {
      id: newModelId.trim(),
      displayName: newModelDisplayName.trim(),
      enabled: true,
      vectorDimensions: newModelDefaultDimension,
      features: newModelModalities,
      modelType: 'chat',
      apiType: 'ollama:embeddings',
      modalities: { input: newModelModalities as any[], output: ['text'] },
      baseURL: "http://localhost:11434",
    }
    
    onUpdateModels([...models, customModel])
    
    // 重置表单
    setNewModelId("")
    setNewModelDisplayName("")
    setNewModelDimensions([1024])
    setNewModelDefaultDimension(1024)
    setNewModelModalities(['text'])
    setIsAddDialogOpen(false)
  }

  // 处理删除自定义模型（仅 Ollama）
  const handleDeleteCustomModel = (modelId: string) => {
    const newModels = models.filter(m => m.id !== modelId)
    onUpdateModels(newModels)
  }

  // 处理启用/禁用模型
  const handleToggleModel = (modelId: string, checked: boolean) => {
    if (isOllama) {
      // Ollama：直接修改 models
      const newModels = [...models]
      const idx = newModels.findIndex(m => m.id === modelId)
      if (idx > -1) {
        newModels[idx] = { ...newModels[idx], enabled: checked }
      }
      onUpdateModels(newModels)
    } else {
      // 其他 provider：修改 models 来记录启用状态
      const newModels = [...models]
      const idx = newModels.findIndex(m => m.id === modelId)
      const fullConfig = getModelFullConfig(modelId)
      
      if (idx > -1) {
        // 更新现有配置
        newModels[idx] = { ...newModels[idx], enabled: checked }
      } else if (fullConfig) {
        // 添加新配置
        newModels.push({
          id: modelId,
          displayName: fullConfig.displayName,
          enabled: checked,
          vectorDimensions: fullConfig.vectorDimensions.default,
          features: fullConfig.modalities.input,
          modelType: 'chat',
          apiType: fullConfig.apiType,
          modalities: fullConfig.modalities,
          baseURL: fullConfig.baseURL,
        } as ModelConfig)
      }
      onUpdateModels(newModels)
    }
  }

  // 分类显示
  const sections = [
    { 
      title: t("modelList.enabled"), 
      models: allModels.filter((m) => m.enabled && m.id.toLowerCase().includes(modelSearchQuery.toLowerCase()))
    },
    { 
      title: t("modelList.disabled"), 
      models: allModels.filter((m) => !m.enabled && m.id.toLowerCase().includes(modelSearchQuery.toLowerCase()))
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t("modelList.title")}</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder={t("modelList.searchPlaceholder")}
              className="pl-7 h-7 w-full max-w-[192px] md:w-48 text-[10px] focus-visible:ring-1"
              value={modelSearchQuery}
              onChange={(e) => setModelSearchQuery(e.target.value)}
            />
          </div>

          {/* Ollama 显示添加按钮 */}
          {isOllama && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              title="添加自定义模型"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            title={allModels.some((m) => m.enabled) ? t("modelList.disableAll") : t("modelList.enableAll")}
            onClick={() => {
              const anyEnabled = allModels.some((m) => m.enabled);
              const newEnabledState = !anyEnabled;
              
              if (isOllama) {
                // Ollama：更新所有模型
                onUpdateModels(models.map(m => ({ ...m, enabled: newEnabledState })))
              } else {
                // 其他 provider：根据预定义模型生成配置
                const newModels = predefinedModels.map(predefined => ({
                  id: predefined.id,
                  displayName: predefined.displayName,
                  enabled: newEnabledState,
                  vectorDimensions: predefined.vectorDimensions.default,
                  features: predefined.modalities.input,
                  modelType: 'chat' as const,
                  apiType: predefined.apiType,
                  modalities: predefined.modalities,
                  baseURL: predefined.baseURL,
                } as ModelConfig))
                onUpdateModels(newModels)
              }
            }}
          >
            <ToggleRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        {sections.map(section => section.models.length > 0 && (
          <div key={section.title} className="space-y-2">
            <h4 className="text-[10px] font-semibold text-muted-foreground/70 px-1">{section.title}</h4>
            <div className="space-y-1 overflow-hidden no-scrollbar">
              {section.models.map((modelConfig) => {
                const modelId = modelConfig.id;
                const isSelected = checkModel === modelId;
                const fullConfig = getModelFullConfig(modelId);

                return (
                  <div
                    key={modelId}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer",
                      isSelected && "bg-muted/50"
                    )}
                    onClick={() => {
                      if (fullConfig) {
                        setSelectedModelDetail(fullConfig)
                        setIsDetailDialogOpen(true)
                      }
                    }}
                  >
                    {/* 左侧：Avatar + 模型信息 */}
                    <div className="flex-1 flex items-center gap-2 md:gap-3.5 overflow-hidden">
                      {/* Avatar */}
                      <div className="shrink-0 flex items-center justify-center w-6 h-6 md:w-8 md:h-8">
                        <ModelIcon
                          model={modelId}
                          provider={providerId}
                          avatar={modelConfig.avatar}
                          variant="color"
                          size={24}
                          className={cn("md:w-6 md:h-6 w-5 h-5", !modelConfig.enabled && "opacity-50 grayscale")}
                        />
                      </div>

                      {/* 中间左侧：名称 + 信息 */}
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        {/* 第一行：名称 + ID */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium text-xs text-foreground",
                            !modelConfig.enabled && "text-muted-foreground"
                          )}>
                            {fullConfig?.displayName || modelConfig.displayName || modelId}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono border border-muted rounded px-1.5 py-0.5">
                            {modelId}
                          </span>
                        </div>
                        
                        {/* 第二行：日期 + 维度 + 价格 - 手机端隐藏 */}
                        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground/80 flex-wrap">
                          {fullConfig?.releasedAt && (
                            <>
                              <span>{new Date(fullConfig.releasedAt).toLocaleDateString('zh-CN')}</span>
                              <span>•</span>
                            </>
                          )}
                          {modelConfig.vectorDimensions && (
                            <>
                              <span>{t("aiProvider.dimensions")}: {modelConfig.vectorDimensions}</span>
                              <span>•</span>
                            </>
                          )}
                          {formatPriceDisplay(modelConfig) && (
                            <span>{formatPriceDisplay(modelConfig)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：模态图标 + 删除按钮(Ollama) + Switch */}
                    <div className="flex items-center gap-2 md:gap-3.5 ml-2 md:ml-3.5">
                      {/* 输入模态图标 - 手机端隐藏 */}
                      {fullConfig?.modalities?.input && (
                        <div className="hidden md:flex items-center gap-1">
                          {fullConfig.modalities.input.map((modality) => (
                            <div key={modality}>
                              {getModalityIcon(modality)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ollama 自定义模型显示删除按钮 */}
                      {isOllama && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="删除模型"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCustomModel(modelId)
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}

                      <Switch
                        checked={modelConfig.enabled}
                        onCheckedChange={(checked: boolean) => handleToggleModel(modelId, checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <VisuallyHidden>
            <DialogTitle>模型详情</DialogTitle>
          </VisuallyHidden>
          {selectedModelDetail && (
            <VectorModelDetailCard 
              model={selectedModelDetail} 
              provider={providerId}
              className="border-0"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Ollama 添加自定义模型对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md" overlayClassName="bg-background/80 backdrop-blur-sm">
          <VisuallyHidden>
            <DialogTitle>添加自定义 Embedding 模型</DialogTitle>
          </VisuallyHidden>
          <div className="space-y-4 py-4">
            <h3 className="text-sm font-semibold">添加自定义 Embedding 模型</h3>
            
            {/* 模型ID */}
            <div className="space-y-2">
              <Label htmlFor="model-id" className="text-xs">模型ID</Label>
              <Input
                id="model-id"
                placeholder="例如：nomic-embed-text"
                className="h-8 text-xs"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
              />
            </div>

            {/* 显示名称 */}
            <div className="space-y-2">
              <Label htmlFor="model-name" className="text-xs">显示名称</Label>
              <Input
                id="model-name"
                placeholder="例如：Nomic Embed Text"
                className="h-8 text-xs"
                value={newModelDisplayName}
                onChange={(e) => setNewModelDisplayName(e.target.value)}
              />
            </div>

            {/* 向量维度 */}
            <div className="space-y-2">
              <Label className="text-xs">向量维度</Label>
              <div className="space-y-2">
                {newModelDimensions.map((dim, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 text-xs flex-1"
                      value={dim}
                      onChange={(e) => handleDimensionChange(index, e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveDimension(dim)}
                      disabled={newModelDimensions.length <= 1}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Checkbox
                      checked={dim === newModelDefaultDimension}
                      onCheckedChange={() => setNewModelDefaultDimension(dim)}
                      className="h-4 w-4"
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">默认</span>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] w-full"
                  onClick={handleAddDimension}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加维度
                </Button>
              </div>
            </div>

            {/* 输入模态 */}
            <div className="space-y-2">
              <Label className="text-xs">支持模态</Label>
              <div className="flex gap-4">
                {MODALITY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={newModelModalities.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewModelModalities([...newModelModalities, option.value])
                        } else {
                          setNewModelModalities(newModelModalities.filter(m => m !== option.value))
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <option.icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{option.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-zinc-900 dark:!bg-[#ffffff] text-white dark:!text-[#000000] hover:bg-zinc-800 dark:hover:!bg-[#f5f5f5]"
                onClick={handleAddCustomModel}
                disabled={!newModelId.trim() || !newModelDisplayName.trim()}
              >
                添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
