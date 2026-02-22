"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Database, Download, Upload, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"
import { useProfileContext } from "../profile-context"

export default function DataPage() {
  const { t } = useI18n()
  const { onBack } = useProfileContext()

  const [isExporting, setIsExporting] = React.useState(false)
  const [isImporting, setIsImporting] = React.useState(false)
  const [importError, setImportError] = React.useState("")
  const [importSuccess, setImportSuccess] = React.useState("")

  const handleExport = async () => {
    setIsExporting(true)
    setImportError("")
    setImportSuccess("")
    try {
      const res = await fetch("/api/user/export")
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("profile.exportFailed"))
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rille-chat-export-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      setImportError(error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportError("")
    setImportSuccess("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/user/import", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("profile.importFailed"))
      }

      const data = await res.json()
      setImportSuccess(
        t("profile.importSuccess", {
          projects: (data.imported?.projects || 0).toString(),
          sessions: (data.imported?.sessions || 0).toString(),
          messages: (data.imported?.messages || 0).toString(),
        })
      )

      e.target.value = ""

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error: any) {
      setImportError(error.message)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
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
              <Database className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">数据管理</h2>
          </div>
        </div>

        <div className="space-y-6">
          {/* 数据导入导出 */}
          <div className="p-4 rounded-xl border bg-card/50 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">{t("profile.dataManagement")}</h4>
              </div>
            </div>

            {importSuccess && (
              <div className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-950/20 p-2 rounded">
                {importSuccess}
              </div>
            )}

            {importError && (
              <div className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-950/20 p-2 rounded">
                {importError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed border-border">
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs w-full"
                  onClick={handleExport}
                  disabled={isExporting || isImporting}
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      {t("profile.exporting")}
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 mr-2" />
                      {t("profile.exportData")}
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <label>
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleImport}
                    disabled={isExporting || isImporting}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs w-full"
                    asChild
                    disabled={isExporting || isImporting}
                  >
                    <span>
                      {isImporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          {t("profile.importing")}
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 mr-2" />
                          {t("profile.importData")}
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
