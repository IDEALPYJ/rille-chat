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
import { ProviderConfig } from "./types"
import { PROVIDER_NAMES } from "../model-selector"
import { useI18n } from "@/lib/i18n/context"

interface SystemModelPickerProps {
  value: string
  onValueChange: (value: string) => void
  providers: Record<string, ProviderConfig>
  placeholder?: string
  chatOnly?: boolean // 是否只显示对话模型
}

/**
 * 系统设置专用模型选择器
 * 与 ModelPicker 的区别：显示所有启用服务商的所有模型（不检查模型是否启用）
 * 用于输入补全、记忆提取、对话命名等系统功能
 */
export function SystemModelPicker({
  value,
  onValueChange,
  providers,
  placeholder = "选择模型...",
  chatOnly = false
}: SystemModelPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // 获取启用的服务商及其所有模型（不检查模型是否启用）
  const enabledProviders = React.useMemo(() => {
    return Object.entries(providers)
      .filter(([, config]) => config.enabled)
      .map(([id, config]) => {
        // 显示所有模型（不检查 m.enabled）
        let models = config.models.filter((m: unknown) => {
          // 字符串类型无法判断，保留
          if (typeof m === 'string') {
            return true
          }
          return true // 显示所有模型，不检查是否启用
        })

        // 如果 chatOnly 为 true，只显示对话模型
        if (chatOnly) {
          models = models.filter((m: unknown) => {
            if (typeof m === 'string') {
              return true
            }
            const purpose = (m as { purpose?: string }).purpose
            return purpose === 'chat' || !purpose
          })
        }

        return {
          id,
          name: PROVIDER_NAMES[id] || id,
          models
        }
      })
      .filter(p => p.models.length > 0)
  }, [providers, chatOnly])

  const filteredProviders = React.useMemo(() => {
    if (!searchQuery) return enabledProviders
    
    return enabledProviders.map(p => ({
      ...p,
      models: p.models.filter(m => 
        (m.name || m.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(p => p.models.length > 0)
  }, [enabledProviders, searchQuery])

  const selectedModelInfo = React.useMemo(() => {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-xs font-normal"
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
                <span className="truncate flex-1 text-left">{selectedModelInfo.model.name || selectedModelInfo.model.id}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
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
          className="h-[250px] overflow-y-auto overscroll-contain [&>*]:touch-action-pan-y"
          style={{ 
            touchAction: 'pan-y', 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            // 允许触摸滚动
            const target = e.currentTarget;
            if (target.scrollHeight > target.clientHeight) {
              // 只有在内容可以滚动时才阻止默认行为
              e.stopPropagation();
            }
          }}
          onTouchMove={(e) => {
            // 允许触摸滚动
            const target = e.currentTarget;
            if (target.scrollHeight > target.clientHeight) {
              e.stopPropagation();
            }
          }}
        >
          {filteredProviders.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">{t("modelPicker.noModels") as string || "暂无可用模型"}</div>
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
                          "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-[var(--radius-sm)] transition-colors hover:bg-muted",
                          (value === `${provider.id}:${model.id}` || value === model.id) ? "bg-muted font-medium" : "text-foreground"
                        )}
                        onClick={() => {
                          onValueChange(`${provider.id}:${model.id}`)
                          setOpen(false)
                        }}
                      >
                        <div className={cn(
                          "flex items-center justify-center shrink-0 w-5 h-5 overflow-visible",
                          value === model.id && "[&_svg]:text-[#2563eb] dark:[&_svg]:text-[#60a5fa]"
                        )}>
                          <ModelIcon
                            provider={provider.id}
                            model={model.id}
                            avatar={model.avatar}
                            size={16}
                            variant="color"
                          />
                        </div>
                        <span className={cn(
                          "truncate flex-1 text-left",
                          value === model.id ? "text-[#2563eb] dark:text-[#60a5fa]" : "text-foreground"
                        )}>{model.name || model.id}</span>
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
