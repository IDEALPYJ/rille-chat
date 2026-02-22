"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ChevronDown, ChevronUp, Plus, X, Loader2, Puzzle, TestTube, Check } from "lucide-react"
import * as Icons from "lucide-react"
import { AlertToast } from "@/components/ui/alert-toast"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface KeyValuePair {
  key: string
  value: string
}

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

interface AddMcpPluginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editingPlugin?: McpPlugin | null
}

export function AddMcpPluginDialog({
  open,
  onOpenChange,
  onSuccess,
  editingPlugin
}: AddMcpPluginDialogProps) {
  const { t } = useI18n()
  const [name, setName] = React.useState("")
  const [icon, setIcon] = React.useState("")
  const [serverUrl, setServerUrl] = React.useState("")
  const [authType, setAuthType] = React.useState<"none" | "apiKey">("none")
  const [apiKey, setApiKey] = React.useState("")
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [keyValuePairs, setKeyValuePairs] = React.useState<KeyValuePair[]>([
    { key: "", value: "" }
  ])
  const [ignoreSSL, setIgnoreSSL] = React.useState(false)
  const [iconPopoverOpen, setIconPopoverOpen] = React.useState(false)

  // 动态获取图标组件
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
    return IconComponent || Puzzle
  }

  // 获取当前选中的图标组件
  const SelectedIcon = icon ? getIconComponent(icon) : Puzzle

  // 当编辑插件或对话框打开时，初始化表单
  React.useEffect(() => {
    if (open && editingPlugin) {
      setName(editingPlugin.name || "")
      setIcon(editingPlugin.icon || "")
      setServerUrl(editingPlugin.serverUrl || "")
      setAuthType((editingPlugin.authType as "none" | "apiKey") || "none")
      setApiKey("") // 安全考虑：编辑时不显示原有API Key
      setIgnoreSSL(editingPlugin.advancedConfig?.ignoreSSL || false)
      
      // 初始化键值对
      const pairs = editingPlugin.advancedConfig?.keyValuePairs
      if (pairs && Object.keys(pairs).length > 0) {
        setKeyValuePairs(
          Object.entries(pairs).map(([key, value]) => ({ key, value }))
        )
        setShowAdvanced(true)
      } else {
        setKeyValuePairs([{ key: "", value: "" }])
      }
    }
  }, [open, editingPlugin])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [alertMessage, setAlertMessage] = React.useState("")
  const [isTesting, setIsTesting] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    success: boolean
    message: string
    duration?: number
    toolCount?: number
  } | null>(null)

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      setAlertMessage(t("mcpDialog.enterServerUrl"))
      setAlertOpen(true)
      return
    }

    if (authType === "apiKey" && !apiKey.trim()) {
      setAlertMessage(t("mcpDialog.enterApiKey"))
      setAlertOpen(true)
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      // 过滤掉空的键值对
      const filteredPairs = keyValuePairs.filter(pair => pair.key.trim() && pair.value.trim())
      const keyValueObj: Record<string, string> = {}
      filteredPairs.forEach(pair => {
        keyValueObj[pair.key.trim()] = pair.value.trim()
      })

      const response = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: serverUrl.trim(),
          authType,
          apiKey: authType === "apiKey" ? apiKey.trim() : null,
          advancedConfig: {
            keyValuePairs: keyValueObj,
            ignoreSSL: ignoreSSL
          }
        })
      })

      let result: { success?: boolean; message?: string; duration?: number; toolCount?: number; translationKey?: string; translationParams?: Record<string, unknown> }
      try {
        result = await response.json()
      } catch {
        const text = await response.text()
        throw new Error(`${t("mcpDialog.invalidResponse")}: ${text.substring(0, 200)}`)
      }

      if (!response.ok && !result.message) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // 处理翻译键
      if (result.translationKey) {
        result.message = t(result.translationKey as any, result.translationParams as Record<string, string | number>)
      }

      setTestResult(result as { success: boolean; message: string; duration?: number; toolCount?: number })
    } catch (error: unknown) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : t("mcpDialog.testFailed"),
        duration: 0
      })
    } finally {
      setIsTesting(false)
    }
  }

  const resetForm = () => {
    if (!editingPlugin) {
      setName("")
      setIcon("")
      setServerUrl("")
      setAuthType("none")
      setApiKey("")
      setShowAdvanced(false)
      setKeyValuePairs([{ key: "", value: "" }])
      setIgnoreSSL(false)
      setTestResult(null)
    }
  }



  const handleAddKeyValue = () => {
    setKeyValuePairs([...keyValuePairs, { key: "", value: "" }])
  }

  const handleRemoveKeyValue = (index: number) => {
    if (keyValuePairs.length > 1) {
      setKeyValuePairs(keyValuePairs.filter((_, i) => i !== index))
    }
  }

  const handleKeyValueChange = (index: number, field: "key" | "value", value: string) => {
    const newPairs = [...keyValuePairs]
    newPairs[index][field] = value
    setKeyValuePairs(newPairs)
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setAlertMessage(t("mcpDialog.enterPluginName"))
      setAlertOpen(true)
      return
    }
    if (!serverUrl.trim()) {
      setAlertMessage(t("mcpDialog.enterServerUrlRequired"))
      setAlertOpen(true)
      return
    }

    if (authType === "apiKey" && !apiKey.trim()) {
      setAlertMessage(t("mcpDialog.enterApiKeyRequired"))
      setAlertOpen(true)
      return
    }

    setIsSubmitting(true)
    try {
      // 过滤掉空的键值对
      const filteredPairs = keyValuePairs.filter(pair => pair.key.trim() && pair.value.trim())
      const keyValueObj: Record<string, string> = {}
      filteredPairs.forEach(pair => {
        keyValueObj[pair.key.trim()] = pair.value.trim()
      })

      const requestBody = {
        name: name.trim(),
        icon: icon.trim() || null,
        serverUrl: serverUrl.trim(),
        authType,
        apiKey: authType === "apiKey" && apiKey.trim() ? apiKey.trim() : undefined,
        advancedConfig: {
          keyValuePairs: keyValueObj,
          ignoreSSL: ignoreSSL
        }
      }

      // 如果是编辑模式，使用PATCH请求；否则使用POST请求
      const url = editingPlugin 
        ? `/api/mcp/plugins/${editingPlugin.id}`
        : "/api/mcp/plugins"
      const method = editingPlugin ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const data = await response.json()
        // 处理翻译键
        const errorMessage = data.translationKey 
          ? t(data.translationKey, data.translationParams)
          : (data.error || (editingPlugin ? t("mcpApi.updatePluginFailed") : t("mcpApi.createPluginFailed")))
        throw new Error(errorMessage)
      }

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      setAlertMessage(error.message || (editingPlugin ? "更新插件失败" : "创建插件失败"))
      setAlertOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => {
        onOpenChange(val)
        if (!val) {
          resetForm()
        }
      }}>
        <DialogContent 
          className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
          overlayClassName="bg-background/60 backdrop-blur-sm"
        >
          <DialogHeader>
            <DialogTitle>{editingPlugin ? t("mcpDialog.editPlugin") : t("mcpDialog.addPlugin")}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
            {/* 插件图标 - 与名称在同一行 */}
            <div className="space-y-2">
              <Label>{t("mcpDialog.pluginNameRequired")}</Label>
              <div className="flex gap-2">
                {/* 图标选择器 - 移到左侧，无边框 */}
                <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <SelectedIcon className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2" align="start" onWheel={(e) => e.stopPropagation()}>
                    <div
                      className="h-[240px] overflow-y-auto overflow-x-hidden pr-2"
                      style={{ overscrollBehavior: 'contain' }}
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {["Puzzle", "Zap", "Cpu", "Database", "Server", "Cloud", "Globe", "Link", "Webhook", "Code", "Terminal", "Box", "Package", "Layers", "Bot", "Workflow", "FunctionSquare", "Blocks", "Cable", "EthernetPort", "Network", "Radio", "Satellite", "Antenna", "Radar", "ScanLine", "Scan", "Fingerprint", "KeyRound", "LockKeyhole", "UnlockKeyhole", "ShieldCheck", "ShieldAlert", "ShieldX", "ShieldQuestion", "ShieldOff", "ShieldEllipsis", "ShieldBan", "ShieldPlus", "ShieldMinus", "ShieldUser", "ShieldHalf"].map((iconName) => {
                          const IconComponent = (Icons as any)[iconName]
                          if (!IconComponent) return null
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => {
                                setIcon(icon === iconName ? "" : iconName)
                                setIconPopoverOpen(false)
                              }}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer",
                                icon === iconName && "bg-primary/10 ring-1 ring-primary"
                              )}
                              title={iconName}
                            >
                              <IconComponent className="h-4 w-4 text-foreground" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("mcpDialog.pluginNamePlaceholder")}
                  className="flex-1 h-7 min-h-[28px] text-xs" />
              </div>
            </div>

            {/* 服务器地址 */}
            <div className="space-y-2">
              <Label htmlFor="serverUrl">{t("mcpDialog.serverUrlRequired")}</Label>
              <Input
                id="serverUrl"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder={t("mcpDialog.serverUrlPlaceholder")}
                className="h-7 min-h-[28px] text-xs" />
            </div>

            {/* 认证类型和API Key */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="w-[140px] space-y-2">
                  <Label htmlFor="authType">{t("mcpDialog.authType")}</Label>
                  <Select value={authType} onValueChange={(val: "none" | "apiKey") => setAuthType(val)}>
                    <SelectTrigger className="w-[140px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="none" className="text-xs h-7 rounded-md">{t("mcpDialog.none")}</SelectItem>
                      <SelectItem value="apiKey" className="text-xs h-7 rounded-md">{t("mcpDialog.apiKey")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {authType === "apiKey" && (
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="apiKey">{t("mcpDialog.apiKey")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t("search.placeholder") + " " + t("mcpDialog.apiKey")}
                      className="h-7 min-h-[28px] text-xs" />
                  </div>
                )}
              </div>
            </div>

            {/* 连接测试 */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {/* 左侧：测试结果显示 */}
                <div className="flex-1 min-h-[40px] flex items-center px-4">
                  {isTesting ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      <span>{t("mcpDialog.testing")}...</span>
                    </div>
                  ) : testResult ? (
                    <div className={`flex items-center gap-2 text-xs ${
                      testResult.success
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {testResult.success ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      ) : (
                        <span className="h-3.5 w-3.5 flex items-center justify-center">✕</span>
                      )}
                      <div className="flex flex-col">
                        <span>{testResult.message}</span>
                        {testResult.duration && (
                          <span className="text-xs text-muted-foreground">
                            {t("common.duration")}: {testResult.duration}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {t("mcpDialog.testResultPlaceholder")}
                    </div>
                  )}
                </div>
                {/* 右侧：测试按钮 */}
                <div className="flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTesting || !serverUrl.trim() || (authType === "apiKey" && !apiKey.trim())}
                    className="h-7 px-3 text-xs rounded-md"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" strokeWidth={1.5} />
                        {t("mcpDialog.testing")}
                      </>
                    ) : (
                      <>
                        <TestTube className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                        {t("mcpDialog.testConnection")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 高级设置 */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full h-7 px-3 rounded-md border border-border bg-transparent hover:bg-muted transition-colors"
              >
                <span className="text-xs font-normal">{t("mcpDialog.advancedSettings")}</span>
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
              </button>

              {showAdvanced && (
                <div className="space-y-4 p-4 border border-border rounded-md bg-muted/30">
                  {/* Key-Value 编辑器 */}
                  <div className="space-y-2">
                    <Label>{t("mcpDialog.customConfig")}</Label>
                    <div className="space-y-2">
                      {keyValuePairs.map((pair, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={pair.key}
                            onChange={(e) => handleKeyValueChange(index, "key", e.target.value)}
                            placeholder={t("mcpDialog.key")}
                            className="flex-1 h-7 min-h-[28px] text-xs" />
                          <Input
                            value={pair.value}
                            onChange={(e) => handleKeyValueChange(index, "value", e.target.value)}
                            placeholder={t("mcpDialog.value")}
                            className="flex-1 h-7 min-h-[28px] text-xs" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveKeyValue(index)}
                            disabled={keyValuePairs.length === 1}
                            className="h-7 w-7 p-0 rounded-md"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddKeyValue}
                        className="h-7 px-3 text-xs rounded-md"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
                        {t("mcpDialog.addKeyValue")}
                      </Button>
                    </div>
                  </div>

                  {/* 忽略SSL证书 */}
                  <div className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/30">
                    <div className="space-y-0.5">
                      <p className="text-xs font-normal">{t("mcpDialog.ignoreSSL")}</p>
                      <p className="text-xs text-muted-foreground">{t("mcpDialog.ignoreSSLDesc")}</p>
                    </div>
                    <Switch
                      checked={ignoreSSL}
                      onCheckedChange={setIgnoreSSL}
                      className="h-4 w-7"
                    />
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim() || !serverUrl.trim() || (authType === "apiKey" && !apiKey.trim())}
              className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" strokeWidth={1.5} />
                  {t("mcpDialog.saving")}
                </>
              ) : (
                t("mcpDialog.save")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        message={alertMessage}
      />
    </>
  )
}

