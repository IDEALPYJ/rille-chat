import React, { memo } from "react";
import { ExternalLink } from "lucide-react";
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
    <div className={`flex flex-col gap-2 mb-2 ${isUser ? "items-end" : "items-start"}`}>
      {attachments.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 bg-mutedborder border-borderrounded-xl p-2 min-w-[220px] max-w-[260px] group/file transition-all hover:bg-muted/80"
        >
          <div className="p-2 bg-white rounded-lg border border-bordershadow-sm shrink-0">
            {getFileIcon(file.type)}
          </div>
          <div className="flex flex-col min-w-0 flex-1 pr-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-foregroundtruncate hover:text-blue-600 hover:underline flex items-center gap-1"
              title={file.name}
            >
              {truncateFileName(file.name)}
              <ExternalLink size={12} className="shrink-0 opacity-0 group-hover/file:opacity-100" />
            </a>
            <span className="text-[10px] text-muted-foregrounduppercase truncate">{formatSize(file.size)}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

MessageAttachments.displayName = "MessageAttachments";
