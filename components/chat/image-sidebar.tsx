"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  MessageSquarePlus,
  PanelRightClose,
  PanelRightOpen,
  Check,
  X,
  Clock,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { MobileImageSidebar } from "./mobile-image-sidebar";

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

interface ImageSidebarProps {
  className?: string;
}

export function ImageSidebar({ className }: ImageSidebarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [sessions, setSessions] = useState<ImageSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/history?isImageGeneration=true&limit=100");
      if (response.ok) {
        const data = await response.json();
        const sortedData = (data.sessions || []).sort((a: ImageSession, b: ImageSession) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setSessions(sortedData);
      }
    } catch (error) {
      console.error("加载图像会话失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [sessionId]);

  // 监听刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      loadSessions();
    };

    window.addEventListener("refresh-sessions", handleRefresh);
    return () => window.removeEventListener("refresh-sessions", handleRefresh);
  }, []);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSessionToDelete(sessionId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return

    try {
      const response = await fetch(`/api/chat/history?sessionId=${sessionToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }
      
      setSessions(sessions.filter(s => s.id !== sessionToDelete))
      
      if (sessionId === sessionToDelete) {
        router.push("/chat/images")
      }
    } catch (error) {
      console.error("删除会话失败:", error)
    } finally {
      setIsDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const handleRenameSession = async (session: ImageSession, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  const confirmRenameSession = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (!editingSessionId || !editingTitle.trim()) {
      setEditingSessionId(null)
      return
    }

    try {
      const response = await fetch("/api/chat/history", {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: editingSessionId,
          title: editingTitle.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('重命名失败');
      }
      
      setSessions(sessions.map(s =>
        s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s
      ))
    } catch (error) {
      console.error("重命名会话失败:", error)
    } finally {
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }

  return (
    <>
      {/* 桌面端侧边栏 - 使用负边距动画 */}
      <div
        className={cn(
          "relative flex flex-col h-full bg-white dark:bg-background border-l border-border dark:border-border transition-all duration-300 ease-in-out w-64 shrink-0 hidden md:flex",
          isCollapsed ? "mr-[-16rem]" : "mr-0",
          className
        )}
      >
        {/* 展开/折叠按钮 - 绝对定位在侧边栏内部，位置保持不变 */}
        <div className={cn(
          "absolute top-2 z-[40] transition-all duration-300 ease-in-out",
          isCollapsed ? "right-[calc(16rem+0.75rem)]" : "right-3"
        )}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 text-muted-foreground dark:text-muted-foreground hover:text-foreground/80 dark:hover:text-muted-foreground shrink-0"
          >
            {isCollapsed ? (
              <PanelRightOpen className="h-5 w-5" />
            ) : (
              <PanelRightClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* 头部 */}
        <div className="flex items-center justify-between px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Link
              href="/chat/images"
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
                          <form onSubmit={confirmRenameSession} className="flex-1 flex items-center overflow-hidden mr-2">
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
                                    onClick={(e) => handleRenameSession(session, e)}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground strokeWidth={1.5}" />
                                    {t("imageChat.rename")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer text-xs rounded-[6px] text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
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

      {/* 移动端侧边栏 */}
      <MobileImageSidebar 
        sessions={sessions}
        isLoading={isLoading}
        sessionId={sessionId}
        onRefresh={loadSessions}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        editingSessionId={editingSessionId}
        editingTitle={editingTitle}
        setEditingTitle={setEditingTitle}
        confirmRenameSession={confirmRenameSession}
        setEditingSessionId={setEditingSessionId}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("imageChat.deleteConfirm")}
        description={t("imageChat.deleteConfirmDesc")}
        confirmText={t("imageChat.delete")}
        cancelText={t("common.cancel")}
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />
    </>
  );
}
