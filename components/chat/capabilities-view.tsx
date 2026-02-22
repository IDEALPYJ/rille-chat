"use client"

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"
import { Sparkles, Puzzle, Zap } from "lucide-react"
import { PromptsManager } from "./capabilities/prompts-manager"
import { PluginsManager } from "./capabilities/plugins-manager"
import { SkillsManager } from "./capabilities/skills-manager"

type TabType = "prompts" | "plugins" | "skills"

export function CapabilitiesView() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<TabType>("prompts")

  const tabs: { id: TabType; label: string; icon: typeof Sparkles }[] = [
    { id: "prompts", label: t("capabilities.prompts"), icon: Sparkles },
    { id: "plugins", label: t("capabilities.plugins"), icon: Puzzle },
    { id: "skills", label: t("capabilities.skills"), icon: Zap },
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 顶部导航栏 - 高度 h-10 */}
      <div className="h-10 flex items-center justify-center px-4 shrink-0 bg-white dark:bg-background">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all h-7",
                  isActive
                    ? "bg-[#dbeafe] dark:bg-[rgba(59,130,246,0.15)] text-[#1e40af] dark:text-[#93c5fd]"
                    : "text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    isActive
                      ? "text-[#2563eb] dark:text-[#60a5fa]"
                      : "text-gray-500 dark:text-muted-foreground"
                  )}
                />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "prompts" && <PromptsManager />}
        {activeTab === "plugins" && <PluginsManager />}
        {activeTab === "skills" && <SkillsManager />}
      </div>
    </div>
  )
}
