"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  MessageSquarePlus,
  FolderKanban,
  ImageIcon,
  Settings,
  LogOut,
  User,
  Search,
  Clock,
  Trash2,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Check,
  X,
  Sparkles
} from "lucide-react"
import { signOut } from "next-auth/react" // 客户端登出方法
import { useEffect, useState } from "react"
import { SettingsDialog } from "./settings-dialog"
import { ChatSearchDialog } from "./chat-search-dialog"
import { MoveChatDialog } from "./move-chat-dialog"

import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { useI18n } from "@/lib/i18n/context"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  isCollapsed?: boolean
  toggleSidebar?: () => void
  sidebarId?: string
  onMobileClose?: () => void
}

interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage: {
    content: string
    role: string
    createdAt: string
  } | null
}

export function Sidebar({ className, user, isCollapsed = false, toggleSidebar, sidebarId = "sidebar", onMobileClose }: SidebarProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const { update: updateSession } = useSession()
  const [currentUser, setCurrentUser] = useState(user)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery] = useState("")
  const searchParams = useSearchParams()
  
  // 删除确认弹窗状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  // 移动对话状态
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [sessionToMove, setSessionToMove] = useState<string | null>(null)

  // 重命名状态
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  
  // 设置弹窗状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // 搜索弹窗状态
  const [isSearchOpen, setIsSearchOpen] = useState(false)
 
  // 导航项配置
  const routes = [
    {
      label: t("sidebar.newChat"),
      icon: MessageSquarePlus,
      href: "/chat",
      active: pathname === "/chat" && !searchParams.get("id"),
    },
    {
      label: t("sidebar.images"),
      icon: ImageIcon,
      href: "/chat/images",
      active: pathname.startsWith("/chat/images"),
    },
    {
      label: t("sidebar.projects"),
      icon: FolderKanban,
      href: "/chat/projects",
      active: pathname.startsWith("/chat/projects"),
    },
    {
      label: t("sidebar.capabilities"),
      icon: Sparkles,
      href: "/chat/capabilities",
      active: pathname.startsWith("/chat/capabilities"),
    },
  ]

  // 同步外部 user 到内部状态
  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  // 监听用户信息更新事件
  useEffect(() => {
    const handleUserUpdate = async () => {
      try {
        const res = await fetch("/api/user/profile")
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setCurrentUser(data.user)
            // 更新 NextAuth session
            await updateSession({
              user: {
                image: data.user.image,
                username: data.user.name
              }
            })
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err)
      }
    }
    window.addEventListener("user-updated", handleUserUpdate)
    return () => window.removeEventListener("user-updated", handleUserUpdate)
  }, [updateSession])

  // 加载历史会话
  useEffect(() => {
    // 只有在初始加载（没有 session）时显示 loading 动画
    // 后续只有在没有会话数据时才加载，避免因切换路由导致的不必要刷新
    if (sessions.length === 0) {
      loadSessions(true)
    }

    // 设置一个定时器定期刷新会话列表，或者监听自定义事件
    const handleRefresh = (e: any) => {
      const detail = e.detail;
      // 如果是项目对话（带有 projectId），则普通侧边栏不进行乐观更新，但仍可以刷新列表以获取最新状态（或者根据需求完全忽略）
      // 这里我们选择：如果是普通对话（没有 projectId），则进行乐观更新
      if (detail?.sessionId && !detail?.projectId) {
        // Optimistic update for immediate feedback
        setSessions(prev => {
          const session = prev.find(s => s.id === detail.sessionId);
          if (session) {
            const updated = { ...session, updatedAt: new Date().toISOString() };
            const filtered = prev.filter(s => s.id !== detail.sessionId);
            return [updated, ...filtered];
          }
          return prev;
        });
      }
      loadSessions(false);
    }
    window.addEventListener('refresh-sessions', handleRefresh as any)
    return () => window.removeEventListener('refresh-sessions', handleRefresh as any)
  }, [])

  const loadSessions = async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    try {
      // 这里的排序逻辑由后端接口保证（updatedAt desc）
      const response = await fetch("/api/chat/history?limit=100") // 增加 limit 确保更多历史能被排序显示
      if (response.ok) {
        const data = await response.json()
        // 显式在前端也按时间排一次，确保 UI 反应最准确
        const sortedData = (data.sessions || []).sort((a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        setSessions(sortedData)
      }
    } catch (error) {
      console.error(t("sidebar.loadHistoryFailed"), error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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
        throw new Error(t("sidebar.deleteFailed"));
      }
      
      // 从本地状态移除
      setSessions(sessions.filter(s => s.id !== sessionToDelete))
      
      // 如果当前正在查看这个会话，重定向到新对话
      const currentSessionId = searchParams.get('id')
      if (currentSessionId === sessionToDelete) {
        router.push("/chat")
      }
    } catch (error) {
      console.error(t("sidebar.deleteFailed"), error)
    } finally {
      setIsDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const handleMoveSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToMove(sessionId)
    setIsMoveDialogOpen(true)
  }

  const handleRenameSession = async (session: ChatSession, e: React.MouseEvent) => {
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
        throw new Error(t("sidebar.renameFailed"));
      }

      // 更新本地状态
      setSessions(sessions.map(s =>
        s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s
      ))
    } catch (error) {
      console.error(t("sidebar.renameFailed"), error)
    } finally {
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (session.lastMessage?.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 1. 按照 updatedAt 降序排序
  const sortedSessions = [...filteredSessions].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  // 2. 按月份分组
  const groupedSessions = sortedSessions.reduce((groups, session) => {
    const date = new Date(session.updatedAt)
    const month = date.toLocaleString('zh-CN', { month: 'long', year: 'numeric' })
    if (!groups[month]) {
      groups[month] = []
    }
    groups[month].push(session)
    return groups
  }, {} as Record<string, ChatSession[]>)

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="space-y-1 flex-1 flex flex-col min-h-0">
        
        {/* 1. 顶部标题/Logo & 折叠按钮 */}
        <div className={cn(
          "h-10 flex items-center relative group",
          ""
        )}>
          {/* 左侧：Logo 和标题 */}
          <div className={cn(
            "flex items-center overflow-hidden whitespace-nowrap"
          )}>
            <div className={cn(
              "shrink-0 flex items-center transition-opacity duration-300 pl-[24px]",
              isCollapsed ? "group-hover:opacity-0" : ""
            )}>
              <Logo size={24} />
            </div>
          </div>

          {/* 右侧：折叠按钮 (展开状态显示收起按钮) */}
          {!isCollapsed && toggleSidebar && (
            <div className="ml-auto shrink-0">
              <Button
                variant="ghost"
                className="h-7 w-7 p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mr-3"
                onClick={toggleSidebar}
              >
                <PanelLeftClose className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              </Button>
            </div>
          )}

          {/* 右侧：折叠按钮 (折叠状态显示展开按钮 - Hover时显示) */}
          {isCollapsed && toggleSidebar && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <Button
                variant="ghost"
                className={cn(
                  "h-7 w-7 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-300",
                  "opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 pointer-events-auto"
                )}
                onClick={toggleSidebar}
              >
                <PanelLeftOpen className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              </Button>
            </div>
          )}
        </div>

        {/* 2. 搜索框 */}
        <div className={cn("h-8 flex items-center transition-all duration-150 ease-in-out", "px-3")}>
          <div className="relative w-full flex items-center">
            <Search
              className="absolute h-4 w-4 text-sidebar-foreground/50 z-10 pointer-events-none left-2"
              strokeWidth={1.5}
            />
            <Input
              placeholder={t("sidebar.searchPlaceholder")}
              className={cn(
                "bg-background border-input rounded-md text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] transition-all duration-150 ease-in-out placeholder:text-muted-foreground/70 cursor-pointer",
                isCollapsed ? "w-full pl-8 text-transparent placeholder:text-transparent pr-0" : "w-full pl-9 opacity-100"
              )}
              value={searchQuery}
              readOnly
              onClick={() => !isCollapsed && setIsSearchOpen(true)}
              disabled={isCollapsed}
            />
            {isCollapsed && (
              <Button
                variant="ghost"
                className="absolute inset-0 h-7 w-full hover:bg-sidebar-accent rounded-md transition-colors"
                onClick={() => toggleSidebar?.()}
              />
            )}
          </div>
        </div>

        {/* 3. 核心导航区 */}
        <div className={cn("pt-1 flex-1 flex flex-col overflow-hidden transition-all duration-150 ease-in-out", "px-3")}>
          <div className="space-y-[2px] flex-shrink-0">
            {routes.map((route) => (
              <div key={route.href} className="relative group w-full">
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    "h-7 transition-colors duration-300 ease-in-out w-full justify-start gap-x-1.5 font-normal relative",
                    "!px-2"
                  )}
                >
                  <Link 
                    href={route.href} 
                    className="block w-full"
                    onClick={() => {
                      if (onMobileClose && sidebarId === "mobile-sidebar") {
                        onMobileClose()
                      }
                    }}
                  >
                    {/* Left Icon */}
                    <route.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />

                    <span
                      className={cn(
                        "text-xs transition-[max-width,opacity] duration-150 ease-in-out overflow-hidden whitespace-nowrap",
                        isCollapsed
                          ? "max-w-0 opacity-0"
                          : "max-w-[150px] opacity-100"
                      )}
                    >
                      {route.label}
                    </span>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          
          {/* 历史记录列表 - 折叠时隐藏 */}
          <div className={cn(
            "mt-4 flex-1 flex flex-col min-h-0 transition-all duration-150",
            isCollapsed ? "opacity-0 max-w-0 overflow-hidden" : "opacity-100 max-w-[300px]"
          )}>
            <div className="min-w-[200px] flex flex-col h-full">
               <div className="flex items-center justify-between mb-1 px-2 flex-shrink-0">
                 <h3 className="text-xs font-medium text-sidebar-foreground/70">{t("sidebar.conversations")}</h3>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                 {isLoading ? (
                   <div className="flex items-center justify-center py-4">
                     <p className="text-sm text-sidebar-foreground/50">{t("common.loading")}</p>
                   </div>
                 ) : filteredSessions.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-8 px-4">
                     <Clock className="h-8 w-8 text-sidebar-foreground/20 mb-2" strokeWidth={1.5} />
                     <p className="text-sm text-sidebar-foreground/50 text-center">
                       {searchQuery ? t("sidebar.noMatches") : t("sidebar.noConversations")}
                     </p>
                   </div>
                 ) : (
                   Object.entries(groupedSessions).map(([month, monthSessions]) => (
                     <div key={month} className="mb-4">
                       <div className="px-2 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                         {month}
                       </div>
                        <AnimatePresence initial={false} mode="popLayout">
                          {monthSessions.map((session) => (
                            <motion.div
                              key={session.id}
                              layout
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 40,
                                opacity: { duration: 0.2 }
                              }}
                              className="relative group w-full mb-[1px] rounded-sm hover:bg-sidebar-accent/50 transition-colors"
                            >
                              {editingSessionId === session.id ? (
                                <div className="w-full flex items-center justify-between text-sidebar-foreground font-normal h-auto py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                                  <form onSubmit={confirmRenameSession} className="flex-1 flex items-center overflow-hidden mr-2">
                                    <input
                                      autoFocus
                                      className="bg-transparent border-none outline-none text-xs font-normal w-full p-0 m-0 focus:ring-0 focus:outline-none text-sidebar-foreground"
                                      value={editingTitle}
                                      onChange={(e) => setEditingTitle(e.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Escape') {
                                          setEditingSessionId(null)
                                        }
                                      }}
                                    />
                                  </form>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={(event) => {
                                        event.preventDefault()
                                        confirmRenameSession()
                                      }}
                                      className="size-6 p-0.5 hover:bg-sidebar-accent rounded-sm text-sidebar-foreground/70 transition-colors"
                                    >
                                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                                    </button>
                                    <button
                                      onClick={(event) => {
                                        event.preventDefault()
                                        setEditingSessionId(null)
                                      }}
                                      className="size-6 p-0.5 hover:bg-sidebar-accent rounded-sm text-sidebar-foreground/70 transition-colors"
                                    >
                                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Link 
                                    href={`/chat?id=${session.id}`} 
                                    className="block w-full"
                                    onClick={() => {
                                      if (onMobileClose && sidebarId === "mobile-sidebar") {
                                        onMobileClose()
                                      }
                                    }}
                                  >
                                    <div className="w-full flex items-center justify-start text-sidebar-foreground font-normal h-7 py-0 pl-2 pr-8">
                                      <div className="flex flex-col items-start w-full overflow-hidden max-w-[284px]">
                                        <span className="font-normal text-xs truncate w-full text-fade-out">
                                          {session.title}
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
                                            className="h-full w-6 rounded-[5px] cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-sidebar-accent"
                                          >
                                            <MoreHorizontal className="h-4 w-4 text-sidebar-foreground/50" strokeWidth={1.5} />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32 p-1 rounded-[10px]">
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-[6px]"
                                            onClick={(event) => handleRenameSession(session, event)}
                                          >
                                            <Pencil className="mr-2 h-3.5 w-3.5 opacity-70" strokeWidth={1.5} />
                                            {t("sidebar.rename")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-[6px]"
                                            onClick={(event) => handleMoveSession(session.id, event)}
                                          >
                                            <FolderKanban className="mr-2 h-3.5 w-3.5 opacity-70" strokeWidth={1.5} />
                                            {t("sidebar.moveToProject")}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="cursor-pointer text-xs rounded-[6px] text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                            onClick={(event) => handleDeleteSession(session.id, event)}
                                          >
                                            <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                                            {t("sidebar.delete")}
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* 4. 底部用户菜单 (Avatar) */}
        <div className="px-3 pb-3 mt-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id={`${sidebarId}-user-menu`}
                variant="ghost"
                className={cn(
                  "w-full h-7 hover:bg-sidebar-accent transition-colors duration-150 justify-start !px-2 font-normal",
                  isCollapsed ? "" : ""
                )}
              >
                <div className={cn("flex items-center", isCollapsed ? "" : "gap-x-1.5")}>
                  <Avatar className="h-6 w-6 shrink-0 -ml-[6px]">
                    <AvatarImage src={currentUser.image || ""} className="object-cover" />
                    <AvatarFallback>{currentUser.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex flex-col items-start text-left transition-[max-width,opacity] duration-150 overflow-hidden whitespace-nowrap",
                    isCollapsed
                      ? "max-w-0 opacity-0"
                      : "max-w-[150px] opacity-100"
                  )}
                  >
                    <p className="text-xs font-medium">{currentUser.name}</p>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-1 rounded-[10px]" align="start" forceMount side={isCollapsed ? "right" : "top"}>
              <DropdownMenuLabel className="text-xs">{t("sidebar.myAccount")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs h-7 rounded-[6px]" onClick={() => router.push("/user/profile")}>
                <User className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                {t("sidebar.profileMenu")}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs h-7 rounded-[6px]" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                {t("sidebar.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs h-7 rounded-[6px]" onClick={() => signOut()}>
                <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("sidebar.deleteConversation")}
        description={t("sidebar.deleteConversationDesc")}
        confirmText={t("sidebar.delete")}
        cancelText={t("common.cancel")}
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        user={currentUser}
      />

      <MoveChatDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        sessionId={sessionToMove}
        currentProjectId={null} // Main sidebar shows chats without project (or root chats)
        onSuccess={() => {
           // Success handling is done via event listener in useEffect
           setSessionToMove(null)
        }}
      />

      <ChatSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />
    </div>
  )
}
