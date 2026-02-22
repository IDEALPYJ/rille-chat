"use client"

import * as React from "react"
import { Brain, ChevronLeft, Check, Loader2, RefreshCcw, X, Sparkles, AlertCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { SystemModelPicker } from "./system-model-picker"
import { EmbeddingModelPicker } from "./embedding-model-picker"
import { MemoryManagementDialog } from "./memory-management-dialog"
import { VectorizationDialog } from "./vectorization-dialog"
import { SettingsState } from "./types"

interface MemorySettingsProps {
  settings: SettingsState
  onUpdateMemory: (updates: Partial<SettingsState["memory"]>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: () => void
  onBack?: () => void
}

export function MemorySettings({
  settings,
  onUpdateMemory,
  saveStatus,
  onSave,
  onBack,
}: MemorySettingsProps) {
  const { t } = useI18n()
  
  // 向量化状态
  const [vectorizationStats, setVectorizationStats] = React.useState<{
    total: number
    vectorized: number
    unvectorized: number
    vectorizedPercentage: number
  } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = React.useState(false)
  
  // 对话框状态
  const [showVectorizationDialog, setShowVectorizationDialog] = React.useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)
  const [pendingEmbeddingModel, setPendingEmbeddingModel] = React.useState<string>("")

  // 加载向量化统计
  const loadVectorizationStats = async () => {
    if (!settings.memory.embeddingModel) {
      setVectorizationStats(null)
      return
    }
    
    setIsLoadingStats(true)
    try {
      const response = await fetch("/api/user/memory/vectorization-status")
      if (response.ok) {
        const data = await response.json()
        setVectorizationStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to load vectorization stats:", error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  // 初始加载和当 embeddingModel 变化时加载
  React.useEffect(() => {
    loadVectorizationStats()
  }, [settings.memory.embeddingModel])

  // 处理 Embedding 模型变更
  const handleEmbeddingModelChange = (newModel: string) => {
    const oldModel = settings.memory.embeddingModel || ""
    
    // 情况 1：从空到非空（首次设置）
    if (!oldModel && newModel) {
      setPendingEmbeddingModel(newModel)
      setShowConfirmDialog(true)
      return
    }
    
    // 情况 2：从非空到空（关闭向量化）
    if (oldModel && !newModel) {
      // 直接切换，保留已有向量
      onUpdateMemory({ embeddingModel: "" })
      onSave()
      return
    }
    
    // 情况 3：更换模型
    if (oldModel && newModel && oldModel !== newModel) {
      setPendingEmbeddingModel(newModel)
      setShowConfirmDialog(true)
      return
    }
    
    // 其他情况直接保存
    onUpdateMemory({ embeddingModel: newModel })
    onSave()
  }

  // 确认切换模型
  const handleConfirmSwitch = async (shouldVectorize: boolean) => {
    // 先保存模型设置
    onUpdateMemory({ embeddingModel: pendingEmbeddingModel })
    onSave()
    setShowConfirmDialog(false)
    
    // 如果需要向量化且有待处理的记忆
    if (shouldVectorize && vectorizationStats && vectorizationStats.unvectorized > 0) {
      // 延迟一点打开向量化对话框，等待设置保存
      setTimeout(() => {
        setShowVectorizationDialog(true)
      }, 500)
    }
  }

  // 向量化完成后的回调
  const handleVectorizationComplete = () => {
    loadVectorizationStats()
  }

  return (
    <div className="w-full overflow-y-auto">
      <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-8">
        {/* 头部 */}
        <div className="h-14 border-b flex items-center justify-between px-5 md:px-0 shrink-0 mb-6 md:mb-6">
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
              <Brain className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("sidebar.memory")}</h2>
          </div>
          <div className="flex items-center gap-4">
            {/* 已保存提示放在开启记忆功能左侧 */}
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
            {/* 启用开关放在标题行右侧 */}
            <Switch
              checked={settings.memory.enabled}
              onCheckedChange={(checked) => {
                onUpdateMemory({ enabled: checked })
                onSave()
              }}
            />
          </div>
        </div>

        {settings.memory.enabled && (
          <div className="space-y-8">
            {/* 记忆提取模型 - 与标题说明在一行 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("chat.extractionModel") || "记忆提取模型"}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.extractionModelDesc") || "用于提取和分类记忆的 LLM"}</p>
              </div>
              <div className="w-[280px]">
                <SystemModelPicker
                  value={settings.memory.extractionModel || ""}
                  onValueChange={(val) => {
                    onUpdateMemory({ extractionModel: val })
                    onSave()
                  }}
                  providers={settings.providers}
                  placeholder={t("chat.selectExtractionModel") || "选择提取模型"}
                  chatOnly={true}
                />
              </div>
            </div>

            {/* 向量化模型 - 与标题说明在一行，清除按钮 hover 时显示 */}
            <div className="group flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("chat.embeddingModel") || "向量化模型"}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.embeddingModelDesc") || "可选，用于向量检索。留空使用关键词模式"}</p>
              </div>
              <div className="flex items-center gap-2">
                {settings.memory.embeddingModel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleEmbeddingModelChange("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div className="w-[280px]">
                  <EmbeddingModelPicker
                    value={settings.memory.embeddingModel || ""}
                    onValueChange={handleEmbeddingModelChange}
                    vectorProviders={settings.vectorProviders}
                    placeholder={t("chat.selectEmbeddingModel") || "选择向量化模型（可选）"}
                  />
                </div>
              </div>
            </div>

            {/* 向量化状态管理 */}
            {settings.memory.embeddingModel && (
              <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{t("memory.vectorizationStatus") || "向量化状态"}</span>
                  </div>
                </div>

                {vectorizationStats ? (
                  <>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex-1">
                        {vectorizationStats.unvectorized > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("memory.unvectorized") || "未向量化"}</span>
                            <span className="font-medium">{vectorizationStats.unvectorized}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                        onClick={() => {
                          if (vectorizationStats.unvectorized > 0) {
                            setShowVectorizationDialog(true)
                          }
                        }}
                        disabled={isLoadingStats || vectorizationStats.unvectorized === 0}
                      >
                        {vectorizationStats.unvectorized > 0
                          ? (t("memory.vectorizeNow") || "立即向量化")
                          : (t("memory.allVectorized") || "已全部向量化")
                        }
                      </Button>
                    </div>

                    {vectorizationStats.unvectorized > 0 && (
                      <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{t("memory.unvectorizedTip") || "有未向量化的记忆，建议立即向量化以获得更好的检索效果"}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t("memory.clickToCheck") || "点击检查未向量化记忆"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      onClick={loadVectorizationStats}
                      disabled={isLoadingStats}
                    >
                      {isLoadingStats ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("memory.check") || "检查"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 检索策略 - 与标题说明在一行，使用 Select 组件 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("chat.memoryStrategy") || "检索策略"}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.memoryStrategyDesc") || "记忆检索的排序策略"}</p>
              </div>
              <Select
                value={settings.memory.strategy || "hybrid"}
                onValueChange={(val: "recency" | "relevance" | "hybrid") => {
                  onUpdateMemory({ strategy: val })
                  onSave()
                }}
              >
                <SelectTrigger className="w-[280px] h-8 text-xs">
                  <SelectValue placeholder={t("chat.strategy") || "选择检索策略"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recency" className="text-xs">{t("chat.strategyRecency") || "最近优先"}</SelectItem>
                  <SelectItem value="relevance" className="text-xs">{t("chat.strategyRelevance") || "相关优先"}</SelectItem>
                  <SelectItem value="hybrid" className="text-xs">{t("chat.strategyHybrid") || "混合评分"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 上下文长度 - 与标题说明在一行 */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("chat.maxContextTokens") || "上下文长度"}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.maxContextTokensDesc") || "检索记忆的最大 Token 数"}</p>
              </div>
              <div className="flex items-center gap-4 w-[280px]">
                <Slider
                  value={[settings.memory.maxContextTokens]}
                  min={1024}
                  max={8192}
                  step={128}
                  onValueChange={([val]) => onUpdateMemory({ maxContextTokens: val })}
                  onValueCommit={() => onSave()}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={settings.memory.maxContextTokens}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1024
                    onUpdateMemory({ maxContextTokens: Math.min(Math.max(val, 1024), 8192) })
                  }}
                  onBlur={() => onSave()}
                  className="w-20 h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* 更新通知 */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("chat.notifyOnUpdate") || "更新通知"}</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("chat.notifyOnUpdateDesc") || "记忆更新时显示通知"}</p>
              </div>
              <Switch
                checked={settings.memory.notifyOnUpdate}
                onCheckedChange={(checked) => {
                  onUpdateMemory({ notifyOnUpdate: checked })
                  onSave()
                }}
              />
            </div>

            {/* 记忆管理按钮 */}
            <div className="pt-4 border-t border-dashed border-border">
              <MemoryManagementDialog
                trigger={
                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs gap-2"
                  >
                    {t("chat.manageMemoryContent") || "管理记忆内容"}
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("memory.switchModelTitle") || "切换向量化模型"}</DialogTitle>
            <DialogDescription>
              {vectorizationStats && vectorizationStats.unvectorized > 0
                ? (t("memory.switchModelDescWithUnvectorized")?.replace("{count}", String(vectorizationStats.unvectorized)) 
                  || `检测到 ${vectorizationStats.unvectorized} 条记忆需要向量化。是否立即处理？`)
                : (t("memory.switchModelDesc") || "切换模型后，新记忆将使用新模型生成向量。")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            {vectorizationStats && vectorizationStats.unvectorized > 0 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleConfirmSwitch(false)}
                >
                  {t("memory.later") || "稍后处理"}
                </Button>
                <Button onClick={() => handleConfirmSwitch(true)}>
                  {t("memory.vectorizeNow") || "立即向量化"}
                </Button>
              </>
            ) : (
              <Button onClick={() => handleConfirmSwitch(false)}>
                {t("common.confirm") || "确定"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 向量化进度对话框 */}
      <VectorizationDialog
        open={showVectorizationDialog}
        onOpenChange={setShowVectorizationDialog}
        unvectorizedCount={vectorizationStats?.unvectorized || 0}
        onVectorizationComplete={handleVectorizationComplete}
      />
    </div>
  )
}
