"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/lib/i18n/context"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Prompt {
  id: string
  title: string
  content: string
  icon?: string | null
}

interface AddPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editingPrompt?: Prompt | null
}

// 常用图标列表（与技能对话框保持一致）
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

// 图标渲染组件 - 使用静态方式避免在 render 中创建组件
function IconRenderer({ iconName, className, strokeWidth }: { iconName: string; className?: string; strokeWidth?: number }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[iconName]
  if (IconComponent) {
    return <IconComponent className={className} strokeWidth={strokeWidth} />
  }
  return <Icons.FileText className={className} strokeWidth={strokeWidth} />
}

export function AddPromptDialog({ open, onOpenChange, onSuccess, editingPrompt }: AddPromptDialogProps) {
  const { t } = useI18n()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [icon, setIcon] = useState<string>("")
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false)
  const [existingPrompts, setExistingPrompts] = useState<Prompt[]>([])
  const [error, setError] = useState<string | null>(null)

  // 获取现有提示词列表用于校验名称唯一性
  useEffect(() => {
    if (open) {
      fetch("/api/prompts")
        .then(res => res.json())
        .then(data => setExistingPrompts(data.prompts || []))
        .catch(console.error)
    }
  }, [open])

  useEffect(() => {
    // 使用 requestAnimationFrame 避免同步调用 setState
    requestAnimationFrame(() => {
      if (open && editingPrompt) {
        setTitle(editingPrompt.title)
        setContent(editingPrompt.content)
        setIcon(editingPrompt.icon || "")
      } else if (open) {
        setTitle("")
        setContent("")
        setIcon("")
      }
    })
  }, [open, editingPrompt])

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return

    // 校验名称唯一性
    const trimmedTitle = title.trim()
    const isDuplicate = existingPrompts.some(
      p => p.title.toLowerCase() === trimmedTitle.toLowerCase() &&
           (!editingPrompt || p.id !== editingPrompt.id)
    )

    if (isDuplicate) {
      setError(t("prompt.duplicateTitleError"))
      return
    }

    setError(null)

    try {
      const url = editingPrompt ? "/api/prompts" : "/api/prompts"
      const method = editingPrompt ? "PATCH" : "POST"
      const body = editingPrompt
        ? JSON.stringify({ id: editingPrompt.id, title, content, icon: icon || undefined })
        : JSON.stringify({ title, content, icon: icon || undefined })

      const res = await fetch(url, {
        method,
        body,
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        setTitle("")
        setContent("")
        setIcon("")
        setError(null)
      }
    } catch (error) {
      console.error("Failed to save prompt:", error)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTitle("")
    setContent("")
    setIcon("")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl"
        overlayClassName="bg-background/60 backdrop-blur-sm"
      >
        <DialogHeader>
          <DialogTitle>{editingPrompt ? t("prompt.edit") : t("prompt.create")}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col gap-4">
            {/* 标题和图标在同一行 */}
            <div className="space-y-2">
              <Label>{t("prompt.titleLabel")} <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                {/* 图标选择器 */}
                <Popover open={iconPopoverOpen} onOpenChange={setIconPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <IconRenderer iconName={icon || "Sparkles"} className="h-4 w-4 text-foreground" strokeWidth={1.5} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2" align="start" onWheel={(e) => e.stopPropagation()}>
                    <div
                      className="h-[240px] overflow-y-auto overflow-x-hidden pr-2"
                      style={{ overscrollBehavior: 'contain' }}
                    >
                      <div className="grid grid-cols-8 gap-1">
                        {COMMON_ICONS.map((iconName) => (
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
                            <IconRenderer iconName={iconName} className="h-4 w-4 text-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex-1 space-y-1">
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setError(null)
                    }}
                    placeholder={t("prompt.titlePlaceholder")}
                    className="h-7 min-h-[28px] text-xs"
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("prompt.contentLabel")} <span className="text-destructive">*</span></Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("prompt.contentPlaceholder")}
                className="h-[300px] min-h-[300px] resize-none text-xs"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
            className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
