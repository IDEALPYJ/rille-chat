"use client"

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProjectSidebarContent } from "./project-sidebar-content";

interface ProjectSidebarProps {
  projectId: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ProjectSidebar({ projectId, isOpen, onToggle }: ProjectSidebarProps) {
  return (
    <>
      {/* 侧边栏主体 - 桌面端 */}
      <div className={cn(
        "w-[352px] bg-white dark:bg-background flex flex-col shrink-0 transition-all duration-300 ease-in-out h-full hidden md:flex relative",
        !isOpen && "mr-[-352px]"
      )}>
        {/* 展开/折叠按钮 - 绝对定位在侧边栏内部，位置保持不变 */}
        <div className={cn(
          "absolute top-2 z-[40] transition-all duration-300 ease-in-out",
          isOpen ? "right-3" : "right-[calc(352px+0.75rem)]"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 text-muted-foreground dark:text-muted-foreground hover:text-foreground/80 dark:hover:text-muted-foreground shrink-0"
          >
            {isOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </Button>
        </div>

        <ProjectSidebarContent projectId={projectId} />
      </div>
    </>
  );
}
