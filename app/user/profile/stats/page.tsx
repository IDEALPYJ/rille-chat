"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, BarChart3 } from "lucide-react"
import { UserStats } from "@/components/chat/user-stats"
import { useI18n } from "@/lib/i18n/context"
import { useProfileContext } from "../profile-context"

export default function StatsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { t } = useI18n()
  const { onBack } = useProfileContext()

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
              <BarChart3 className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">统计数据</h2>
          </div>
        </div>

        <div className="space-y-6">
          <UserStats />
        </div>
      </div>
    </div>
  )
}
