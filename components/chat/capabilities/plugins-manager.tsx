"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Puzzle } from "lucide-react"
import * as Icons from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AddMcpPluginDialog } from "../settings/add-mcp-plugin-dialog"

interface McpPlugin {
  id: string
  name: string
  icon: string | null
  serverUrl: string
  authType: string
  advancedConfig: {
    keyValuePairs?: Record<string, string>
    ignoreSSL?: boolean
  }
  createdAt: string
  updatedAt: string
}

export function PluginsManager() {
  const { t } = useI18n()
  const [plugins, setPlugins] = useState<McpPlugin[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPlugin, setEditingPlugin] = useState<McpPlugin | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pluginToDelete, setPluginToDelete] = useState<string | null>(null)
  
  // 测试相关状态 (保留供将来使用)
  const [selectedTestPluginId, setSelectedTestPluginId] = useState<string>("")
  const [, setTestResult] = useState<unknown>(null)

  useEffect(() => {
    fetchPlugins()
  }, [])

  const fetchPlugins = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/mcp/plugins")
      if (response.ok) {
        const data = await response.json()
        setPlugins(data || [])
      }
    } catch (error) {
      console.error("Failed to fetch plugins:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!pluginToDelete) return

    try {
      const response = await fetch(`/api/mcp/plugins/${pluginToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setPlugins((prev) => prev.filter((p) => p.id !== pluginToDelete))
        if (pluginToDelete === selectedTestPluginId) {
          setSelectedTestPluginId("")
          setTestResult(null)
        }
      }
    } catch (error) {
      console.error("Failed to delete plugin:", error)
    } finally {
      setDeleteDialogOpen(false)
      setPluginToDelete(null)
    }
  }

  const handleEdit = (plugin: McpPlugin) => {
    setEditingPlugin(plugin)
    setIsAddDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingPlugin(null)
    setIsAddDialogOpen(true)
  }

  // handleTestConnection 函数已移除 - 测试功能将在未来版本中实现

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.serverUrl.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-[80%] flex flex-col">
          {/* 顶部操作栏 */}
          <div className="pt-2 h-8 flex gap-2 items-center shrink-0">
            <div className="relative flex-1 h-full flex items-center">
              <Search
                className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2"
                strokeWidth={1.5}
              />
              <Input
                placeholder={t("capabilities.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted/30 border rounded-md text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] pl-8 shadow-none"
              />
            </div>
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-1.5 px-2 h-7 min-h-[28px] text-xs rounded-md">
              <Plus className="h-3.5 w-3.5" />
              {t("capabilities.addPlugin")}
            </Button>
          </div>

          {/* 三栏布局展示插件 */}
          <div className="flex-1 overflow-y-auto pb-6 pt-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">{t("common.loading")}</div>
        ) : filteredPlugins.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
            <Puzzle className="h-8 w-8 opacity-20" />
            <p className="text-xs">{t("capabilities.noPlugins")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredPlugins.map((plugin) => {
              const IconComponent = plugin.icon && plugin.icon.length > 2 ? (Icons as any)[plugin.icon] : null
              return (
                <div
                  key={plugin.id}
                  onClick={() => handleEdit(plugin)}
                  className="group relative flex flex-col gap-2 p-4 rounded-md bg-muted/50 hover:bg-muted dark:bg-card/50 dark:hover:bg-card transition-all border border-border/50 dark:border-border/50 hover:border-border dark:hover:border-border cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {IconComponent ? (
                        <IconComponent className="h-3.5 w-3.5 text-primary" />
                      ) : plugin.icon ? (
                        <span className="text-sm">{plugin.icon}</span>
                      ) : (
                        <Puzzle className="h-3.5 w-3.5 text-primary" />
                      )}
                      <h3 className="font-medium text-sm flex-1 line-clamp-2 leading-7">{plugin.name}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPluginToDelete(plugin.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{plugin.serverUrl}</p>
                </div>
              )
            })}
          </div>
        )}
          </div>
        </div>
      </div>

      <AddMcpPluginDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setEditingPlugin(null)
          }
        }}
        onSuccess={() => {
          fetchPlugins()
          setEditingPlugin(null)
        }}
        editingPlugin={editingPlugin}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("mcp.deletePlugin")}
        description={t("mcp.deletePluginDesc")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
