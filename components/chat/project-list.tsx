"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import * as Icons from "lucide-react"
import {
  Plus, FolderKanban, Loader2, MoreHorizontal, Trash2, Pencil, Search
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { ModelPicker } from "@/components/chat/settings/model-picker"
import type { ProviderConfig } from "@/components/chat/settings/types"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { getVectorDimensionsConfig } from "@/components/chat/settings/vector-constants"

interface Project {
  id: string
  name: string
  icon?: string
  description?: string
  memoryIsolated: boolean
  embeddingEnabled?: boolean
  embeddingModelId?: string
  embeddingDimensions?: number
  createdAt: string
  updatedAt: string
}

// 图标映射常量 - 移到组件外部避免重复创建
const ICON_MAPPING: Record<string, string> = {
  "folder-kanban": "FolderKanban",
  "briefcase": "Briefcase",
  "code": "Code",
  "graduation-cap": "GraduationCap",
  "heart": "Heart",
  "rocket": "Rocket",
  "smile": "Smile",
  "anchor": "Anchor",
  "book": "Book",
  "camera": "Camera",
  "coffee": "Coffee",
  "cpu": "Cpu",
  "database": "Database",
  "flag": "Flag",
  "gift": "Gift",
  "globe": "Globe",
  "home": "Home",
  "image": "Image",
  "key": "Key",
  "lamp": "Lamp",
  "music": "Music",
  "palette": "Palette",
  "phone": "Phone",
  "search": "Search",
  "send": "Send",
  "shield": "Shield",
  "star": "Star",
  "sun": "Sun",
  "tag": "Tag",
  "terminal": "Terminal",
}

// 常用 Lucide 图标列表（与技能对话框、提示词对话框保持一致）
const COMMON_ICONS = [
  "FileText", "File", "Files", "Folder", "FolderOpen", "FileCode", "FileJson",
  "Search", "Filter", "Eye", "EyeOff",
  "Settings", "Cog", "SlidersHorizontal", "Wrench",
  "Zap", "Lightbulb", "Sparkles", "Star", "Heart",
  "Rocket", "Plane", "Target", "Flag",
  "Palette", "Brush", "Pencil",
  "Monitor", "Laptop", "Smartphone", "Cpu", "Database",
  "Mail", "Inbox", "Send", "MessageSquare",
  "Calendar", "Clock", "Timer", "Bell",
  "Bookmark", "Book", "BookOpen",
  "User", "Users",
  "Lock", "Unlock", "Key", "Shield",
  "Home", "Building",
  "Map", "MapPin", "Globe",
  "Image", "Camera", "Video", "Music",
  "BarChart", "PieChart", "LineChart",
  "Calculator", "CreditCard", "Wallet",
  "ShoppingCart", "Package",
  "Cloud", "CloudRain", "Sun", "Moon",
  "Clipboard", "ClipboardList",
  "Link",
  "Trash2",
  "Check", "CheckCircle",
  "Plus", "PlusCircle",
  "AlertCircle", "Info",
  "Layout", "LayoutGrid",
  "List",
  "Table",
  "Type",
  "Code", "Code2", "Terminal",
  "Bug", "Beaker",
  "Gamepad", "Puzzle",
  "Brain",
  "Coffee"
]

// 动态获取图标组件
function getIconComponent(iconName: string) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[iconName]
  return IconComponent || Icons.FolderKanban
}

export function ProjectList() {
  const { t } = useI18n()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Form state
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectIcon, setNewProjectIcon] = useState("FolderKanban")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [isMemoryGlobal, setIsMemoryGlobal] = useState(true)
  const [embeddingEnabled, setEmbeddingEnabled] = useState(false)
  const [embeddingModelId, setEmbeddingModelId] = useState<string>("")
  const [embeddingDimensions, setEmbeddingDimensions] = useState<number | null>(null)
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false)

  // Settings for embedding model picker
  const [userSettings, setUserSettings] = useState<any>(null)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (_error) {
      console.error("加载项目失败:", _error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Fetch user settings for embedding models
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/user/settings")
      if (res.ok) {
        const data = await res.json()
        setUserSettings(data)
      }
    } catch (_error) {
      console.error("获取设置失败:", _error)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // 监听设置更新事件
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchSettings()
    }
    window.addEventListener("settings-updated", handleSettingsUpdate)
    return () => window.removeEventListener("settings-updated", handleSettingsUpdate)
  }, [fetchSettings])

  // Get embedding models from vectorProviders settings
  const embeddingModels = useMemo(() => {
    if (!userSettings?.vectorProviders) return {}
    
    const providers: Record<string, ProviderConfig> = {}
    Object.entries(userSettings.vectorProviders).forEach(([id, config]: [string, any]) => {
      if (!config.enabled) return
      
      // 只使用已启用的模型
      const models = (config.models || []).filter((m: any) => {
        if (typeof m === 'string') return false // 字符串类型不保留，需要完整配置
        return m.enabled === true
      })
      
      if (models.length > 0) {
        providers[id] = {
          enabled: true,
          models,
          apiKey: "",
          baseURL: "",
          checkModel: "",
        } as any
      }
    })
    
    return providers
  }, [userSettings])

  // 获取所有embedding模型的维度配置
  const vectorDimensionsConfig = useMemo(() => getVectorDimensionsConfig(), [])

  // 获取当前选中模型支持的维度
  const currentModelDimensions = useMemo(() => {
    if (!embeddingModelId) return null
    return vectorDimensionsConfig[embeddingModelId] || null
  }, [embeddingModelId, vectorDimensionsConfig])

  // 当选择模型时，自动设置默认维度
  const handleEmbeddingModelChange = (fullModelId: string) => {
    // fullModelId 格式为 "provider:model"，需要提取 model 部分
    const modelId = parseEmbeddingModelId(fullModelId)
    setEmbeddingModelId(modelId)
    const config = vectorDimensionsConfig[modelId]
    if (config) {
      setEmbeddingDimensions(config.default)
    } else {
      setEmbeddingDimensions(null)
    }
  }

  // Parse embeddingModelId from "provider:model" format to just model id
  const parseEmbeddingModelId = (modelId: string | undefined): string => {
    if (!modelId) return ""
    if (modelId.includes(":")) {
      return modelId.split(":")[1]
    }
    return modelId
  }

  // Parse provider from "provider:model" format
  const parseEmbeddingProviderId = (modelId: string | undefined): string => {
    if (!modelId) return ""
    if (modelId.includes(":")) {
      return modelId.split(":")[0]
    }
    return ""
  }

  // Get provider from embeddingModelId (保留供将来使用)
  void embeddingModels;

  // Format model id to "provider:model" format
  const formatEmbeddingModelId = (providerId: string, modelId: string): string => {
    return `${providerId}:${modelId}`
  }

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isDialogOpen && !isEditDialogOpen) {
      setNewProjectName("")
      setNewProjectIcon("FolderKanban")
      setNewProjectDescription("")
      setIsMemoryGlobal(true)
      setEmbeddingEnabled(false)
      setEmbeddingModelId("")
      setEmbeddingDimensions(null)
      setEditingProject(null)
      setIconPopoverOpen(false)
    }
  }, [isDialogOpen, isEditDialogOpen])

  // Load editing project data
  useEffect(() => {
    if (editingProject && isEditDialogOpen) {
      setNewProjectName(editingProject.name)
      // 使用外部定义的 ICON_MAPPING 映射图标
      const mappedIcon = editingProject.icon ? (ICON_MAPPING[editingProject.icon] || editingProject.icon) : "FolderKanban"
      setNewProjectIcon(mappedIcon)
      setNewProjectDescription(editingProject.description || "")
      setIsMemoryGlobal(!editingProject.memoryIsolated)
      setEmbeddingEnabled(editingProject.embeddingEnabled || false)
      // Parse embeddingModelId from "provider:model" format
      const parsedModelId = parseEmbeddingModelId(editingProject.embeddingModelId)
      setEmbeddingModelId(parsedModelId)
      // 加载已保存的维度或使用默认维度
      if (parsedModelId && vectorDimensionsConfig[parsedModelId]) {
        setEmbeddingDimensions(editingProject.embeddingDimensions || vectorDimensionsConfig[parsedModelId].default)
      } else {
        setEmbeddingDimensions(null)
      }
    }
  }, [editingProject, isEditDialogOpen, vectorDimensionsConfig])

  const handleCreateProject = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newProjectName.trim()) return

    setIsCreating(true)
    try {
      // Format embeddingModelId to "provider:model" format and check if multimodal
      let formattedEmbeddingModelId: string | undefined = undefined
      if (embeddingEnabled && embeddingModelId) {
        // Find provider for the model
        let providerId = ""
        let foundModel: any = null
        for (const [pid, provider] of Object.entries(embeddingModels)) {
          const model = provider.models.find((m: any) => m.id === embeddingModelId)
          if (model) {
            providerId = pid
            foundModel = model
            break
          }
        }
        if (providerId && foundModel) {
          formattedEmbeddingModelId = formatEmbeddingModelId(providerId, embeddingModelId)
          // Check if model supports multimodal embedding
          void foundModel.features?.multimodalVectorization;
        } else if (editingProject?.embeddingModelId) {
          // 如果是编辑模式且找不到模型（可能provider被禁用了），保留原来的完整modelId
          const originalProviderId = parseEmbeddingProviderId(editingProject.embeddingModelId)
          const originalModelId = parseEmbeddingModelId(editingProject.embeddingModelId)
          if (originalModelId === embeddingModelId && originalProviderId) {
            formattedEmbeddingModelId = editingProject.embeddingModelId
          }
        }
      }

      const response = await fetch("/api/projects", {
        method: editingProject ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingProject ? { id: editingProject.id } : {}),
          name: newProjectName.trim(),
          icon: newProjectIcon,
          description: newProjectDescription,
          isMemoryGlobal,
          embeddingEnabled,
          embeddingModelId: formattedEmbeddingModelId,
          embeddingDimensions: (embeddingEnabled && embeddingModelId) ? embeddingDimensions : null,
        }),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        setIsEditDialogOpen(false)
        fetchProjects()
      }
    } catch (_error) {
      console.error(editingProject ? "更新项目失败:" : "创建项目失败:", _error)
    } finally {
      setIsCreating(false)
    }
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const handleDeleteProject = async (id: string) => {
    setProjectToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      const response = await fetch(`/api/projects?id=${projectToDelete}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchProjects()
      }
    } catch (_error) {
      console.error("删除项目失败:", _error)
    } finally {
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setIsEditDialogOpen(true)
  }

  // 使用 useMemo 缓存过滤结果
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const query = searchQuery.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    )
  }, [projects, searchQuery])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-background">
      {/* 顶部标题栏 - 参考能力页面样式 */}
      <div className="h-10 flex items-center justify-center px-4 shrink-0 bg-white dark:bg-background">
        <h1 className="text-lg font-bold text-foreground">{t("project.title")}</h1>
      </div>

      {/* 获取当前选中的图标组件 */}
      {(() => {
        const SelectedIcon = getIconComponent(newProjectIcon)
        return (
          <>
            <div className="flex-1 overflow-y-auto flex flex-col items-center">
              <div className="w-[80%] flex flex-col">
                {/* 顶部操作栏 */}
                <div className="pt-2 h-8 flex gap-2 items-center shrink-0">
                  <div className="relative flex-1 h-full flex items-center">
                    <Search className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2" strokeWidth={1.5} />
                    <Input
                      placeholder={t("capabilities.searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-muted/30 border rounded-md text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] pl-8 shadow-none"
                    />
                  </div>
                  <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm" className="gap-1.5 px-2 h-7 min-h-[28px] text-xs rounded-md">
                    <Plus className="h-3.5 w-3.5" />
                    {t("project.createProject")}
                  </Button>
                </div>

                {/* 项目列表 */}
                <div className="flex-1 overflow-y-auto pb-6 pt-3">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{t("project.loading")}</p>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      <FolderKanban className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-sm">{t("project.noProjects")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filteredProjects.map((project) => {
                        // 使用外部定义的 ICON_MAPPING 映射图标
                        const mappedIcon = project.icon ? (ICON_MAPPING[project.icon] || project.icon) : "FolderKanban"
                        const ProjectIcon = getIconComponent(mappedIcon)
                        return (
                          <div
                            key={project.id}
                            className="group relative flex flex-col gap-2 p-4 rounded-md bg-muted/50 hover:bg-muted dark:bg-card/50 dark:hover:bg-card transition-all text-left border border-border/50 dark:border-border/50 hover:border-border dark:hover:border-border cursor-pointer"
                            onClick={() => {
                              router.push(`/chat/projects/${project.id}`)
                            }}
                          >
                            {/* 第一行：图标 + 标题 + 操作按钮 */}
                            <div className="flex items-center gap-2 w-full">
                              <ProjectIcon className="h-4 w-4 text-foreground/80 dark:text-muted-foreground shrink-0" strokeWidth={1.5} />
                              <span className="font-medium text-foreground dark:text-foreground/70 truncate text-sm leading-tight flex-1">
                                {project.name}
                              </span>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-20 relative shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-[140px] p-1 rounded-[10px]">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditProject(project)
                                    }}
                                    className="flex items-center w-full px-2 py-1.5 text-xs rounded-[6px] hover:bg-muted transition-colors"
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                    <span>{t("project.edit")}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteProject(project.id)
                                    }}
                                    className="flex items-center w-full px-2 py-1.5 text-xs rounded-[6px] hover:bg-red-50 dark:hover:bg-red-950 transition-colors text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                                    <span>{t("project.delete")}</span>
                                  </button>
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* 第二行：项目说明 */}
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-6 min-h-[1rem]">
                              {project.description || ""}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent
                className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
                overlayClassName="bg-background/60 backdrop-blur-sm"
              >
                <DialogHeader>
                  <DialogTitle>{t("project.createProject")}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                  <div className="space-y-4">
                    {/* Icon & Name Row */}
                    <div className="space-y-2">
                      <Label>{t("project.projectName")} <span className="text-destructive">*</span></Label>
                      <div className="flex gap-2">
                        {/* Icon Picker - 与技能弹窗完全一致 */}
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
                                {COMMON_ICONS.map((iconName) => {
                                  const IconComponent = getIconComponent(iconName)
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      onClick={() => {
                                        setNewProjectIcon(iconName)
                                        setIconPopoverOpen(false)
                                      }}
                                      className={cn(
                                        "w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer",
                                        newProjectIcon === iconName && "bg-primary/10 ring-1 ring-primary"
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
                          placeholder={t("project.projectNamePlaceholder")}
                          className="flex-1 bg-background/50 h-7 min-h-[28px] text-xs"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>{t("project.projectDescription")}</Label>
                      <Textarea
                        id="description"
                        placeholder={t("project.projectDescriptionPlaceholder")}
                        className="min-h-[100px] text-xs resize-none bg-background/50"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                      />
                    </div>

                    {/* Embedding Switch */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">{t("project.enableEmbedding")}</Label>
                          <p className="text-[10px] text-muted-foreground">{t("project.enableEmbeddingDescription")}</p>
                        </div>
                        <Switch
                          checked={embeddingEnabled}
                          onCheckedChange={setEmbeddingEnabled}
                        />
                      </div>
                      {embeddingEnabled && (
                        <div className="p-4 rounded-xl border border-border bg-muted/50 dark:bg-card/50 space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-medium text-muted-foreground">{t("project.embeddingModel")}</Label>
                            {Object.keys(embeddingModels).length > 0 ? (
                              <ModelPicker
                                value={embeddingModelId}
                                onValueChange={handleEmbeddingModelChange}
                                providers={embeddingModels}
                                placeholder={t("project.selectEmbeddingModel")}
                              />
                            ) : (
                              <div className="p-3 rounded-lg bg-muted dark:bg-card border border-border">
                                <p className="text-[10px] text-muted-foreground">{t("project.noEmbeddingModels")}</p>
                              </div>
                            )}
                          </div>

                          {/* 向量维度选择 */}
                          {embeddingModelId && currentModelDimensions && currentModelDimensions.dimensions.length > 1 && (
                            <div className="space-y-2">
                              <Label className="text-[11px] font-medium text-muted-foreground">向量维度</Label>
                              <Select
                                value={embeddingDimensions?.toString() || currentModelDimensions.default.toString()}
                                onValueChange={(value) => setEmbeddingDimensions(parseInt(value))}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="选择向量维度" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currentModelDimensions.dimensions.map((dim) => (
                                    <SelectItem key={dim} value={dim.toString()} className="text-xs">
                                      {dim} 维
                                      {dim === currentModelDimensions.default && " (默认)"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Memory Visibility */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">{t("project.memoryVisibility")}</Label>
                      <Select
                        value={isMemoryGlobal ? "global" : "project"}
                        onValueChange={(v) => setIsMemoryGlobal(v === "global")}
                      >
                        <SelectTrigger className="w-[140px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          <SelectItem value="global" className="text-xs h-7 rounded-md">{t("project.memoryGlobal")}</SelectItem>
                          <SelectItem value="project" className="text-xs h-7 rounded-md">{t("project.memoryProject")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleCreateProject}
                    disabled={isCreating || !newProjectName.trim() || (embeddingEnabled && !embeddingModelId)}
                    className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        {t("project.creating")}
                      </>
                    ) : (
                      t("project.createProject")
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )
      })()}

      {/* Edit Dialog */}
      {(() => {
        const SelectedIcon = getIconComponent(newProjectIcon)
        return (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent
              className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
              overlayClassName="bg-background/60 backdrop-blur-sm"
            >
              <DialogHeader>
                <DialogTitle>{t("project.editProject")}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-4">
                  {/* Icon & Name Row */}
                  <div className="space-y-2">
                    <Label>{t("project.projectName")} <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2">
                      {/* Icon Picker - 与技能弹窗完全一致 */}
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
                              {COMMON_ICONS.map((iconName) => {
                                const IconComponent = getIconComponent(iconName)
                                return (
                                  <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => {
                                      setNewProjectIcon(iconName)
                                      setIconPopoverOpen(false)
                                    }}
                                    className={cn(
                                      "w-7 h-7 flex items-center justify-center rounded hover:bg-muted transition-colors cursor-pointer",
                                      newProjectIcon === iconName && "bg-primary/10 ring-1 ring-primary"
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
                        id="edit-name"
                        placeholder={t("project.projectNamePlaceholder")}
                        className="flex-1 bg-background/50 h-7 min-h-[28px] text-xs"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>{t("project.projectDescription")}</Label>
                    <Textarea
                      id="edit-description"
                      placeholder={t("project.projectDescriptionPlaceholder")}
                      className="min-h-[100px] text-xs resize-none bg-background/50"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                    />
                  </div>

                  {/* Embedding Switch */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">{t("project.enableEmbedding")}</Label>
                        <p className="text-[10px] text-muted-foreground">{t("project.enableEmbeddingDescription")}</p>
                      </div>
                      <Switch
                        checked={embeddingEnabled}
                        onCheckedChange={setEmbeddingEnabled}
                      />
                    </div>
                    {embeddingEnabled && (
                      <div className="p-4 rounded-xl border border-border bg-muted/50 dark:bg-card/50 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-medium text-muted-foreground">{t("project.embeddingModel")}</Label>
                          {Object.keys(embeddingModels).length > 0 ? (
                            <ModelPicker
                              value={embeddingModelId}
                              onValueChange={handleEmbeddingModelChange}
                              providers={embeddingModels}
                              placeholder={t("project.selectEmbeddingModel")}
                            />
                          ) : (
                            <div className="p-3 rounded-lg bg-muted dark:bg-card border border-border">
                              <p className="text-[10px] text-muted-foreground">{t("project.noEmbeddingModels")}</p>
                            </div>
                          )}
                        </div>

                        {/* 向量维度选择 */}
                        {embeddingModelId && currentModelDimensions && currentModelDimensions.dimensions.length > 1 && (
                          <div className="space-y-2">
                            <Label className="text-[11px] font-medium text-muted-foreground">向量维度</Label>
                            <Select
                              value={embeddingDimensions?.toString() || currentModelDimensions.default.toString()}
                              onValueChange={(value) => setEmbeddingDimensions(parseInt(value))}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="选择向量维度" />
                              </SelectTrigger>
                              <SelectContent>
                                {currentModelDimensions.dimensions.map((dim) => (
                                  <SelectItem key={dim} value={dim.toString()} className="text-xs">
                                    {dim} 维
                                    {dim === currentModelDimensions.default && " (默认)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Memory Visibility */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("project.memoryVisibility")}</Label>
                    <Select
                      value={isMemoryGlobal ? "global" : "project"}
                      onValueChange={(v) => setIsMemoryGlobal(v === "global")}
                    >
                      <SelectTrigger className="w-[140px] !h-7 text-xs rounded-md px-2 py-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        <SelectItem value="global" className="text-xs h-7 rounded-md">{t("project.memoryGlobal")}</SelectItem>
                        <SelectItem value="project" className="text-xs h-7 rounded-md">{t("project.memoryProject")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-4">
                <Button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={isCreating || !newProjectName.trim() || (embeddingEnabled && !embeddingModelId)}
                  className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {t("project.updating")}
                    </>
                  ) : (
                    t("common.save")
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("project.deleteConfirm")}
        description={t("project.deleteConfirmDesc")}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        onConfirm={confirmDeleteProject}
        variant="destructive"
      />
    </div>
  )
}
