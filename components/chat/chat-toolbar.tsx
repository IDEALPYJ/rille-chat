"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare, MessageSquareDashed } from "lucide-react";
import { ModelSelector } from "@/components/chat/model-selector";

interface ChatToolbarProps {
  selectedProvider: string | null;
  selectedModel: string | null;
  onModelSelect: (provider: string, model: string) => void;
  sessionTitle?: string | null;
  isTempChat: boolean;
  projectId?: string;
  sessionId?: string | null;
  shouldShowTitle: boolean;
}

export function ChatToolbar({
  selectedProvider,
  selectedModel,
  onModelSelect,
  sessionTitle,
  isTempChat,
  projectId,
  sessionId,
  shouldShowTitle,
}: ChatToolbarProps) {
  const router = useRouter();

  return (
    <div className="relative h-14 hidden md:flex items-center justify-center px-4 shrink-0 z-10">
      <div className="absolute left-3 z-20">
        <ModelSelector
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onSelect={onModelSelect}
        />
      </div>
      {shouldShowTitle && (
        <motion.div
          className="absolute inset-x-0 flex justify-center items-center min-h-[20px] z-10 md:flex hidden"
          layoutId="chat-title"
        >
          <h1 className="text-sm font-semibold text-foreground dark:text-foreground truncate max-w-[400px]">
            {isTempChat ? "临时聊天" : (sessionTitle || "新对话")}
          </h1>
        </motion.div>
      )}
      {/* 临时聊天按钮 - 只在普通聊天且没有sessionId时显示 */}
      {!projectId && !sessionId && (
        <div className="absolute right-3 z-20">
          {isTempChat ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push("/chat");
                    }}
                    className="h-8 w-8 text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>退出临时聊天</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push("/chat?temp=true");
                    }}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground/70"
                  >
                    <MessageSquareDashed className="h-4 w-4" strokeDasharray="2,2" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>临时聊天</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
}

