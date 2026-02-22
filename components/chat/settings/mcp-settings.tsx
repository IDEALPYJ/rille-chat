"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Plus, Puzzle, Check, Loader2, Trash2, Edit2, TestTube, ChevronLeft, RefreshCcw } from "lucide-react"
import { SettingsState } from "./types"
import { AddMcpPluginDialog } from "./add-mcp-plugin-dialog"
import { useI18n } from "@/lib/i18n/context"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AlertToast } from "@/components/ui/alert-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

interface MCPSettingsProps {
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function MCPSettings({
  saveStatus,
  onSave,
  onBack
}: MCPSettingsProps) {
  const { t } = useI18n()
  const [mcpPlugins, setMcpPlugins] = React.useState<McpPlugin[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [pluginToDelete, setPluginToDelete] = React.useState<string | null>(null)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [alertMessage, setAlertMessage] = React.useState("")
  const [editingPlugin, setEditingPlugin] = React.useState<McpPlugin | null>(null)
  
  // 连通性测试相关状态
  const [selectedTestPluginId, setSelectedTestPluginId] = React.useState<string>("")
  const [isTesting, setIsTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    success: boolean
    message: string
    duration?: number
    toolCount?: number
  } | null>(null)

  const fetchPlugins = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/mcp/plugins")
      if (!response.ok) {
        throw new Error(t("mcp.getPluginsFailed"))
      }
      const data = await response.json()
      setMcpPlugins(data)
    } catch (error: any) {
      setAlertMessage(error.message || t("mcp.getPluginsFailed"))
      setAlertOpen(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPlugins()
  }, [fetchPlugins])

  const handleDelete = async () => {
    if (!pluginToDelete) return

    try {
      const response = await fetch(`/api/mcp/plugins/${pluginToDelete}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        // 处理翻译键
        const errorMessage = data.translationKey 
          ? t(data.translationKey, data.translationParams)
          : (data.error || t("mcp.deletePluginFailed"))
        throw new Error(errorMessage)
      }

      setDeleteDialogOpen(false)
      setPluginToDelete(null)
      fetchPlugins()
      
      // 如果删除的是正在测试的插件，清空测试状态
      if (pluginToDelete === selectedTestPluginId) {
        setSelectedTestPluginId("")
        setTestResult(null)
      }
    } catch (error: any) {
      setAlertMessage(error.message || t("mcp.deletePluginFailed"))
      setAlertOpen(true)
    }
  }

  const handleTestConnection = async () => {
    if (!selectedTestPluginId) {
      setAlertMessage(t("mcp.selectPluginFirst"))
      setAlertOpen(true)
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`/api/mcp/plugins/${selectedTestPluginId}/test`, {
        method: "POST"
      })

      let result: any
      try {
        result = await response.json()
      } catch {
        // 如果响应不是JSON，尝试获取文本
        const text = await response.text()
        throw new Error(`${t("mcp.invalidResponse")}: ${text.substring(0, 200)}`)
      }

      // 即使响应状态码不是200，也尝试使用返回的JSON数据
      if (!response.ok && !result.message) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // 处理翻译键
      if (result.translationKey) {
        result.message = t(result.translationKey, result.translationParams)
      }

      setTestResult(result)
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || t("mcp.testFailed"),
        duration: 0
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <>
      <div className="w-full overflow-y-auto">
        <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-8">
          <div className="h-14 border-b flex items-center gap-2 px-5 md:px-0 shrink-0 mb-6 md:mb-6">
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
                <Puzzle className="h-5 w-5 text-foreground dark:text-foreground/70" />
              </div>
              <h2 className="text-xl font-bold">{t("mcp.title")}</h2>
            </div>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <div className="space-y-8">
            {/* MCP 插件管理 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{t("mcp.plugins")}</h3>
                </div>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  size="sm"
                  className="h-8 text-xs gap-2 bg-zinc-900 dark:!bg-[#ffffff] text-white dark:!text-[#000000] hover:bg-zinc-800 dark:hover:!bg-[#f5f5f5] [&_svg]:dark:!text-[#000000] border-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  添加插件
                </Button>
              </div>
              
              <div className="p-4 rounded-xl border bg-card/50">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : mcpPlugins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Puzzle className="h-12 w-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                    <h4 className="text-sm font-medium text-foreground dark:text-foreground mb-2">
                      {t("mcp.noPlugins")}
                    </h4>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mcpPlugins.map((plugin) => (
                      <div
                        key={plugin.id}
                        className="p-4 border rounded-lg bg-card/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {plugin.icon && (
                                <span className="text-lg shrink-0">{plugin.icon}</span>
                              )}
                              <h4 className="text-sm font-medium text-foreground dark:text-foreground truncate">
                                {plugin.name}
                              </h4>
                            </div>
                            <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                              {plugin.serverUrl}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs px-2 py-0.5 rounded bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground">
                                {plugin.authType === "apiKey" ? t("mcp.apiKey") : t("mcp.noAuth")}
                              </span>
                              {plugin.advancedConfig?.ignoreSSL && (
                                <span className="text-xs px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                  {t("mcp.ignoreSSL")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingPlugin(plugin)
                                setShowAddDialog(true)
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => {
                                setPluginToDelete(plugin.id)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 连通性测试 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TestTube className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t("mcp.connectivityTest")}</h3>
              </div>
              
              <div className="p-4 rounded-xl border bg-card/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {/* 左侧：下拉菜单（占剩余空间） */}
                    <div className="flex-1">
                      <Select
                        value={selectedTestPluginId}
                        onValueChange={setSelectedTestPluginId}
                        disabled={isLoading || mcpPlugins.length === 0}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("mcp.selectPlugin")} />
                        </SelectTrigger>
                        <SelectContent>
                          {mcpPlugins.map((plugin) => (
                            <SelectItem key={plugin.id} value={plugin.id}>
                              <div className="flex items-center gap-2">
                                {plugin.icon && (
                                  <span className="text-sm">{plugin.icon}</span>
                                )}
                                <span>{plugin.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 右侧：测试按钮 */}
                    <div className="flex-shrink-0">
                      <Button
                        onClick={handleTestConnection}
                        disabled={!selectedTestPluginId || isTesting || isLoading || mcpPlugins.length === 0}
                        size="sm"
                        className="h-8 px-3 text-xs gap-2 bg-zinc-900 dark:!bg-[#ffffff] text-white dark:!text-[#000000] hover:bg-zinc-800 dark:hover:!bg-[#f5f5f5] [&_svg]:dark:!text-[#000000] border-0 disabled:opacity-50"
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="hidden md:inline">{t("mcp.testing")}</span>
                          </>
                        ) : (
                          <>
                            <TestTube className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t("mcp.testConnection")}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* 测试结果显示在下方 */}
                  {(isTesting || testResult) && (
                    <div className="flex items-center px-4 py-2">
                      {isTesting ? (
                        <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t("mcp.testing")}</span>
                        </div>
                      ) : testResult ? (
                        <div className={`flex items-center gap-2 text-sm ${
                          testResult.success
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {testResult.success ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span className="h-4 w-4 flex items-center justify-center">✕</span>
                          )}
                          <div className="flex flex-col">
                            <span>{testResult.message}</span>
                            {testResult.duration && (
                              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                                {t("mcp.duration")}: {testResult.duration}ms
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddMcpPluginDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
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
        onConfirm={handleDelete}
      />

      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        message={alertMessage}
      />
    </>
  )
}

