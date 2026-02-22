"use client"

import { useState, useEffect } from "react"
import Link from "next/link";
import { 
  PanelRightOpen,
  PanelRightClose,
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  MessageSquarePlus,
  Check,
  X,
  Clock,
  Loader2
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context";

interface ImageSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    content: string;
    role: string;
    createdAt: string;
  } | null;
}

interface MobileImageSidebarProps {
  sessions: ImageSession[];
  isLoading: boolean;
  sessionId: string | null;
  onRefresh: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onRenameSession: (session: ImageSession, e: React.MouseEvent) => void;
  editingSessionId: string | null;
  editingTitle: string;
  setEditingTitle: (title: string) => void;
  confirmRenameSession: (e?: React.FormEvent) => void;
  setEditingSessionId: (id: string | null) => void;
}

export function MobileImageSidebar({
  sessions,
  isLoading,
  sessionId,
  onDeleteSession,
  onRenameSession,
  editingSessionId,
  editingTitle,
  setEditingTitle,
  confirmRenameSession,
  setEditingSessionId
}: MobileImageSidebarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsMounted(true)
    })
    return () => cancelAnimationFrame(rafId)
  }, [])

  if (!isMounted) return null

  const handleLinkClick = () => {
    setOpen(false)
  }

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
      <SheetContent 
        side="right" 
        className="p-0 w-[85vw] sm:w-[352px] [&>button]:hidden"
        overlayClassName="bg-background/80 backdrop-blur-sm"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>图像会话历史</SheetTitle>
        </SheetHeader>
        <div className="h-full flex flex-col bg-white dark:bg-background relative">
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
          {/* 头部 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border dark:border-border shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Link
                href="/chat/images"
                onClick={handleLinkClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors text-xs font-medium text-foreground dark:text-foreground"
              >
                <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t("imageChat.newChat")}</span>
              </Link>
            </div>
          </div>

          {/* 会话列表 */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 flex flex-col gap-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-muted-foreground" />
                  </div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-[1px]">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "relative group w-full rounded-sm hover:bg-muted dark:hover:bg-muted/50 transition-colors",
                          sessionId === session.id && "bg-muted dark:bg-muted-50"
                        )}
                      >
                        {editingSessionId === session.id ? (
                          <div className="w-full flex items-center justify-between text-foreground dark:text-foreground/70 font-normal h-7 py-0 px-2" onClick={(e) => e.stopPropagation()}>
                            <form onSubmit={(e) => { e.preventDefault(); confirmRenameSession(e); }} className="flex-1 flex items-center overflow-hidden mr-2">
                              <input
                                autoFocus
                                className="bg-transparent border-none outline-none text-xs font-normal w-full p-0 m-0 focus:ring-0 focus:outline-none"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingSessionId(null)
                                  }
                                }}
                              />
                            </form>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  confirmRenameSession()
                                }}
                                className="size-6 p-0.5 hover:bg-muted dark:hover:bg-muted rounded-sm text-muted-foreground dark:text-muted-foreground transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  setEditingSessionId(null)
                                }}
                                className="size-6 p-0.5 hover:bg-muted dark:hover:bg-muted rounded-sm text-muted-foreground dark:text-muted-foreground transition-colors"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Link
                              href={`/chat/images?id=${session.id}`}
                              onClick={handleLinkClick}
                              className="block w-full min-w-0"
                            >
                              <div className="w-full min-w-0 flex items-center justify-start text-foreground dark:text-foreground/70 font-normal h-7 py-0 pl-2 pr-10">
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                  <span className="font-normal text-xs truncate w-full text-fade-out">
                                    {session.title || t("imageChat.newChat")}
                                  </span>
                                </div>
                              </div>
                            </Link>
                            
                            <div className="absolute right-[3px] top-[3px] bottom-[3px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center z-10">
                              <div className="flex items-center h-full">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-full w-6 rounded-[5px] cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-muted-foreground dark:text-muted-foreground strokeWidth={1.5}" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32 p-1 rounded-[10px]">
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs text-foreground dark:text-foreground/70 focus:bg-muted dark:focus:bg-muted focus:text-foreground dark:focus:text-foreground/70 rounded-[6px]"
                                      onClick={(e) => onRenameSession(session, e)}
                                    >
                                      <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground strokeWidth={1.5}" />
                                      {t("imageChat.rename")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer text-xs rounded-[6px] text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                      onClick={(e) => onDeleteSession(session.id, e)}
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                                      {t("imageChat.delete")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <Clock className="h-8 w-8 text-foreground/70 dark:text-foreground/80 mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center">{t("imageChat.noChatHistory")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
