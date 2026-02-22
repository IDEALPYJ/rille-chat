"use client"

import { PanelRightOpen, PanelRightClose } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ProjectSidebarContent } from "./project-sidebar-content"

interface MobileProjectSidebarProps {
  projectId: string;
}

export function MobileProjectSidebar({ projectId }: MobileProjectSidebarProps) {
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsMounted(true)
    })
    return () => cancelAnimationFrame(rafId)
  }, [])
  if (!isMounted) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden h-7 w-7 text-muted-foreground hover:text-foreground/80"
        >
          {open ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-[85vw] sm:w-[352px] [&>button]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>项目侧边栏</SheetTitle>
        </SheetHeader>
        <div className="h-full flex flex-col bg-muted/50 dark:bg-muted/30 relative">
          {/* 折叠按钮 */}
          <div className="absolute top-2 right-3 z-40">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground/80 shrink-0"
            >
              <PanelRightClose className="h-5 w-5" />
            </Button>
          </div>
          <ProjectSidebarContent projectId={projectId} onLinkClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}