"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Puzzle, Check } from "lucide-react"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface McpPlugin {
  id: string
  name: string
  icon: string | null
  serverUrl: string
  authType: string
  enabled?: boolean // 在当前会话中是否启用
}

interface McpPluginPickerProps {
  sessionId: string | null
  children: React.ReactNode
  onSessionCreated?: (newSessionId: string) => void // 当创建新会话时的回调
  onOpenChange?: (open: boolean) => void // 当对话框打开状态变化时的回调
}

export function McpPluginPicker({ sessionId, children, onSessionCreated, onOpenChange }: McpPluginPickerProps) {
  const { t } = useI18n()
  const [plugins, setPlugins] = React.useState<McpPlugin[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  // 动态获取图标组件
  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return Puzzle
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
    return IconComponent || Puzzle
  }

  // 处理对话框打开状态变化
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    onOpenChange?.(newOpen)
  }, [onOpenChange])

  // 获取所有插件和全局启用状态
  const fetchPlugins = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // 获取所有插件
      const pluginsRes = await fetch("/api/mcp/plugins")
      if (!pluginsRes.ok) {
        throw new Error(t("mcp.pluginPicker.getPluginsFailed"))
      }
      const allPlugins = await pluginsRes.json()

      // 获取全局启用的插件ID列表
      const enabledRes = await fetch("/api/mcp/plugins/enabled")
      if (!enabledRes.ok) {
        throw new Error(t("mcp.pluginPicker.getEnabledStatusFailed"))
      }
      const enabledData = await enabledRes.json()
      const enabledPluginIds = new Set(enabledData.enabledPluginIds || [])

      // 合并数据
      const pluginsWithEnabled = allPlugins.map((plugin: McpPlugin) => ({
        ...plugin,
        enabled: enabledPluginIds.has(plugin.id)
      }))

      setPlugins(pluginsWithEnabled)
    } catch (error) {
      console.error("[McpPluginPicker] Failed to fetch plugins:", error)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  // 当 popover 打开时获取数据
  React.useEffect(() => {
    if (open) {
      fetchPlugins()
    }
  }, [open, fetchPlugins])

  // 切换插件启用状态
  const handleToggle = async (pluginId: string, checked: boolean) => {
    try {
      // 乐观更新UI
      setPlugins(prev => prev.map(p =>
        p.id === pluginId ? { ...p, enabled: checked } : p
      ))

      // 调用API更新全局启用状态
      const response = await fetch("/api/mcp/plugins/enabled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginId, enabled: checked }),
      })

      if (!response.ok) {
        throw new Error(t("mcp.pluginPicker.updateFailed"))
      }

      // 如果当前有sessionId，也需要更新会话级别的启用状态
      if (sessionId) {
        const sessionResponse = await fetch(`/api/sessions/${sessionId}/mcp-plugins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pluginId, enabled: checked }),
        })

        if (!sessionResponse.ok) {
          console.error("[McpPluginPicker] Failed to update session plugin status")
        }
      } else if (checked && onSessionCreated) {
        // 如果没有sessionId但启用了插件，需要创建新会话
        // 这个逻辑由父组件处理
      }
    } catch (error) {
      console.error("[McpPluginPicker] Failed to toggle plugin:", error)
      // 回滚UI状态
      setPlugins(prev => prev.map(p =>
        p.id === pluginId ? { ...p, enabled: !checked } : p
      ))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div onClick={() => handleOpenChange(true)}>{children}</div>
      <DialogContent
        className="sm:max-w-[600px] h-[60vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-[var(--radius-lg)]"
        overlayClassName="bg-background/80 backdrop-blur-sm"
      >
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>{t("mcp.pluginPicker.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
              <Puzzle className="h-8 w-8 opacity-20" />
              <p>{t("mcp.pluginPicker.noPlugins")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plugins.map((plugin) => (
                <div
                  key={plugin.id}
                  onClick={() => handleToggle(plugin.id, !plugin.enabled)}
                  className={cn(
                    "group border rounded-md p-3 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer relative flex items-center gap-2",
                    plugin.enabled
                      ? "border-primary/50 bg-primary/5"
                      : "bg-card/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      plugin.enabled
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    )}
                  >
                    {plugin.enabled && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  {(() => {
                    const IconComponent = getIconComponent(plugin.icon)
                    return <IconComponent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  })()}
                  <h3 className="font-medium text-sm truncate flex-1">
                    {plugin.name}
                  </h3>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
