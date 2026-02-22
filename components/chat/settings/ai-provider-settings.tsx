"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Loader2, 
  RefreshCcw, 
  Check,
  Bot
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModelIcon } from "@/components/ui/model-icon"
import { SettingsState, ProviderConfig } from "./types"
import { ModelList } from "./model-list"
import { loadModelConfigsForProvider } from "@/lib/data/models"
import { modelProviders } from "@/lib/data/model-providers/model-providers"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ModelConfig } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"
import { isApiKeyConfig, isOllamaConfig } from "./types"
import { getDefaultBaseURLForProvider } from "@/lib/chat/protocol-config"

interface AIProviderSettingsProps {
  settings: SettingsState
  onUpdateProviderConfig: (id: string, updates: Partial<ProviderConfig>, shouldSave?: boolean) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function AIProviderSettings({ 
  settings, 
  onUpdateProviderConfig, 
  saveStatus,
  onSave,
  onBack
}: AIProviderSettingsProps) {
  const { t } = useI18n()
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null)
  const [showProviderList, setShowProviderList] = React.useState(true) // 移动端控制是否显示服务商列表
  const [providerSearchQuery, setProviderSearchQuery] = React.useState("")
  const [isChecking, setIsChecking] = React.useState(false)
  const [checkStatus, setCheckStatus] = React.useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false)
  const [defaultModels, setDefaultModels] = React.useState<Record<string, ModelConfig[]>>({})
   
  const [_isLoadingModels, setIsLoadingModels] = React.useState(false)

  
  // 当选择服务商时，移动端隐藏列表显示详情
  const handleSelectProvider = (id: string) => {
    setSelectedProviderId(id)
    setShowProviderList(false)
  }
  
  // 返回服务商列表
  const handleBackToList = () => {
    setShowProviderList(true)
  }

  // 加载服务商的默认模型配置
  React.useEffect(() => {
    if (selectedProviderId && !defaultModels[selectedProviderId]) {
      setIsLoadingModels(true)
      loadModelConfigsForProvider(selectedProviderId)
        .then(models => {
          // 获取用户已保存的模型配置
          const savedProviderConfig = settings.providers[selectedProviderId]
          const savedModels = savedProviderConfig?.models || []
          
          // 将加载的模型转换为用户设置格式，合并用户已保存的 enabled 状态
          const modelsWithEnabled = models.map(m => {
            // 查找用户是否已保存此模型的配置
            const savedModel = savedModels.find((sm: any) => sm.id === m.id)
            
            return {
              ...m,
              id: m.id,
              // 如果用户已保存过此模型，使用保存的 enabled 状态；否则默认为 false
              enabled: savedModel ? savedModel.enabled : false,
              // 保持 features 为字符串数组，同时兼容旧格式
              features: Array.isArray(m.features) ? m.features : [],
            }
          }) as ModelConfig[]
          
          setDefaultModels(prev => ({ ...prev, [selectedProviderId]: modelsWithEnabled }))
        })
        .catch(error => {
          console.error(`Failed to load models for ${selectedProviderId}:`, error)
          setDefaultModels(prev => ({ ...prev, [selectedProviderId]: [] }))
        })
        .finally(() => {
          setIsLoadingModels(false)
        })
    }
  }, [selectedProviderId, defaultModels, settings.providers])

  // 同步用户设置中的模型启用状态到 defaultModels
  React.useEffect(() => {
    if (selectedProviderId && defaultModels[selectedProviderId]) {
      const savedProviderConfig = settings.providers[selectedProviderId]
      const savedModels = savedProviderConfig?.models || []
      
      // 检查是否需要更新
      const currentModels = defaultModels[selectedProviderId]
      let needsUpdate = false
      
      const updatedModels = currentModels.map(m => {
        const savedModel = savedModels.find((sm: any) => sm.id === m.id)
        if (savedModel && m.enabled !== savedModel.enabled) {
          needsUpdate = true
          return { ...m, enabled: savedModel.enabled }
        }
        return m
      })
      
      if (needsUpdate) {
        setDefaultModels(prev => ({ ...prev, [selectedProviderId]: updatedModels }))
      }
    }
  }, [selectedProviderId, settings.providers, defaultModels])

  // 从 model-providers.ts 获取所有预定义的服务商
   
  const _predefinedProviderIds = modelProviders.map(p => p.id)
  
  // 获取用户自定义的服务商
  const allProviders = [
    ...modelProviders.map(p => ({
      id: p.id,
      name: p.id,
      icon: p.avatar
    }))
  ]

  const sortedProviders = allProviders.map(p => ({
    ...p,
    ...settings.providers[p.id],
    name: t(`aiProvider.providerNames.${p.id}` as any) || settings.providers[p.id]?.name || p.name
  })).sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.name.localeCompare(b.name)
  }).filter(p => p.name.toLowerCase().includes(providerSearchQuery.toLowerCase()))

  const selectedProvider = sortedProviders.find(p => p.id === selectedProviderId)
  const selectedProviderConfig = selectedProviderId ? settings.providers[selectedProviderId] : null



  const checkConnectivity = async () => {
    if (!selectedProviderId) return
    setIsChecking(true)
    setCheckStatus("idle")
    const config = settings.providers[selectedProviderId]
    const displayModels = (defaultModels[selectedProviderId]?.length ? defaultModels[selectedProviderId] : config.models) || []

    try {
      const res = await fetch("/api/provider/check", {
        method: "POST",
        body: JSON.stringify({
          provider: selectedProviderId,
          config: config,
          model: config.checkModel || (displayModels[0] as any)?.id || "default"
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCheckStatus("success")
        setTimeout(() => setCheckStatus("idle"), 3000)
      } else {
        setCheckStatus("error")
        setErrorMessage(data.error || t("errors.connectionFailed"))
        setErrorDialogOpen(true)
      }
    } catch (err: any) {
      console.error("Connectivity check frontend error:", err)
      setCheckStatus("error")
        setErrorMessage(err.message || t("errors.loadFailed"))
      setErrorDialogOpen(true)
    } finally {
      setIsChecking(false)
    }
  }


  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* Provider List Sidebar - 第二级：服务商列表 */}
      <div className={cn(
        "absolute inset-0 md:relative md:inset-auto w-full md:w-64 border-r bg-card/50 flex flex-col text-xs h-full transition-transform duration-300 shrink-0",
        showProviderList ? "translate-x-0" : "-translate-x-full md:!translate-x-0"
      )}>
        <div className="h-14 border-b flex items-center gap-2 px-3 shrink-0">
          {showProviderList && onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 shrink-0"
              onClick={onBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {!showProviderList && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 shrink-0"
              onClick={handleBackToList}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder={t("aiProvider.searchPlaceholder")} 
              className="pl-8 h-6 text-xs focus-visible:ring-1" 
              value={providerSearchQuery}
              onChange={(e) => setProviderSearchQuery(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          <div className="space-y-4">
            {/* Enabled Section */}
            {sortedProviders.filter(p => p.enabled).length > 0 && (
              <div>
                <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("aiProvider.enable")}
                </h3>
                {sortedProviders.filter(p => p.enabled).map(p => (
                  <Button
                    key={p.id}
                    variant={selectedProviderId === p.id ? "secondary" : "ghost"}
                    className="w-full justify-between h-7 group px-3"
                    onClick={() => handleSelectProvider(p.id)}
                  >
                    <div className="flex items-center">
                      <ModelIcon provider={p.id} variant="color" size={20} />
                      <span className="ml-2.5 text-xs">{p.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </div>
            )}
            {/* Disabled Section */}
            {sortedProviders.filter(p => !p.enabled).length > 0 && (
              <div>
                <h3 className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("aiProvider.disable")}
                </h3>
                {sortedProviders.filter(p => !p.enabled).map(p => (
                  <Button
                    key={p.id}
                    variant={selectedProviderId === p.id ? "secondary" : "ghost"}
                    className="w-full justify-between h-7 group px-3"
                    onClick={() => handleSelectProvider(p.id)}
                  >
                    <div className="flex items-center text-muted-foreground">
                      <ModelIcon provider={p.id} variant="color" size={20} className="opacity-50" />
                      <span className="ml-2.5 text-xs">{p.name}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Content Area - 第三级：服务商详情 */}
      <div className={cn(
        "absolute inset-0 md:relative md:inset-auto flex-1 bg-background overflow-y-auto h-full no-scrollbar transition-transform duration-300 min-w-0",
        showProviderList ? "translate-x-full md:!translate-x-0" : "translate-x-0"
      )}>
        {selectedProvider ? (
          <div className="p-0 md:px-8 md:pt-2 md:pb-8 w-full">
            {/* Header */}
            <div className="h-10 flex items-center justify-between gap-2 px-4 shrink-0 mb-0 md:mb-0 md:mt-0 mt-0">
              <div className="flex items-center min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8 shrink-0"
                  onClick={handleBackToList}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <ModelIcon provider={selectedProvider.id} variant="color" size={18} className="md:size-6 size-[18px] shrink-0 md:mr-3" />
                <h2 className="text-lg font-bold truncate">{selectedProvider.name}</h2>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {saveStatus === "saving" && (
                  <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground text-xs animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("common.saving")}
                  </div>
                )}
                {saveStatus === "error" && (
                  <button
                    onClick={() => onSave()}
                    className="flex items-center gap-2 text-destructive text-xs hover:opacity-80 transition-opacity"
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {t("search.saveFailed")}
                  </button>
                )}
                {saveStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-500 text-xs">
                    <Check className="h-3.5 w-3.5" />
                    {t("common.saved")}
                  </div>
                )}
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-medium">
                    {selectedProvider.enabled ? t("aiProvider.enable") : t("aiProvider.disable")}
                  </span>
                  <Switch
                    checked={selectedProvider.enabled}
                    onCheckedChange={(checked) => onUpdateProviderConfig(selectedProvider.id, { enabled: checked }, true)}
                  />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-4 px-4 md:px-0 pt-4">
              {selectedProviderConfig && (() => {
                // 第一类协议：apiKey + baseURL
                if (isApiKeyConfig(selectedProviderConfig)) {
                  return (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-xs font-semibold">{t("aiProvider.apiKey")}</Label>
                        <PasswordInput
                          id="api-key"
                          placeholder={t("search.placeholder") + " " + t("aiProvider.apiKey")}
                          className="h-8.5 text-xs"
                          value={selectedProviderConfig.apiKey || ""}
                          onChange={(e) => onUpdateProviderConfig(selectedProvider.id, { apiKey: e.target.value }, false)}
                          onBlur={(e) => onUpdateProviderConfig(selectedProvider.id, { apiKey: (e.target as any).value }, true)}
                        />
                      </div>
                    </>
                  )
                }
                // 第二类协议：ollama
                if (isOllamaConfig(selectedProviderConfig)) {
                  return (
                    <div className="space-y-2">
                      <Label htmlFor="ollama-url" className="text-xs font-semibold">{t("aiProvider.apiProxy")}</Label>
                      <Input
                        id="ollama-url"
                        placeholder={getDefaultBaseURLForProvider(selectedProvider.id) || "http://localhost:11434/v1"}
                        className="h-8.5 text-xs"
                        value={selectedProviderConfig.baseURL || ""}
                        onChange={(e) => onUpdateProviderConfig(selectedProvider.id, { baseURL: e.target.value }, false)}
                        onBlur={(e) => onUpdateProviderConfig(selectedProvider.id, { baseURL: (e.target as any).value }, true)}
                      />
                    </div>
                  )
                }
                return null
              })()}

              <div className="flex gap-4 items-end">
                <div className="space-y-2 flex-1 min-w-0">
                  <Label className="text-xs font-semibold">{t("aiProvider.connectivityModel")}</Label>
                  <Select
                    value={settings.providers[selectedProvider.id]?.checkModel || ""}
                    onValueChange={(val: string) => onUpdateProviderConfig(selectedProvider.id, { checkModel: val })}
                  >
                    <SelectTrigger className="h-8.5 font-mono text-xs w-full">
                      <SelectValue placeholder={t("aiProvider.selectModel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        defaultModels[selectedProvider.id]?.length
                          ? defaultModels[selectedProvider.id]
                          : selectedProvider.models || []
                      ).map((m: ModelConfig | string) => {
                        const modelId = typeof m === 'string' ? m : m.id;
                        return (
                          <SelectItem key={modelId} value={modelId} className="text-xs">
                            {modelId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="h-8.5 text-xs gap-2 shrink-0 px-4"
                  variant="secondary"
                  onClick={checkConnectivity}
                  disabled={isChecking}
                >
                  {isChecking && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isChecking && checkStatus === "success" && <Check className="h-4 w-4 text-green-500" />}
                  {t("aiProvider.testConnectivity")}
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Model List：以静态配置为优先数据源 */}
              <ModelList
                providerId={selectedProvider.id}
                models={
                  (defaultModels[selectedProvider.id]?.length ? defaultModels[selectedProvider.id] : selectedProvider.models) || []
                }
                onUpdateModels={(newModels: ModelConfig[]) => onUpdateProviderConfig(selectedProvider.id, { models: newModels }, true)}
                checkModel={settings.providers[selectedProvider.id]?.checkModel}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <div className="p-5 bg-muted/50 rounded-full mb-3">
              <Bot className="h-10 w-10 opacity-20 dark:opacity-30" />
            </div>
            <p className="text-xs">{t("aiProvider.selectProvider")}</p>
          </div>
        )}
      </div>

      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent overlayClassName="bg-background/80 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aiProvider.connectionCheckFailed")}</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive font-medium">
              {errorMessage}
            </AlertDialogDescription>
            <div className="text-xs text-muted-foreground mt-2">
              {t("aiProvider.connectionCheckFailedDesc")}
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialogOpen(false)} className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90">{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  )
}
