"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarToastProps {
  message: string;
  type?: "info" | "warning" | "error";
  duration?: number;
  onClose?: () => void;
}

export function SidebarToast({ message, type = "info", duration = 5000, onClose }: SidebarToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // 等待动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  }[type];

  const textColor = {
    info: "text-blue-900 dark:text-blue-100",
    warning: "text-amber-900 dark:text-amber-100",
    error: "text-red-900 dark:text-red-100",
  }[type];

  if (!isVisible && !onClose) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[9999] w-full max-w-[288px] sm:w-72 bg-card border rounded-[var(--radius-lg)] p-2.5 text-xs transition-all duration-300 shadow-lg",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
        bgColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("flex-1 leading-relaxed text-foreground", textColor)}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="shrink-0 hover:opacity-70 transition-opacity p-0.5 -mt-0.5 -mr-0.5 text-muted-foreground hover:text-foreground"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

