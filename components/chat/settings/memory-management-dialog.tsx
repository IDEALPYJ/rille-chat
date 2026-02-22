"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Trash2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"

// 5个 Root 分类
const ROOT_OPTIONS = [
  { key: "Profile", label: "个人档案", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { key: "Ability", label: "技能能力", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  { key: "Preference", label: "个人偏好", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { key: "Goal", label: "目标计划", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { key: "Context", label: "上下文", color: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20" },
] as const

interface Memory {
  id: string
  content: string
  createdAt: string
  projectId: string | null
  root: string | null
}

export function MemoryManagementDialog({ trigger }: { trigger: React.ReactNode }) {
  const { t } = useI18n()
  const [memories, setMemories] = React.useState<Memory[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null)
  const [selectedRoots, setSelectedRoots] = React.useState<string[]>([])

  const fetchMemories = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/memory")
      if (res.ok) {
        const data = await res.json()
        setMemories(data.memories || [])
      }
    } catch (err) {
      console.error("Failed to fetch memories:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const res = await fetch("/api/user/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        setMemories(prev => prev.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete memory:", err)
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleRoot = (root: string) => {
    setSelectedRoots(prev =>
      prev.includes(root)
        ? prev.filter(r => r !== root)
        : [...prev, root]
    )
  }

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRoot = selectedRoots.length === 0 || (m.root && selectedRoots.includes(m.root))
    return matchesSearch && matchesRoot
  })

  const getRootInfo = (rootKey: string | null) => {
    if (!rootKey) return null
    return ROOT_OPTIONS.find(r => r.key === rootKey)
  }

  return (
    <Dialog onOpenChange={(open) => open && fetchMemories()}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col p-0 overflow-hidden" overlayClassName="bg-background/80 backdrop-blur-sm">
        <VisuallyHidden>
          <DialogTitle>{t("memory.title")}</DialogTitle>
        </VisuallyHidden>
        {/* 搜索和筛选区域 */}
        <div className="px-6 py-4 shrink-0 space-y-3">
          {/* 搜索框 - 参考能力界面样式 */}
          <div className="relative flex-1 h-full flex items-center">
            <Search className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2" strokeWidth={1.5} />
            <Input
              placeholder={t("memory.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/30 border rounded-md text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] pl-8 shadow-none"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Root 筛选项 - 参考左侧边栏按钮样式 */}
          <div className="flex items-center gap-2 flex-wrap">
            {ROOT_OPTIONS.map((root) => (
              <button
                key={root.key}
                onClick={() => toggleRoot(root.key)}
                className={cn(
                  "h-7 px-2 text-xs font-normal rounded-md transition-colors duration-300 ease-in-out",
                  selectedRoots.includes(root.key)
                    ? root.color
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                {root.label}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("memory.loading")}</p>
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p className="text-sm">{t("memory.noMemory")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemories.map((memory) => {
                const rootInfo = getRootInfo(memory.root)
                return (
                  <div
                    key={memory.id}
                    className="group flex items-start gap-4 p-4 rounded-xl border border-border dark:border-border bg-muted/50 dark:bg-muted/50 hover:bg-muted dark:hover:bg-card transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      {/* Root 标签 */}
                      {rootInfo && (
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", rootInfo.color)}>
                          {rootInfo.label}
                        </Badge>
                      )}
                      <p className="text-sm leading-relaxed text-foreground dark:text-foreground/70">
                        {memory.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(memory.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
                        </span>
                        {memory.projectId && (
                          <span className="px-1.5 py-0.5 rounded-md bg-muted dark:bg-muted text-[9px] text-muted-foreground">
                            {t("memory.projectSpecific")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(memory.id)}
                      disabled={isDeleting === memory.id}
                    >
                      {isDeleting === memory.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
