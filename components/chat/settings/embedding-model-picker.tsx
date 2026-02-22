"use client"

import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ModelIcon } from "@/components/ui/model-icon"
import { useI18n } from "@/lib/i18n/context"
import { PROVIDER_NAMES } from "../model-selector"
import { VectorProviderConfig } from "./types"

interface EmbeddingModelPickerProps {
  value: string
  onValueChange: (value: string) => void
  vectorProviders?: Record<string, VectorProviderConfig>
  placeholder?: string
  disabled?: boolean
}

export function EmbeddingModelPicker({
  value,
  onValueChange,
  vectorProviders = {},
  placeholder = "选择 Embedding 模型...",
  disabled = false,
}: EmbeddingModelPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // 获取启用的 embedding 模型列表
  const enabledProviders = React.useMemo(() => {
    return Object.entries(vectorProviders)
      .filter(([, config]) => config.enabled)
      .map(([id, config]) => ({
        id,
        name: PROVIDER_NAMES[id] || id,
        models: config.models.filter(m => m.enabled !== false),
      }))
      .filter(p => p.models.length > 0)
  }, [vectorProviders])

  // 过滤模型
  const filteredProviders = React.useMemo(() => {
    if (!searchQuery) return enabledProviders
    
    return enabledProviders.map(p => ({
      ...p,
      models: p.models.filter(m => 
        (m.displayName || m.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(p => p.models.length > 0)
  }, [enabledProviders, searchQuery])

  // 获取选中的模型信息
  const selectedModelInfo = React.useMemo(() => {
    if (!value) return null
    
    // 解析 value 格式 "provider:model"
    const parts = value.split(":")
    if (parts.length === 2) {
      const [providerId, modelId] = parts
      const provider = enabledProviders.find(p => p.id === providerId)
      if (provider) {
        const model = provider.models.find(m => m.id === modelId)
        if (model) return { providerId, model }
      }
    }
    
    // 兼容旧格式（只有 model id）
    for (const p of enabledProviders) {
      const model = p.models.find(m => m.id === value)
      if (model) return { providerId: p.id, model }
    }
    return null
  }, [enabledProviders, value])

  // 是否有可用的 embedding 模型
  const hasAvailableModels = enabledProviders.length > 0

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || !hasAvailableModels}
          className={cn(
            "w-full justify-between h-9 text-xs font-normal",
            !hasAvailableModels && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 overflow-visible w-full">
            {selectedModelInfo ? (
              <>
                <div className="flex items-center justify-center shrink-0 w-5 h-5 overflow-visible">
                  <ModelIcon
                    provider={selectedModelInfo.providerId}
                    model={selectedModelInfo.model.id}
                    avatar={selectedModelInfo.model.avatar}
                    size={16}
                    variant="color"
                  />
                </div>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="truncate text-left">
                    {selectedModelInfo.model.displayName || selectedModelInfo.model.id}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground truncate">
                {!hasAvailableModels 
                  ? (t("chat.noEmbeddingModels") || "无可用 Embedding 模型") 
                  : placeholder
                }
              </span>
            )}
          </div>
          {hasAvailableModels && (
            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0" align="center">
        <div className="flex items-center border-b px-3 h-9">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          <input
            className="flex h-full w-full bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={t("modelPicker.searchPlaceholder") as string || "搜索模型..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div 
          className="max-h-[250px] overflow-y-auto overscroll-contain [&>*]:touch-action-pan-y"
          style={{ 
            touchAction: 'pan-y', 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight > target.clientHeight) {
              e.stopPropagation();
            }
          }}
          onTouchMove={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight > target.clientHeight) {
              e.stopPropagation();
            }
          }}
        >
          {filteredProviders.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {searchQuery
                ? (t("common.noData") || "无搜索结果")
                : (t("chat.noEmbeddingModels") || "无可用 Embedding 模型")
              }
            </div>
          ) : (
            <div className="p-1">
              {filteredProviders.map((provider) => (
                <div key={provider.id} className="mb-2 last:mb-0">
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ModelIcon provider={provider.id} size={12} variant="color" />
                    {provider.name}
                  </div>
                  <div className="space-y-0.5">
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 text-xs rounded-[var(--radius-sm)] transition-colors hover:bg-muted",
                          (value === `${provider.id}:${model.id}` || value === model.id) 
                            ? "bg-muted font-medium" 
                            : "text-foreground"
                        )}
                        onClick={() => {
                          onValueChange(`${provider.id}:${model.id}`)
                          setOpen(false)
                        }}
                      >
                        <div className="flex items-center justify-center shrink-0 w-5 h-5 overflow-visible">
                          <ModelIcon
                            provider={provider.id}
                            model={model.id}
                            avatar={model.avatar}
                            size={16}
                            variant="color"
                          />
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="truncate">
                            {model.displayName || model.id}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {model.id}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
