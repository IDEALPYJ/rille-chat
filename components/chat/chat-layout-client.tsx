"use client"

import { useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { LayoutGroup, AnimatePresence, motion } from "framer-motion"
import { Sidebar } from "@/components/chat/sidebar"
import { MobileSidebar } from "@/components/chat/mobile-sidebar"
import { ProjectSidebar } from "@/components/chat/project-sidebar"
import { MobileProjectSidebar } from "@/components/chat/mobile-project-sidebar"
import { ImageSidebar } from "@/components/chat/image-sidebar"
import { useMobileHeader } from "@/context/mobile-header-context"
import { ModelSelector } from "@/components/chat/model-selector"
import { cn } from "@/lib/utils"

interface ChatLayoutClientProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function ChatLayoutClient({ children, user }: ChatLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const params = useParams()
  const pathname = usePathname()
  const projectId = params?.projectId as string | undefined
  const isImagePage = pathname?.startsWith("/chat/images") || false
  const isChatPage = pathname === "/chat" || (pathname?.startsWith("/chat/projects/") && !pathname?.includes("/images")) || false
  
  // 从 mobile header context 获取标题和模型选择器状态
  const { selectedProvider, selectedModel, onModelSelect } = useMobileHeader()

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className="h-[100dvh] md:h-screen relative flex flex-col md:flex-row overflow-hidden">
      {/* Desktop Left Sidebar */}
      <div
        className={cn(
          "hidden md:flex h-full flex-col fixed inset-y-0 z-50 transition-[width] duration-300 ease-in-out border-r bg-muted/50 dark:bg-muted/30",
          isCollapsed ? "w-[72px]" : "w-[316px]"
        )}
      >
        <Sidebar
          user={user}
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          sidebarId="desktop-sidebar"
          className="border-none"
        />
      </div>

      {/* Main Content Area */}
      <main
        className={cn(
          "flex-1 h-full flex flex-col transition-[padding] duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "md:pl-[72px]" : "md:pl-[316px]"
        )}
      >
        {/* Mobile Header - 只在对话界面或图像界面显示模型选择器 */}
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b bg-white dark:bg-card/50 shrink-0 h-12">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MobileSidebar user={user} />
            {onModelSelect && (isChatPage || isImagePage) && (
              <div className="flex-1 min-w-0">
                <ModelSelector
                  selectedProvider={selectedProvider || null}
                  selectedModel={selectedModel || null}
                  onSelect={onModelSelect}
                  imageGenerationOnly={isImagePage}
                />
              </div>
            )}
          </div>
          {projectId && <MobileProjectSidebar projectId={projectId} />}
          {isImagePage && !projectId && <ImageSidebar />}
        </div>

        <div className="flex-1 w-full flex overflow-hidden">
          {/* Chat Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <LayoutGroup>
              {children}
            </LayoutGroup>
          </div>

          {/* Right Project Sidebar - Conditional & Animated */}
          <AnimatePresence mode="wait">
            {projectId && (
              <motion.div
                key="project-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex h-full shrink-0 border-l bg-muted/50 dark:bg-muted/30"
              >
                <ProjectSidebar
                  projectId={projectId} 
                  isOpen={isRightSidebarOpen} 
                  onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)} 
                />
              </motion.div>
            )}
            {isImagePage && !projectId && (
              <motion.div
                key="image-sidebar"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="hidden md:flex h-full shrink-0"
              >
                <ImageSidebar />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}