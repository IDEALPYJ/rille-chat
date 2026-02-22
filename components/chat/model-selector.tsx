"use client"

import * as React from "react"
import { ChevronDown, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModelConfig } from "@/lib/types"
import { ModelIcon } from "@/components/ui/model-icon"
import { useI18n } from "@/lib/i18n/context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ModelSelectorProps {
  selectedProvider: string | null
  selectedModel: string | null
  onSelect: (provider: string, model: string) => void
  imageGenerationOnly?: boolean // 是否只显示图像生成模型
}

type ProviderConfig = {
  id: string
  name: string
  enabled: boolean
  models: (string | ModelConfig)[]
  model?: string
}



/**
 * @deprecated PROVIDER_NAMES 已废弃，请使用 i18n 的 providerNames
 * 仅保留有模型配置文件的服务商
 */
export const PROVIDER_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  bailian: "阿里云",
  deepseek: "DeepSeek",
  google: "Google",
  minimax: "MiniMax",
  mistral: "Mistral",
  moonshot: "Moonshot",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  perplexity: "Perplexity",
  siliconflow: "SiliconFlow",
  volcengine: "火山引擎",
  xai: "xAI",
  zai: "ZAI",
}

// PROVIDER_LOGOS removed in favor of ModelIcon

export function ModelSelector({ selectedProvider, selectedModel, onSelect, imageGenerationOnly = false }: ModelSelectorProps) {
  const { t } = useI18n()
  const [providers, setProviders] = React.useState<ProviderConfig[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchSettings = React.useCallback(async () => {
    try {
      // 模型列表以静态配置（lib/data/models）为唯一数据源，不再从用户 DB 读取
      const res = await fetch(`/api/chat/providers-for-select?imageGenerationOnly=${imageGenerationOnly}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.providers?.length) {
          const providersList: ProviderConfig[] = data.providers.map((p: any) => ({
            id: p.id,
            // 使用 i18n 翻译的服务商名称，如果没有翻译则使用 API 返回的名称
            name: t(`aiProvider.providerNames.${p.id}` as any) || p.name,
            enabled: p.enabled,
            models: (p.models || []).map((m: any) => ({ ...m, enabled: m.enabled !== false })),
            model: p.model
          }))
          setProviders(providersList)

          const currentProviderData = providersList.find(p => p.id === selectedProvider)
          const isCurrentModelValid = currentProviderData?.models.some((m: any) => {
            const mId = typeof m === 'string' ? m : m.id
            return mId === selectedModel && m.enabled !== false
          })

          if ((!selectedModel || !isCurrentModelValid) && providersList.length > 0) {
            const first = providersList[0]
            const firstModel = first.models.find((m: any) => m.enabled !== false)
            let modelId: string | undefined
            if (firstModel) {
              modelId = typeof firstModel === 'string' ? firstModel : firstModel.id
            } else if (first.models.length > 0) {
              const fallbackModel = first.models[0]
              modelId = typeof fallbackModel === 'string' ? fallbackModel : fallbackModel.id
            }
            if (modelId) {
              onSelect(first.id, modelId)
            }
          }
        }
      }
    } catch (_error) {
      console.error("Failed to fetch settings for model selector:", _error)
    } finally {
      setLoading(false)
    }
  }, [selectedProvider, selectedModel, onSelect, imageGenerationOnly])

  React.useEffect(() => {
    fetchSettings()
    
    window.addEventListener("settings-updated", fetchSettings)
    return () => {
      window.removeEventListener("settings-updated", fetchSettings)
    }
  }, [fetchSettings])

  const currentProvider = providers.find(p => p.id === selectedProvider)
  
  if (loading && !selectedModel) {
    return (
      <Button variant="ghost" className="h-9 px-3 gap-2 hover:bg-muted dark:hover:bg-muted transition-colors rounded-lg opacity-50 overflow-visible" disabled>
        <div className="flex items-center gap-2 overflow-visible">
          <div className="flex items-center justify-center shrink-0 w-6 h-6 overflow-visible">
            {selectedProvider ? (
              (() => {
                const selectedModelData = currentProvider?.models.find(m => (typeof m === 'string' ? m : m.id) === selectedModel);
                const selectedAvatar = typeof selectedModelData === 'object' ? selectedModelData.avatar : undefined;
                return <ModelIcon model={selectedModel || undefined} provider={selectedProvider} avatar={selectedAvatar} size={20} variant="color" />;
              })()
            ) : <Bot className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs font-semibold text-foreground">加载中...</span>
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    )
  }

  if (providers.length === 0 && !loading) {
    return null; // Or show a button to open settings
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-3 gap-2 hover:bg-muted dark:hover:bg-muted transition-colors rounded-lg overflow-visible">
          <div className="flex items-center gap-2 overflow-visible">
            <div className="flex items-center justify-center shrink-0 w-6 h-6 overflow-visible">
              {selectedProvider ? (
                (() => {
                  const selectedModelData = providers.find(p => p.id === selectedProvider)?.models.find(m => (typeof m === 'string' ? m : m.id) === selectedModel);
                  const selectedAvatar = typeof selectedModelData === 'object' ? selectedModelData.avatar : undefined;
                  return <ModelIcon model={selectedModel || undefined} provider={selectedProvider} avatar={selectedAvatar} size={20} variant="color" />;
                })()
              ) : <Bot className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs font-semibold text-foreground dark:text-foreground truncate max-w-[150px]">
                {(() => {
                  const model = providers.find(p => p.id === selectedProvider)?.models.find(m => (typeof m === 'string' ? m : m.id) === selectedModel);
                  if (typeof model === 'object') {
                    // 优先使用displayName，name，最后是id
                    return model.displayName || model.name || model.id;
                  }
                  return model || selectedModel || "选择模型";
                })()}
              </span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px] p-1.5 rounded-xl shadow-xl border-border dark:border-border dark:bg-card">
        {providers.length === 0 && !loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            未启用任何服务商，请在设置中配置。
          </div>
        )}
        {providers.map((provider) => (
          <React.Fragment key={provider.id}>
            <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
              <ModelIcon provider={provider.id} size={18} variant="color" />
              {provider.name}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {provider.models
                .filter((m: any) => (typeof m === 'string' ? true : m.enabled !== false))
                .map((model: any) => {
                  const modelId = typeof model === 'string' ? model : model.id;
                  const isSelected = selectedModel === modelId && selectedProvider === provider.id;
                  const modelData = typeof model === 'string' ? null : model as ModelConfig;
                  const modelAvatar = typeof model === 'string' ? undefined : model.avatar;

                  return (
                    <DropdownMenuItem
                      key={modelId}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors focus:bg-muted dark:focus:bg-muted group",
                        isSelected && "bg-muted dark:bg-muted"
                      )}
                      onClick={() => onSelect(provider.id, modelId)}
                    >
                      <div className="flex items-center gap-2.5 overflow-visible flex-1 min-w-0">
                        <div className={cn(
                          "flex items-center justify-center shrink-0 w-5 h-5 overflow-visible",
                          isSelected && "[&_svg]:text-[#2563eb] dark:[&_svg]:text-[#60a5fa]"
                        )}>
                          <ModelIcon model={modelId} provider={provider.id} avatar={modelAvatar} size={16} variant="color" />
                        </div>
                        <span className={cn(
                          "text-sm font-medium truncate",
                          isSelected ? "text-[#2563eb] dark:text-[#60a5fa]" : "text-foreground dark:text-foreground"
                        )}>
                          {modelData?.displayName || modelData?.name || modelId}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
            </DropdownMenuGroup>
            {provider.id !== providers[providers.length - 1].id && (
              <DropdownMenuSeparator className="my-1 mx-2" />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
