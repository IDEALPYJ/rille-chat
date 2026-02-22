"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Zap, Trash2 } from "lucide-react"
import * as Icons from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AddSkillDialog } from "./add-skill-dialog"
import { Skill } from "@/lib/types/skill"

// 图标渲染组件 - 使用静态方式避免在 render 中创建组件
function IconRenderer({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
  if (IconComponent) {
    return <IconComponent className={className} />
  }
  return null
}

export function SkillsManager() {
  const { t } = useI18n()
  const [skills, setSkills] = useState<Skill[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchSkills()
  }, [])

  const fetchSkills = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/skills")
      if (res.ok) {
        const data = await res.json()
        setSkills(data.skills || [])
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!skillToDelete) return
    try {
      const res = await fetch(`/api/skills?id=${skillToDelete}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setSkills((prev) => prev.filter((s) => s.id !== skillToDelete))
      }
    } catch (error) {
      console.error("Failed to delete skill:", error)
    } finally {
      setDeleteDialogOpen(false)
      setSkillToDelete(null)
    }
  }

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill)
    setIsAddDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingSkill(null)
    setIsAddDialogOpen(true)
  }

  const filteredSkills = skills.filter(
    (s) =>
      s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
            <Button onClick={handleAdd} variant="outline" size="sm" className="gap-1.5 px-2 h-7 min-h-[28px] text-xs rounded-md">
              <Plus className="h-3.5 w-3.5" />
              {t("capabilities.addSkill")}
            </Button>
          </div>

          {/* Skills 列表 */}
          <div className="flex-1 overflow-y-auto pb-6 pt-3">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">{t("common.loading")}</div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
                <Zap className="h-8 w-8 opacity-20" />
                <p className="text-xs">{t("capabilities.noSkills")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onEdit={() => handleEdit(skill)}
                    onDelete={() => {
                      setSkillToDelete(skill.id)
                      setDeleteDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddSkillDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) setEditingSkill(null)
        }}
        onSuccess={fetchSkills}
        editingSkill={editingSkill}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t("skill.deleteConfirm")}
        description={t("skill.deleteDesc")}
        confirmText={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

function SkillCard({ skill, onEdit, onDelete }: { skill: Skill; onEdit: () => void; onDelete: () => void }) {
  return (
    <div
      onClick={onEdit}
      className="group relative flex flex-col gap-2 p-4 rounded-md bg-muted/50 hover:bg-muted dark:bg-card/50 dark:hover:bg-card transition-all border border-border/50 dark:border-border/50 hover:border-border dark:hover:border-border cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          {skill.icon ? (
            <IconRenderer iconName={skill.icon} className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Zap className="h-3.5 w-3.5 text-primary" />
          )}
          <h3 className="font-medium text-sm flex-1 line-clamp-1 leading-7">{skill.displayName}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
    </div>
  )
}
