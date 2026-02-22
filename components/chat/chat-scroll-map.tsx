import { useState, memo } from "react";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";

interface ChatScrollMapProps {
  messages: Message[];
  onItemClick: (index: number) => void;
  isAtBottom: boolean;
  onScrollToBottom: () => void;
}

const MapItem = memo(function MapItem({ message, index, onClick }: { message: Message; index: number; onClick: (index: number) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const isUser = message.role === 'user';
  
  // 计算长度：基于内容长度，设定最小和最大宽度
  // 基准长度 12px，每个字符增加 0.2px，最大 32px
  const length = Math.min(32, Math.max(12, (message.content?.length || 0) * 0.2));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onClick(index)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "h-1.5 rounded-full transition-all duration-200 ease-out origin-right hover:scale-x-110 hover:brightness-90 block",
            isUser ? "bg-blue-400/60 dark:bg-blue-500/60" : "bg-muted-foreground/40 dark:bg-muted-foreground/50",
            isHovered ? "brightness-75" : ""
          )}
          style={{ width: `${length}px` }}
          aria-label={`Jump to message ${index + 1}`}
        />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          side="left"
          className="bg-popover text-popover-foreground border-border shadow-xl w-[200px] z-[100] p-2"
          sideOffset={10}
        >
          <span className="block font-medium text-xs leading-relaxed line-clamp-4 whitespace-normal break-all">
            {message.content?.slice(0, 50) || "Empty message"}
          </span>
        </TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
});

export const ChatScrollMap = memo(function ChatScrollMap({ messages, onItemClick, isAtBottom, onScrollToBottom }: ChatScrollMapProps) {
  // 仅当消息数量足够多时才显示，或者始终显示
  if (messages.length === 0) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 h-[60vh] w-32 z-40 flex flex-col items-end pointer-events-none hidden md:flex"
      >
        {/* 渐变遮罩容器 */}
        <div
          className="w-full h-full relative overflow-y-auto no-scrollbar pointer-events-auto"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div className="flex flex-col items-end gap-1.5 py-12 pr-2 min-h-full justify-center">
            {messages.map((message, index) => (
              <MapItem
                key={message.id}
                message={message}
                index={index}
                onClick={onItemClick}
              />
            ))}
          </div>
        </div>
        {/* 滚动到底部按钮 */}
        {!isAtBottom && (
          <div className="absolute bottom-0 right-2 pointer-events-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onScrollToBottom}
                  size="icon"
                  className="h-10 w-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-lg hover:shadow-xl transition-all"
                  aria-label="滚动到底部"
                >
                  <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent side="left" className="bg-popover text-popover-foreground border-border shadow-xl z-[100]">
                  <span className="text-xs">滚动到底部</span>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
