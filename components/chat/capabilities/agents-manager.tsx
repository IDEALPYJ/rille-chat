"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Bot } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

export function AgentsManager() {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-[80%] flex flex-col">
          {/* 顶部操作栏 */}
          <div className="py-4 flex gap-2 items-center shrink-0">
            <div className="relative flex-1">
              <Search
                className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2 top-1/2 -translate-y-1/2"
                strokeWidth={1.5}
              />
              <Input
                placeholder={t("capabilities.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted/30 border rounded-md text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-9 pl-8 shadow-none"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 px-3 h-9 rounded-md" disabled>
              <Plus className="h-4 w-4" />
              {t("capabilities.addAgent")}
            </Button>
          </div>

          {/* 三栏布局占位内容 */}
          <div className="flex-1 overflow-y-auto pb-6">
        <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
          <Bot className="h-12 w-12 opacity-20" />
          <p>{t("capabilities.noAgents")}</p>
          <p className="text-xs mt-2">功能开发中...</p>
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
