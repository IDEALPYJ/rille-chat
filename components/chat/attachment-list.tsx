"use client";

import { X, Check } from "lucide-react";
import { cn, formatSize, truncateFileName } from "@/lib/utils";
import { getFileIcon } from "./chat-utils";
import { Attachment } from "@/hooks/use-file-upload";

interface AttachmentListProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentList({ attachments, onRemove }: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="relative group/scroll">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 px-1 scroll-smooth">
        {attachments.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 bg-muted dark:bg-muted/30 border border-border dark:border-border/50 rounded-lg p-2 min-w-0 max-w-[calc(100vw-4rem)] sm:min-w-[220px] sm:max-w-[260px] shrink-0 relative group transition-all hover:bg-muted/80 dark:hover:bg-muted/50"
          >
            <div className="p-2 bg-white dark:bg-cardrounded-lg border border-border dark:border-bordershadow-sm dark:shadow-none shrink-0">
              {getFileIcon(file.type)}
            </div>
            <div className="flex flex-col min-w-0 flex-1 pr-6">
              <span
                className="text-sm font-medium text-foreground dark:text-foreground truncate"
                title={file.name}
              >
                {truncateFileName(file.name)}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-300 transform",
                      file.status === "uploading"
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-0"
                    )}
                  >
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="7"
                        cy="7"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-foreground/70"
                      />
                      <circle
                        cx="7"
                        cy="7"
                        r="6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray={37.7}
                        strokeDashoffset={
                          37.7 - (37.7 * (file.progress || 0)) / 100
                        }
                        className="text-green-500 transition-all duration-300"
                      />
                    </svg>
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 delay-100 transform",
                      file.status === "completed"
                        ? "opacity-100 scale-100 rotate-0"
                        : "opacity-0 scale-0 -rotate-45"
                    )}
                  >
                    <Check
                      className="w-full h-full text-green-500"
                      strokeWidth={3}
                    />
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 delay-100 transform",
                      file.status === "error"
                        ? "opacity-100 scale-100 rotate-0"
                        : "opacity-0 scale-0 rotate-45"
                    )}
                  >
                    <X
                      className="w-full h-full text-red-500"
                      strokeWidth={3}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground dark:text-muted-foregrounduppercase truncate">
                  {formatSize(file.size)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              className="absolute top-1 right-1 bg-muted/50 dark:bg-muted/50 text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-mutedhover:text-foreground dark:hover:text-muted-foregroundrounded-full opacity-0 group-hover:opacity-100 transition-all p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {/* 渐变遮罩 */}
      <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white dark:from-background to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
      <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white dark:from-background to-transparent pointer-events-none opacity-0 group-hover/scroll:opacity-100 transition-opacity" />
    </div>
  );
}

