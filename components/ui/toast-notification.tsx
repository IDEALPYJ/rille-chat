"use client";

import { useEffect, useState } from "react";
import { useChatContext } from "@/context/chat-context";
import { useRouter } from "next/navigation";
import { X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelIcon } from "@/components/ui/model-icon";

export function ToastNotification() {
  const { backgroundTask, dismissNotification } = useChatContext();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (backgroundTask && backgroundTask.status === 'completed') {
      // 使用 requestAnimationFrame 避免同步 setState
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      // 5秒后自动消失
      const timer = setTimeout(() => {
        setIsVisible(false);
        // 等待动画结束后清除状态
        setTimeout(dismissNotification, 300);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // 使用 requestAnimationFrame 避免同步 setState
      requestAnimationFrame(() => {
        setIsVisible(false);
      });
    }
  }, [backgroundTask, dismissNotification]);

  if (!backgroundTask || backgroundTask.status !== 'completed') return null;

  const handleClick = () => {
    if (backgroundTask.projectId) {
      router.push(`/chat/projects/${backgroundTask.projectId}?id=${backgroundTask.sessionId}`);
    } else {
      router.push(`/chat?id=${backgroundTask.sessionId}`);
    }
    setIsVisible(false);
    setTimeout(dismissNotification, 300);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "fixed top-4 right-4 z-[100] w-80 bg-white border shadow-lg rounded-[var(--radius-lg)] p-3 cursor-pointer hover:bg-muted transition-all duration-300 transform",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {/* 使用 ModelIcon */}
          {backgroundTask.model ? (
            <div className="h-8 w-8 flex items-center justify-center">
               <ModelIcon 
                 model={backgroundTask.model} 
                 provider={backgroundTask.provider}
                 size={24}
               />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foregroundmb-1 truncate">
            {backgroundTask.title || "新消息"}
          </h4>
          <p className="text-xs text-muted-foregroundline-clamp-2">
            {backgroundTask.summary || "点击查看详情"}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(dismissNotification, 300);
          }}
          className="text-muted-foreground hover:text-foreground/80transition-colors p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}