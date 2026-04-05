import React, { memo } from "react";
import { ExternalLink, Check } from "lucide-react";
import { Message } from "@/lib/types";
import { getFileIcon } from "./chat-utils";
import { formatSize, truncateFileName } from "@/lib/utils";

interface MessageAttachmentsProps {
  attachments: Message["attachments"];
  isUser: boolean;
}

export const MessageAttachments = memo(({ attachments, isUser }: MessageAttachmentsProps) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {attachments.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-2 bg-muted dark:bg-muted/30 border border-border dark:border-border/50 rounded-md p-2 min-w-0 max-w-[260px] relative group"
        >
          <div className="p-1.5 bg-white dark:bg-card border border-border shrink-0 rounded">
            {getFileIcon(file.type)}
          </div>
          <div className="flex flex-col min-w-0 flex-1 pr-6">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-foreground truncate hover:text-blue-600 hover:underline flex items-center gap-1"
              title={file.name}
            >
              {truncateFileName(file.name)}
              <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-100" />
            </a>
            <div className="flex items-center gap-2">
              <div className="relative w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 transition-all duration-500 delay-100 transform opacity-100 scale-100 rotate-0">
                  <Check className="w-full h-full text-green-500" strokeWidth={3} />
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate">
                {formatSize(file.size)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

MessageAttachments.displayName = "MessageAttachments";
