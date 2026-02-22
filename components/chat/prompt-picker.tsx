"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Lightbulb, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

interface Prompt {
  id: string
  title: string
  content: string
}

interface PromptPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (content: string, title: string) => void
  selectedPromptTitle?: string | null
}

export function PromptPicker({ open, onOpenChange, onSelect, selectedPromptTitle }: PromptPickerProps) {
  const { t } = useI18n()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null)
  
  // Form state
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  useEffect(() => {
    if (open) {
      fetchPrompts()
    }
  }, [open])

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/prompts")
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts)
      }
    } catch (_error) {
      console.error("Failed to fetch prompts:", _error)
    } finally {
      setIsLoading(false)
    }
  }


  const handleUpdate = async () => {
    if (!editingPrompt || !title.trim() || !content.trim()) return

    try {
      const res = await fetch("/api/prompts", {
        method: "PATCH",
        body: JSON.stringify({ id: editingPrompt.id, title, content }),
      })
      
      if (res.ok) {
        await fetchPrompts()
        setEditingPrompt(null)
        setTitle("")
        setContent("")
      }
    } catch (_error) {
      console.error("Failed to update prompt:", _error)
    }
  }



  const handleConfirmDelete = async () => {
    if (!promptToDelete) return

    try {
      const res = await fetch(`/api/prompts?id=${promptToDelete}`, {
        method: "DELETE",
      })
      
      if (res.ok) {
        setPrompts(prev => prev.filter(p => p.id !== promptToDelete))
      }
    } catch (_error) {
      console.error("Failed to delete prompt:", _error)
    } finally {
      setConfirmOpen(false)
      setPromptToDelete(null)
    }
  }

  const filteredPrompts = prompts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 将选中的提示词置顶显示
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    if (a.title === selectedPromptTitle) return -1
    if (b.title === selectedPromptTitle) return 1
    return 0
  })



  const resetForm = () => {
    setEditingPrompt(null)
    setTitle("")
    setContent("")
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val)
      if (!val) resetForm()
    }}>
      <DialogContent
        className="sm:max-w-[800px] h-[60vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-[var(--radius-lg)]"
        overlayClassName="bg-background/80 backdrop-blur-sm"
      >
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle>{t("prompt.title")}</DialogTitle>
        </DialogHeader>

        {editingPrompt ? (
          <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("prompt.titleLabel")}</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t("prompt.titlePlaceholder")}
                className="shadow-none bg-card"
              />
            </div>
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-sm font-medium">{t("prompt.contentLabel")}</label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={t("prompt.contentPlaceholder")}
                className="flex-1 resize-none min-h-[200px] shadow-none bg-card"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} className="shadow-none bg-card">{t("common.cancel")}</Button>
              <Button
                onClick={handleUpdate}
                variant="outline"
                className="bg-card shadow-none"
              >
                {t("prompt.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-2 flex gap-2 items-center">
              <div className="relative flex-1">
                <Search
                  className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2 top-1.5"
                  strokeWidth={1.5}
                />
                <Input
                  placeholder={t("prompt.searchPlaceholder")}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-muted/30 border rounded-[var(--radius-md)] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] pl-8 shadow-none"
                />
              </div>
              {/* 新增按钮已移除，新增功能移至能力管理页面 */}
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2">
              {isLoading ? (
                <div className="text-center text-muted-foreground py-8">{t("common.loading")}</div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
                  <Lightbulb className="h-8 w-8 opacity-20" />
                  <p>{t("prompt.noPrompts")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sortedPrompts.map(prompt => (
                    <div
                      key={prompt.id}
                      className={cn(
                        "group border rounded-md p-3 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer relative flex items-center gap-2",
                        prompt.title === selectedPromptTitle
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/30'
                          : 'bg-card/50'
                      )}
                      onClick={() => {
                        // 如果点击已选中的提示词，则取消选中
                        if (prompt.title === selectedPromptTitle) {
                          onSelect("", "")
                        } else {
                          onSelect(prompt.content, prompt.title)
                        }
                        onOpenChange(false)
                      }}
                    >
                      <Sparkles className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        prompt.title === selectedPromptTitle
                          ? "text-[#92400e] dark:text-[#fcd34d]"
                          : "text-muted-foreground"
                      )} />
                      <h3 className={cn(
                        "font-medium text-sm truncate flex-1",
                        prompt.title === selectedPromptTitle
                          ? "text-[#92400e] dark:text-[#fcd34d]"
                          : ""
                      )}>{prompt.title}</h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("prompt.deleteConfirm")}
        description={t("prompt.deleteDesc")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </Dialog>
  )
}
