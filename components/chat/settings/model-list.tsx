"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { 
  Search, 
  ToggleRight,
  ArrowRight,
  Plus
} from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { cn } from "@/lib/utils"
import { ModelIcon } from "@/components/ui/model-icon"
import { ModelConfig } from "@/lib/types"
import { ModelConfig as NewModelConfig } from "@/lib/types/model"
import { ModelEditDialog } from "./model-edit-dialog"
import { useI18n } from "@/lib/i18n/context"
import { ModelDetailCard } from "./model-detail-card"
import { 
  formatPrice, 
  formatTokens,
  translateFeature, 
  translateModality,
  featureIcons, 
  modalityIcons,
  getPrimaryInputPrice,
  getPrimaryOutputPrice
} from "@/lib/utils/model-display"

interface ModelListProps {
  providerId: string
  models: ModelConfig[]
  onUpdateModels: (models: ModelConfig[]) => void
  checkModel?: string
}

export function ModelList({ 
  providerId, 
  models, 
  onUpdateModels, 
  checkModel
}: ModelListProps) {
  const { t } = useI18n()
  const [modelSearchQuery, setModelSearchQuery] = React.useState("")
  const [selectedModelType, setSelectedModelType] = React.useState<string>("all")
  const [isEditingModel, setIsEditingModel] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<{
    providerId: string
    modelId: string
    modelConfig: ModelConfig
  } | null>(null)
  const [selectedModelDetail, setSelectedModelDetail] = React.useState<NewModelConfig | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = React.useState(false)

  const handleAddCustomModel = () => {
    setEditingModel({
      providerId,
      modelId: "",
      modelConfig: {
        id: "",
        displayName: "",
        enabled: true,
        features: ['text'],
        contextLength: 4096,
        modelType: 'chat',
        apiType: 'openai:chat-completions',
        modalities: { input: ['text'], output: ['text'] }
      }
    })
    setIsEditingModel(true)
  }

  const handleSaveModelEdit = (updatedConfig: ModelConfig) => {
    const currentModels = [...models]
    const idx = currentModels.findIndex(m => m.id === updatedConfig.id)
    
    // 检查模型ID冲突（仅在添加新模型时检查）
    if (idx === -1) {
      // 检查是否已存在相同ID的模型
      const existingModel = currentModels.find(m => m.id === updatedConfig.id)
      if (existingModel) {
        // 显示错误提示
        alert(t("modelEdit.modelIdExists" as any, { id: updatedConfig.id }))
        return
      }
    }
    
    if (idx > -1) {
      currentModels[idx] = updatedConfig
    } else {
      currentModels.push(updatedConfig)
    }

    onUpdateModels(currentModels)
    setIsEditingModel(false)
    setEditingModel(null)
  }

  // 获取所有可用的模型类型
  const availableModelTypes = React.useMemo(() => {
    const types = new Set<string>()
    models.forEach((m: any) => {
      if (typeof m === 'object' && m.modelType) {
        types.add(m.modelType)
      }
    })
    return Array.from(types)
  }, [models])

  // 模型类型筛选和排序
  const filteredAndSortedModels = React.useMemo(() => {
    const filtered = models.filter((m: any) => {
      const modelId = m.id || m
      const modelConfig = typeof m === 'object' ? m : { id: modelId, enabled: false }
      
      // 搜索过滤
      if (!modelId.toLowerCase().includes(modelSearchQuery.toLowerCase())) {
        return false
      }
      
      // 模型类型过滤
      if (selectedModelType !== "all") {
        if (!modelConfig.modelType || modelConfig.modelType !== selectedModelType) {
          return false
        }
      }
      
      return true
    })

    // 分离自定义模型和默认模型
    const customModels: any[] = []
    const defaultModels: any[] = []
    
    filtered.forEach((m: any) => {
      // 判断是否为自定义模型（没有releasedAt字段的为自定义模型）
      if (typeof m === 'object' && !m.releasedAt) {
        customModels.push(m)
      } else {
        defaultModels.push(m)
      }
    })

    // 自定义模型按字典序排序
    customModels.sort((a, b) => {
      const idA = a.id || a
      const idB = b.id || b
      return idA.localeCompare(idB)
    })

    // 默认模型按发布时间从晚到早排序，时间相同按字典序
    defaultModels.sort((a, b) => {
      const modelA = typeof a === 'object' ? a : { id: a }
      const modelB = typeof b === 'object' ? b : { id: b }
      
      // 按发布时间排序
      if (modelA.releasedAt && modelB.releasedAt) {
        const dateCompare = new Date(modelB.releasedAt).getTime() - new Date(modelA.releasedAt).getTime()
        if (dateCompare !== 0) return dateCompare
      } else if (modelA.releasedAt) {
        return -1
      } else if (modelB.releasedAt) {
        return 1
      }
      
      // 时间相同或都没有时间，按字典序
      const idA = modelA.id || a
      const idB = modelB.id || b
      return idA.localeCompare(idB)
    })

    // 自定义模型在前，默认模型在后
    return [...customModels, ...defaultModels]
  }, [models, modelSearchQuery, selectedModelType])

  const sections = [
    { 
      title: t("modelList.enabled"), 
      models: filteredAndSortedModels.filter((m: any) => 
        (typeof m === 'object' ? m.enabled : false)
      ) 
    },
    { 
      title: t("modelList.disabled"), 
      models: filteredAndSortedModels.filter((m: any) => 
        (typeof m === 'object' ? !m.enabled : true)
      ) 
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("modelList.title")}</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t("modelList.searchPlaceholder")}
              className="pl-8 h-6 text-xs focus-visible:ring-1 w-full max-w-[192px] md:w-48"
              value={modelSearchQuery}
              onChange={(e) => setModelSearchQuery(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-foreground border border-border/50 hover:bg-muted"
            title="添加自定义模型"
            onClick={handleAddCustomModel}
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-foreground border border-border/50 hover:bg-muted"
            title={models.some((m: any) => m.enabled) ? t("modelList.disableAll") : t("modelList.enableAll")}
            onClick={() => {
              const anyEnabled = models.some((m: any) => m.enabled);
              const newEnabledState = !anyEnabled;
              const newModels = models.map((m: any) => {
                const mId = m.id || m;
                return { ...(typeof m === 'object' ? m : { id: mId, features: { text: true } }), enabled: newEnabledState };
              });
              onUpdateModels(newModels);
            }}
          >
            <ToggleRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 模型类型筛选栏 */}
      {availableModelTypes.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedModelType("all")}
            className={cn(
              "px-3 py-1 text-[10px] font-medium rounded-full transition-colors whitespace-nowrap",
              selectedModelType === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {t("modelList.all")}
          </button>
          {availableModelTypes.includes('chat') && (
            <button
              onClick={() => setSelectedModelType("chat")}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-full transition-colors whitespace-nowrap",
                selectedModelType === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t("modelList.chat")}
            </button>
          )}
          {availableModelTypes.includes('research') && (
            <button
              onClick={() => setSelectedModelType("research")}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-full transition-colors whitespace-nowrap",
                selectedModelType === "research"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t("modelList.research")}
            </button>
          )}
          {availableModelTypes.includes('image') && (
            <button
              onClick={() => setSelectedModelType("image")}
              className={cn(
                "px-3 py-1 text-[10px] font-medium rounded-full transition-colors whitespace-nowrap",
                selectedModelType === "image"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {t("modelList.image")}
            </button>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {sections.map(section => section.models.length > 0 && (
          <div key={section.title} className="space-y-2">
            <h4 className="text-[10px] font-semibold text-muted-foreground/70 px-1">{section.title}</h4>
            <div className="space-y-1 overflow-hidden no-scrollbar">
              {section.models.map((model: any) => {
                const modelId = model.id || model;
                const modelConfig = typeof model === 'object' ? model : { id: modelId, enabled: false };
                const isSelected = checkModel === modelId;

                // 获取定价信息
                const inputPrice = getPrimaryInputPrice(modelConfig.pricing)
                const outputPrice = getPrimaryOutputPrice(modelConfig.pricing)

                return (
                  <div
                    key={modelId}
                    className={cn(
                      "flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors group cursor-pointer",
                      isSelected && "bg-muted/50"
                    )}
                    onClick={() => {
                      // 判断是否为自定义模型（没有 releasedAt 字段）
                      const isCustomModel = !modelConfig.releasedAt
                      if (isCustomModel) {
                        // 自定义模型：打开编辑对话框
                        setEditingModel({
                          providerId,
                          modelId,
                          modelConfig: {
                            ...modelConfig,
                            id: modelId,
                            enabled: modelConfig.enabled || false
                          } as ModelConfig
                        })
                        setIsEditingModel(true)
                      } else {
                        // 预设模型：打开详情卡片
                        setSelectedModelDetail(modelConfig as any)
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

                      {/* 中间左侧：名称 + 定价信息 */}
                      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                        {/* 第一行：名称 + ID */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "font-medium text-xs text-foreground",
                            !modelConfig.enabled && "text-muted-foreground"
                          )}>
                            {modelConfig.displayName || modelConfig.name || modelId}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono border border-muted rounded px-1.5 py-0.5">
                            {modelId}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium shrink-0">
                              {t("modelList.testModel")}
                            </span>
                          )}
                        </div>
                        
                        {/* 第二行：定价 + 上下文长度 - 手机端隐藏 */}
                        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground/80 flex-wrap">
                          {inputPrice && (
                            <>
                              <span>{t("modelList.inputPrice")}: {formatPrice(inputPrice.rate, inputPrice.currency)}/M</span>
                              <span>•</span>
                            </>
                          )}
                          {outputPrice && (
                            <>
                              <span>{t("modelList.outputPrice")}: {formatPrice(outputPrice.rate, outputPrice.currency)}/M</span>
                              <span>•</span>
                            </>
                          )}
                          {modelConfig.contextWindow && (
                            <span>{formatTokens(modelConfig.contextWindow, true)} tokens</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：Features + 模态 + Switch */}
                    <div className="flex items-center gap-2 md:gap-3.5 ml-2 md:ml-3.5">
                      {/* Feature 图标（右侧对齐）- 手机端隐藏 */}
                      <div className="hidden md:flex items-center gap-1.5 justify-end" style={{ width: '80px' }}>
                        {modelConfig.features && modelConfig.features.length > 0 && (
                          <>
                            {modelConfig.features.map((feature: string) => {
                              const Icon = featureIcons[feature]
                              return Icon ? (
                                <TooltipProvider key={feature}>
                                    <Tooltip delayDuration={0}>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-pointer">
                                          <Icon className="h-3.5 w-3.5 text-foreground" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{translateFeature(feature)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null
                            })}
                          </>
                        )}
                      </div>

                      {/* 输入输出模态 - 手机端隐藏 */}
                      {modelConfig.modalities && (
                        <div className="hidden md:flex items-center gap-1.5">
                          {/* 输入模态 */}
                          <div className="flex items-center gap-1">
                            {modelConfig.modalities.input?.map((modality: string) => {
                              const Icon = modalityIcons[modality]
                              return Icon ? (
                                <TooltipProvider key={`input-${modality}`}>
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer">
                                        <Icon className="h-3.5 w-3.5 text-foreground" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{translateModality(modality)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null
                            })}
                          </div>
                          
                          {/* 箭头 */}
                          {modelConfig.modalities.input && modelConfig.modalities.output && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          
                          {/* 输出模态 */}
                          <div className="flex items-center gap-1">
                            {modelConfig.modalities.output?.map((modality: string) => {
                              const Icon = modalityIcons[modality]
                              return Icon ? (
                                <TooltipProvider key={`output-${modality}`}>
                                  <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                      <div className="cursor-pointer">
                                        <Icon className="h-3.5 w-3.5 text-foreground" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{translateModality(modality)}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : null
                            })}
                          </div>
                        </div>
                      )}

                      <Switch
                        checked={modelConfig.enabled}
                        onCheckedChange={(checked: boolean) => {
                          const newModels = [...models];
                          const idx = newModels.findIndex(m => m.id === modelId);
                          if (idx > -1) {
                            newModels[idx] = { ...newModels[idx], enabled: checked };
                          } else {
                            newModels.push({
                              id: modelId,
                              displayName: modelConfig.displayName || modelId,
                              enabled: checked,
                              features: modelConfig.features || ['text'],
                              modelType: modelConfig.modelType || 'chat',
                              apiType: modelConfig.apiType || 'openai:chat-completions',
                              modalities: modelConfig.modalities || { input: ['text'], output: ['text'] }
                            });
                          }
                          onUpdateModels(newModels);
                        }}
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

      {editingModel && (
        <ModelEditDialog
          open={isEditingModel}
          onOpenChange={setIsEditingModel}
          modelConfig={editingModel.modelConfig}
          onSave={handleSaveModelEdit}
        />
      )}

      {/* 模型详情弹窗 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-y-auto p-0"
          overlayClassName="bg-background/80 backdrop-blur-sm"
        >
          <VisuallyHidden>
            <DialogTitle>
              {selectedModelDetail?.displayName || selectedModelDetail?.id || t('modelList.title' as any)}
            </DialogTitle>
          </VisuallyHidden>
          {selectedModelDetail && (
            <ModelDetailCard 
              model={selectedModelDetail} 
              provider={providerId}
              className="border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
