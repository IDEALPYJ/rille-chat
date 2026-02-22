"use client"

import * as React from "react"
import { Loader2, X, CheckCircle, AlertCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { AlertToast } from "@/components/ui/alert-toast"

interface VectorizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unvectorizedCount: number
  onVectorizationComplete?: () => void
}

export function VectorizationDialog({
  open,
  onOpenChange,
  unvectorizedCount,
  onVectorizationComplete,
}: VectorizationDialogProps) {
  const { t } = useI18n()
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [progress, setProgress] = React.useState({
    total: 0,
    completed: 0,
    failed: 0,
  })
  const [isComplete, setIsComplete] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [alertTitle, setAlertTitle] = React.useState("")
  const [alertMessage, setAlertMessage] = React.useState("")

  const abortControllerRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => {
    if (open && unvectorizedCount > 0 && !isProcessing && !isComplete) {
      startVectorization()
    }
  }, [open])

  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const startVectorization = async () => {
    setIsProcessing(true)
    setProgress({ total: unvectorizedCount, completed: 0, failed: 0 })
    setIsComplete(false)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch("/api/user/memory/vectorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Vectorization request failed")
      }

      const data = await response.json()

      if (data.success) {
        setProgress({
          total: data.result.total,
          completed: data.result.success,
          failed: data.result.failed,
        })
        setIsComplete(true)

        if (data.result.failed === 0) {
          setAlertTitle(t("memory.success") || "成功")
          setAlertMessage(
            (t("memory.vectorizationSuccess") || "成功向量化 {count} 条记忆")
              .replace("{count}", String(data.result.success))
          )
        } else {
          setAlertTitle(t("memory.vectorizationCompleteWithErrors") || "向量化完成（有错误）")
          setAlertMessage(
            (t("memory.vectorizationPartial") || "成功 {success} 条，失败 {failed} 条")
              .replace("{success}", String(data.result.success))
              .replace("{failed}", String(data.result.failed))
          )
        }
        setAlertOpen(true)

        onVectorizationComplete?.()
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // 用户取消操作，无需处理
      } else {
        console.error("Vectorization failed:", error)
        setAlertTitle(t("memory.vectorizationFailed") || "错误")
        setAlertMessage(
          t("memory.vectorizationFailed") || "向量化失败，请重试"
        )
        setAlertOpen(true)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    abortControllerRef.current?.abort()
    onOpenChange(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    if (isComplete) {
      onVectorizationComplete?.()
    }
  }

  const progressPercentage =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {t("memory.vectorizationTitle") || "批量向量化"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isProcessing ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("memory.processing") || "正在向量化..."}
                    </span>
                    <span className="font-medium">
                      {progress.completed} / {progress.total}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("memory.vectorizationTip") ||
                    "向量化过程可能需要几分钟，请不要关闭页面"}
                </p>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("common.cancel") || "取消"}
                </Button>
              </>
            ) : isComplete ? (
              <>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  {progress.failed > 0 ? (
                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {progress.failed > 0
                        ? t("memory.vectorizationCompleteWithErrors") ||
                          "向量化完成（有错误）"
                        : t("memory.vectorizationComplete") || "向量化完成"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("memory.vectorizationStats") || "统计"}: {" "}
                      {t("memory.success") || "成功"} {progress.completed},{" "}
                      {t("memory.failed") || "失败"} {progress.failed}
                    </p>
                  </div>
                </div>

                <Button className="w-full" onClick={handleClose}>
                  {t("common.confirm") || "确定"}
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  {t("memory.noUnvectorizedMemories") || "没有需要向量化的记忆"}
                </p>
                <Button className="mt-4" onClick={handleClose}>
                  {t("common.close") || "关闭"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title={alertTitle}
        message={alertMessage}
      />
    </>
  )
}
