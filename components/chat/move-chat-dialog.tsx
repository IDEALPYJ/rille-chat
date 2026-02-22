"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, FolderKanban } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertToast } from "@/components/ui/alert-toast"
import { useI18n } from "@/lib/i18n/context"

interface MoveChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId: string | null
  currentProjectId?: string | null
  onSuccess?: () => void
}

interface Project {
  id: string
  name: string
  icon?: string
}

export function MoveChatDialog({ 
  open, 
  onOpenChange, 
  sessionId, 
  currentProjectId,
  onSuccess 
}: MoveChatDialogProps) {
  const { t } = useI18n()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  useEffect(() => {
    if (open) {
      fetchProjects()
      // Initialize selection based on current project
      setSelectedProjectId(currentProjectId || "none")
    }
  }, [open, currentProjectId])

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error("Failed to load projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMove = async () => {
    if (!sessionId) return

    setIsSubmitting(true)
    try {
      const targetProjectId = selectedProjectId === "none" ? null : selectedProjectId

      const response = await fetch("/api/chat/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          projectId: targetProjectId
        }),
      })

      if (response.ok) {
        onOpenChange(false)
        if (onSuccess) onSuccess()
        
        // Trigger a refresh event for both sidebar and project content to update their lists
        window.dispatchEvent(new CustomEvent('refresh-sessions', { 
            detail: { 
                sessionId,
                projectId: targetProjectId // pass the new project ID (or null)
            } 
        }))
        // Also trigger refresh for the old location
        if (currentProjectId !== targetProjectId) {
             window.dispatchEvent(new CustomEvent('refresh-sessions', { 
                detail: { 
                    sessionId,
                    projectId: currentProjectId // refresh the old list too
                } 
            }))
        }
        
      } else {
        throw new Error("Failed to move chat")
      }
    } catch (error) {
      console.error("Move chat error:", error)
      setAlertOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80%] sm:w-[40%] sm:max-w-[calc(40vw-2rem)]" overlayClassName="bg-background/80 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>{t("chat.moveChat")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{t("chat.selectTarget")}</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("chat.selectProject")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center text-muted-foreground">
                      <FolderKanban className="mr-2 h-4 w-4 opacity-50" />
                      {t("chat.rootDirectory")}
                    </div>
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center">
                        <FolderKanban className="mr-2 h-4 w-4" />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-7 px-3 text-xs rounded-md">
            {t("chat.cancel")}
          </Button>
          <Button onClick={handleMove} disabled={isSubmitting || isLoading} className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("chat.confirmMove")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title={t("chat.moveFailed")}
        message={t("chat.moveFailedMessage")}
      />
    </Dialog>
  )
}