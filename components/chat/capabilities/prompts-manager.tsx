"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trash2, Sparkles } from "lucide-react"
import * as Icons from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AddPromptDialog } from "./add-prompt-dialog"

interface Prompt {
  id: string
  title: string
  content: string
  icon?: string | null
}

export function PromptsManager() {
  const { t } = useI18n()
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    
    const loadPrompts = async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/prompts")
        if (res.ok && !cancelled) {
          const data = await res.json()
          setPrompts(data.prompts || [])
        }
      } catch (error) {
        console.error("Failed to fetch prompts:", error)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    
    loadPrompts()
    
    return () => {
      cancelled = true
    }
  }, [])

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/prompts")
      if (res.ok) {
        const data = await res.json()
        setPrompts(data.prompts || [])
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!promptToDelete) return

    try {
      const res = await fetch(`/api/prompts?id=${promptToDelete}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== promptToDelete))
      }
    } catch (error) {
      console.error("Failed to delete prompt:", error)
    } finally {
      setDeleteDialogOpen(false)
      setPromptToDelete(null)
    }
  }

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setIsAddDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingPrompt(null)
    setIsAddDialogOpen(true)
  }

  const filteredPrompts = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase())
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
              {t("capabilities.addPrompt")}
            </Button>
          </div>

          {/* 三栏布局展示提示词 */}
          <div className="flex-1 overflow-y-auto pb-6 pt-3">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">{t("common.loading")}</div>
        ) : filteredPrompts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
            <Sparkles className="h-8 w-8 opacity-20" />
            <p className="text-xs">{t("capabilities.noPrompts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredPrompts.map((prompt) => {
              const IconComponent = prompt.icon ? (Icons as any)[prompt.icon] : null
              return (
                <div
                  key={prompt.id}
                  onClick={() => handleEdit(prompt)}
                  className="group relative flex flex-col gap-2 p-4 rounded-md bg-muted/50 hover:bg-muted dark:bg-card/50 dark:hover:bg-card transition-all border border-border/50 dark:border-border/50 hover:border-border dark:hover:border-border cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {IconComponent ? (
                        <IconComponent className="h-3.5 w-3.5 text-primary" />
                      ) : prompt.icon && prompt.icon.length <= 2 ? (
                        <span className="text-sm">{prompt.icon}</span>
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      )}
                      <h3 className="font-medium text-sm flex-1 line-clamp-2 leading-7">{prompt.title}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPromptToDelete(prompt.id)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{prompt.content}</p>
                </div>
              )
            })}
          </div>
        )}
          </div>
        </div>
      </div>

      <AddPromptDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setEditingPrompt(null)
          }
        }}
        onSuccess={fetchPrompts}
        editingPrompt={editingPrompt}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("prompt.deleteConfirm")}
        description={t("prompt.deleteDesc")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
