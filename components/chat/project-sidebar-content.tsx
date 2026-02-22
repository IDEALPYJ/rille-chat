"use client"

import { useState, useEffect, useCallback, useMemo } from "react";

// 文件大小格式化函数 - 移到组件外部
const formatFileSize = (size: number): string => {
  if (size <= 0 || isNaN(size)) return '';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
};
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  FolderKanban,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  Plus,
  Download,
  Briefcase, Code, GraduationCap, Heart, Rocket, Smile, Anchor, Book, Camera, Coffee, Cpu, Database, Flag, Gift, Globe, Home, Image, Key, Lamp, Music, Palette, Phone, Search, Send, Shield, Star, Sun, Tag, Terminal,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { MoveChatDialog } from "./move-chat-dialog"
import { useI18n } from "@/lib/i18n/context"
import { SidebarToast } from "@/components/ui/sidebar-toast"
import { truncateFileName } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"


const PROJECT_ICONS: Record<string, any> = {
  "folder-kanban": FolderKanban,
  "briefcase": Briefcase,
  "code": Code,
  "graduation-cap": GraduationCap,
  "heart": Heart,
  "rocket": Rocket,
  "smile": Smile,
  "anchor": Anchor,
  "book": Book,
  "camera": Camera,
  "coffee": Coffee,
  "cpu": Cpu,
  "database": Database,
  "flag": Flag,
  "gift": Gift,
  "globe": Globe,
  "home": Home,
  "image": Image,
  "key": Key,
  "lamp": Lamp,
  "music": Music,
  "palette": Palette,
  "phone": Phone,
  "search": Search,
  "send": Send,
  "shield": Shield,
  "star": Star,
  "sun": Sun,
  "tag": Tag,
  "terminal": Terminal,
};

interface ProjectSidebarContentProps {
  projectId: string;
  onLinkClick?: () => void;
}

export function ProjectSidebarContent({ projectId, onLinkClick }: ProjectSidebarContentProps) {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [project, setProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "info" | "warning" | "error" }>>([]);

  // 删除确认弹窗状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isDeleteFileDialogOpen, setIsDeleteFileDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  
  // 下载错误提示弹窗状态
  const [isDownloadErrorDialogOpen, setIsDownloadErrorDialogOpen] = useState(false)
  const [downloadErrorMessage, setDownloadErrorMessage] = useState("")

  const showToast = useCallback((message: string, type: "info" | "warning" | "error" = "info") => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [{ id, message, type }, ...prev]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 移动对话状态
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false)
  const [sessionToMove, setSessionToMove] = useState<string | null>(null)

  // 重命名状态
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  // 编辑项目状态
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false)
  const [editProjectName, setEditProjectName] = useState("")
  const [editProjectIcon, setEditProjectIcon] = useState("folder-kanban")
  const [editProjectDescription, setEditProjectDescription] = useState("")
  const [isSavingProject, setIsSavingProject] = useState(false)
  
  // 记忆管理状态
  const [projectMemories, setProjectMemories] = useState<Array<{ id: string; content: string; createdAt: string }>>([])
  const [isLoadingMemories, setIsLoadingMemories] = useState(false)
  const [memorySearchQuery, setMemorySearchQuery] = useState("")
  const [isDeletingMemory, setIsDeletingMemory] = useState<string | null>(null)

  // 使用 useMemo 缓存过滤后的记忆列表
  const filteredMemories = useMemo(() => {
    if (!memorySearchQuery.trim()) return projectMemories
    const query = memorySearchQuery.toLowerCase()
    return projectMemories.filter(m => m.content.toLowerCase().includes(query))
  }, [projectMemories, memorySearchQuery])

  // 加载项目详情
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects?id=${projectId}`);
        if (response.ok) {
          const data = await response.json();
          setProject(data.project);
          // 初始化编辑表单
          if (data.project) {
            setEditProjectName(data.project.name || "");
            setEditProjectIcon(data.project.icon || "folder-kanban");
            setEditProjectDescription(data.project.description || "");
          }
        }
      } catch (_error) {
        console.error("加载项目失败:", _error);
      }
    };
    if (projectId) fetchProject();
  }, [projectId]);

  const handleSaveProject = async () => {
    if (!editProjectName.trim()) return;
    setIsSavingProject(true);
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          name: editProjectName.trim(),
          icon: editProjectIcon,
          description: editProjectDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
        setIsEditProjectDialogOpen(false);
        showToast("项目已更新", "info");
      } else {
        showToast("更新项目失败", "error");
      }
    } catch (_error) {
      console.error("更新项目失败:", _error);
      showToast("更新项目失败", "error");
    } finally {
      setIsSavingProject(false);
    }
  };

  // 获取项目记忆
  const fetchProjectMemories = useCallback(async () => {
    if (!projectId || !project?.memoryIsolated) return;
    setIsLoadingMemories(true);
    try {
      const response = await fetch(`/api/user/memory?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // 只显示属于当前项目的记忆
        const filtered = (data.memories || []).filter((m: any) => m.projectId === projectId);
        setProjectMemories(filtered);
      }
    } catch (_error) {
      console.error("加载项目记忆失败:", _error);
    } finally {
      setIsLoadingMemories(false);
    }
  }, [projectId, project?.memoryIsolated]);

  // 删除记忆
  const handleDeleteMemory = async (memoryId: string) => {
    setIsDeletingMemory(memoryId);
    try {
      const response = await fetch("/api/user/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memoryId }),
      });
      if (response.ok) {
        setProjectMemories(prev => prev.filter(m => m.id !== memoryId));
        showToast("记忆已删除", "info");
      } else {
        showToast("删除记忆失败", "error");
      }
    } catch (_error) {
      console.error("删除记忆失败:", _error);
      showToast("删除记忆失败", "error");
    } finally {
      setIsDeletingMemory(null);
    }
  };

  // 当对话框打开时加载记忆
  useEffect(() => {
    if (isEditProjectDialogOpen && project?.memoryIsolated) {
      fetchProjectMemories();
      setMemorySearchQuery("");
    }
  }, [isEditProjectDialogOpen, project?.memoryIsolated, fetchProjectMemories]);

  const fetchSessions = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingSessions(true);
    try {
      const response = await fetch(`/api/chat/history?projectId=${projectId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        const sortedData = (data.sessions || []).sort((a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setSessions(sortedData);
      }
    } catch (_error) {
      console.error("加载项目会话失败:", _error);
    } finally {
      if (showLoading) setIsLoadingSessions(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchSessions(sessions.length === 0);
    }
  }, [projectId, sessionId, fetchSessions, sessions.length]);

  // 监听刷新事件
  useEffect(() => {
    const handleRefresh = (e: any) => {
      const detail = e.detail;
      if (detail?.projectId === projectId) {
        if (detail?.sessionId) {
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
        fetchSessions(false);
      }
    };

    window.addEventListener('refresh-sessions', handleRefresh as any);
    return () => window.removeEventListener('refresh-sessions', handleRefresh as any);
  }, [projectId, fetchSessions]);

  // 加载项目文件
  const fetchFiles = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/projects/files?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const newFiles = data.files || [];
        
        // 检测是否有文件被删除（之前在处理中，现在消失了）
        setFiles(prevFiles => {
          const currentFileIds = new Set(newFiles.map((f: any) => f.id));
          const deletedFiles = prevFiles.filter((f: any) => 
            f.status === 'processing' && !currentFileIds.has(f.id)
          );
          
          // 如果有文件被删除，显示提示
          if (deletedFiles.length > 0) {
            deletedFiles.forEach((file: any) => {
              showToast(`文件 "${file.name}" 无法提取内容，已自动删除`, "warning");
            });
          }
          
          return newFiles;
        });
      }
    } catch (_error) {
      console.error("加载项目文件失败:", _error);
    } finally {
      if (showLoading) setIsLoadingFiles(false);
    }
  }, [projectId, showToast]);

  useEffect(() => {
    if (projectId && activeTab === "files") {
      fetchFiles();
    }
  }, [projectId, activeTab, fetchFiles]);
  
  // 监听文件上传完成事件
  useEffect(() => {
    const handleFileUploaded = () => {
      if (activeTab === "files") {
        fetchFiles(false);
      }
    };
    
    window.addEventListener('file-uploaded', handleFileUploaded);
    return () => window.removeEventListener('file-uploaded', handleFileUploaded);
  }, [activeTab, projectId, fetchFiles]);
  
  // 轮询检查文件处理状态（当有文件正在处理时）
  useEffect(() => {
    if (activeTab !== "files" || !projectId) return;
    
    const hasProcessingFiles = files.some(f => f.status === 'processing');
    if (!hasProcessingFiles) return;
    
    // 每3秒轮询一次
    const interval = setInterval(() => {
      fetchFiles(false);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [activeTab, projectId, files.length, fetchFiles]); // 添加 fetchFiles 依赖

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
        router.push(`/chat/projects/${projectId}`)
        if (onLinkClick) onLinkClick();
      }
    } catch (_error) {
      console.error("删除会话失败:", _error)
    } finally {
      setIsDeleteDialogOpen(false)
      setSessionToDelete(null)
    }
  }

  const handleMoveSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setSessionToMove(sessionId)
    setIsMoveDialogOpen(true)
  }

  const handleRenameSession = async (session: any, e: React.MouseEvent) => {
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
    } catch (_error) {
      console.error("重命名会话失败:", _error)
    } finally {
      setEditingSessionId(null)
      setEditingTitle("")
    }
  }

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setFileToDelete(fileId)
    setIsDeleteFileDialogOpen(true)
  }

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setIsLoadingFiles(true);
    const uploadPromises = files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file as Blob);
        formData.append('projectId', projectId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        // 检查是否是重复文件（无论响应状态如何）
        if (result.duplicate === true || result.error === 'duplicate') {
          showToast(`文件 "${file.name}" 已存在，跳过上传`, "warning");
          return { success: true, fileName: file.name, duplicate: true };
        }
        
        if (!response.ok) {
          console.error(`上传文件 ${file.name} 失败:`, result);
          return { success: false, fileName: file.name, error: result };
        }
        return { success: true, fileName: file.name };
      } catch (_error) {
        console.error(`上传文件 ${file.name} 失败:`, _error);
        return { success: false, fileName: file.name, error: _error };
      }
    });

    // 使用Promise.allSettled确保所有文件都尝试上传，即使有失败也不影响其他文件
    await Promise.allSettled(uploadPromises);
    
    // 刷新文件列表
    await fetchFiles(false);
    // 触发文件上传完成事件
    window.dispatchEvent(new CustomEvent('file-uploaded'));
    setIsLoadingFiles(false);
  }

  const handleDownloadFile = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `下载失败（${response.status}）`;
        setDownloadErrorMessage(errorMessage);
        setIsDownloadErrorDialogOpen(true);
        return;
      }
      const blob = await response.blob();
      
      // 检查blob是否为空或错误响应
      if (blob.type === 'application/json') {
        const errorData = await blob.text().then(text => {
          try {
            return JSON.parse(text);
          } catch {
            return { error: '下载失败' };
          }
        });
        setDownloadErrorMessage(errorData.error || errorData.message || '下载失败');
        setIsDownloadErrorDialogOpen(true);
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (_error) {
      console.error("下载文件失败:", _error);
      const errorMessage = _error instanceof Error ? _error.message : '下载文件失败，请稍后重试';
      setDownloadErrorMessage(errorMessage);
      setIsDownloadErrorDialogOpen(true);
    }
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      const response = await fetch(`/api/files/${fileToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }
      
      setFiles(files.filter(f => f.id !== fileToDelete))
    } catch (_error) {
      console.error("删除文件失败:", _error)
    } finally {
      setIsDeleteFileDialogOpen(false)
      setFileToDelete(null)
    }
  }

  // 使用 useMemo 缓存分组计算
  const groupedSessions = useMemo(() => {
    return sessions.reduce((groups, session) => {
      const date = new Date(session.updatedAt)
      const locale = language === 'en' ? 'en-US' : 'zh-CN'
      const month = date.toLocaleString(locale, { month: 'long', year: 'numeric' })
      if (!groups[month]) {
        groups[month] = []
      }
      groups[month].push(session)
      return groups
    }, {} as Record<string, any[]>)
  }, [sessions, language])

  const ProjectIcon = (project?.icon && PROJECT_ICONS[project.icon]) || FolderKanban;

  return (
    <>
      {/* 项目头部 - 与图像侧边栏样式对齐 */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted dark:hover:bg-muted transition-colors text-xs font-medium text-foreground dark:text-foreground cursor-pointer" onClick={() => setIsEditProjectDialogOpen(true)}>
            <ProjectIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{project?.name}</span>
          </div>
        </div>
      </div>

      {/* 切换卡片组件 */}
      <div className="flex flex-col flex-1 overflow-hidden px-3">
        <div className="flex gap-[2px]">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex-1 h-7 text-xs font-normal transition-colors rounded-md flex items-center justify-center gap-x-1.5",
              activeTab === "chat"
                ? "text-foreground bg-muted dark:bg-muted/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/30"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{t("project.chat")}</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={cn(
              "flex-1 h-7 text-xs font-normal transition-colors rounded-md flex items-center justify-center gap-x-1.5",
              activeTab === "files"
                ? "text-foreground bg-muted dark:bg-muted/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/30"
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            <span>{t("project.files")}</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden pt-1">
          {activeTab === "chat" ? (
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-[2px]">
                <button
                  className="h-7 w-full flex items-center justify-start gap-x-1.5 font-normal px-2 rounded-md hover:bg-muted dark:hover:bg-muted/50 transition-colors duration-300 ease-in-out text-xs text-foreground"
                  onClick={() => {
                    router.push(`/chat/projects/${projectId}`)
                    if (onLinkClick) onLinkClick()
                  }}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span>{t("project.newChat")}</span>
                </button>
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length > 0 ? (
                  Object.entries(groupedSessions).map(([month, monthSessions]: [string, any]) => (
                    <div key={month} className="mb-4">
                      <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                        {month}
                      </div>
                      <div className="space-y-[1px]">
                        {monthSessions.map((s: any) => (
                          <div
                            key={s.id}
                            className={cn(
                              "relative group w-full rounded-sm hover:bg-muted/50 transition-colors",
                              sessionId === s.id && "bg-muted/50"
                            )}
                          >
                            {editingSessionId === s.id ? (
                              <div className="w-full flex items-center justify-between text-foreground font-normal h-7 py-0 px-2" onClick={(e) => e.stopPropagation()}>
                                <form onSubmit={confirmRenameSession} className="flex-1 flex items-center overflow-hidden mr-2">
                                  <input
                                    autoFocus
                                    className="bg-transparent border-none outline-none text-xs font-normal w-full p-0 m-0 focus:ring-0 focus:outline-none text-foreground"
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
                                    className="size-6 p-0.5 hover:bg-muted rounded-[var(--radius-sm)] text-muted-foreground transition-colors"
                                  >
                                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setEditingSessionId(null)
                                    }}
                                    className="size-6 p-0.5 hover:bg-muted rounded-[var(--radius-sm)] text-muted-foreground transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Link
                                  href={`/chat/projects/${projectId}?id=${s.id}`}
                                  className="block w-full"
                                  onClick={() => {
                                    if (onLinkClick) onLinkClick()
                                  }}
                                >
                                  <div className="w-full flex items-center justify-start text-foreground font-normal h-7 py-0 pl-2 pr-8">
                                    <div className="flex flex-col items-start w-full overflow-hidden max-w-[284px]">
                                      <span className="font-normal text-xs truncate w-full text-fade-out">
                                        {s.title || t("project.newChat")}
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
                                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-32 p-1 rounded-[10px]">
                                        <DropdownMenuItem
                                          className="cursor-pointer text-xs text-foreground focus:bg-muted focus:text-foreground rounded-[6px]"
                                          onClick={(e) => handleRenameSession(s, e)}
                                        >
                                          <Pencil className="mr-2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                          {t("project.rename")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="cursor-pointer text-xs text-foreground focus:bg-muted focus:text-foreground rounded-[6px]"
                                          onClick={(e) => handleMoveSession(s.id, e)}
                                        >
                                          <FolderKanban className="mr-2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                          {t("project.moveToProject")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="cursor-pointer text-xs rounded-[6px] text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                          onClick={(e) => handleDeleteSession(s.id, e)}
                                        >
                                          <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                                          {t("project.delete")}
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
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <Clock className="h-8 w-8 text-foreground/70 dark:text-foreground/80 mb-2" strokeWidth={1.5} />
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center">{t("project.noChatHistory")}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full relative flex flex-col"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isDragging) setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);

                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                  handleFileUpload(Array.from(files));
                }
              }}
            >
              {/* 拖拽上传覆盖层 */}
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-white/80 dark:bg-background/80backdrop-blur-sm border-2 border-dashed border-primary rounded-lg flex items-center justify-center transition-all duration-200 pointer-events-none">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in zoom-in duration-200">
                    <p className="font-medium text-medium text-foreground dark:text-foreground">
                      释放文件以上传
                    </p>
                  </div>
                </div>
              )}
              <ScrollArea className="flex-1 min-h-0 w-full overflow-x-hidden">
                <div className="flex flex-col gap-[2px] w-full max-w-full box-border">
                <button
                  className="h-7 w-full flex items-center justify-start gap-x-1.5 font-normal px-2 rounded-md hover:bg-muted dark:hover:bg-muted/50 transition-colors duration-300 ease-in-out text-xs text-foreground"
                  onClick={() => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.multiple = true;
                    fileInput.accept = '*/*';
                    fileInput.onchange = async (e: any) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      handleFileUpload(Array.from(files));
                    };
                    fileInput.click();
                  }}
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                  <span>{t("project.uploadFile")}</span>
                </button>
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : files.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 w-full">
                    {files.map((file, idx) => {
                      const isEmbedded = file.status === 'completed' && file.tokens > 0;
                      return (
                        <div
                          key={file.id || idx}
                          className="group relative flex items-center gap-2 md:gap-3 p-2 rounded-lg border bg-card/50 hover:border-border transition-all cursor-grab active:cursor-grabbing min-w-0 w-full overflow-hidden box-border"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'link';
                            e.dataTransfer.setData('application/file-id', file.id);
                            e.dataTransfer.setData('application/json', JSON.stringify({ id: file.id, name: file.name, url: file.url, type: file.type, size: file.size }));
                            e.dataTransfer.setData('text/plain', file.name);
                          }}
                        >
                          {/* Left Icon */}
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                            isEmbedded
                              ? "bg-blue-100 dark:bg-blue-900/30"
                              : "bg-muted/50"
                          )}>
                            <FileText className={cn(
                              "h-4 w-4",
                              isEmbedded
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-muted-foreground"
                            )} />
                          </div>

                          {/* Middle Info - strictly constrained */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={cn(
                              "text-sm font-medium truncate leading-tight",
                              file.status === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-foreground'
                            )} title={file.name}>
                              {truncateFileName(file.name, 40)}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-muted-foreground/70 uppercase truncate">
                                {formatFileSize(Number(file.size))}
                                {file.status === 'processing' && ' · 处理中...'}
                                {file.tokens && file.tokens > 0 ? ` · ${file.tokens} tokens` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Right Action */}
                          <div className="shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-[5px] opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-32 p-1 rounded-[10px]">
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs text-foreground focus:bg-muted focus:text-foreground rounded-[6px]"
                                  onClick={(e) => handleDownloadFile(file.id, file.name, e)}
                                >
                                  <Download className="mr-2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                                  下载
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer text-xs rounded-[6px] text-destructive focus:text-destructive hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-950 dark:focus:bg-red-950"
                                  onClick={(e) => handleDeleteFile(file.id, e)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                                  {t("project.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">{t("project.noProjectFiles")}</p>
                  </div>
                )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("sidebar.deleteConversation")}
        description={t("sidebar.deleteConversationDesc")}
        confirmText={t("project.delete")}
        cancelText={t("common.cancel")}
        onConfirm={confirmDeleteSession}
        variant="destructive"
      />
      <ConfirmDialog
        open={isDeleteFileDialogOpen}
        onOpenChange={setIsDeleteFileDialogOpen}
        title="删除文件"
        description="确定要删除此文件吗？删除后将无法恢复，包括文件本身、对应的向量数据和与项目的关联关系。"
        confirmText={t("project.delete")}
        cancelText={t("common.cancel")}
        onConfirm={confirmDeleteFile}
        variant="destructive"
      />
      <ConfirmDialog
        open={isDownloadErrorDialogOpen}
        onOpenChange={setIsDownloadErrorDialogOpen}
        title="下载失败"
        description={downloadErrorMessage || "下载文件失败，请稍后重试"}
        confirmText="确定"
        onConfirm={() => setIsDownloadErrorDialogOpen(false)}
        cancelText={undefined}
        variant="default"
      />
      <MoveChatDialog
        open={isMoveDialogOpen}
        onOpenChange={setIsMoveDialogOpen}
        sessionId={sessionToMove}
        currentProjectId={projectId}
        onSuccess={() => {
           setSessionToMove(null)
           if (sessionId && sessionToMove === sessionId) {
              // If current viewing session is moved, redirect to project page
              router.push(`/chat/projects/${projectId}`)
           }
        }}
      />
      {/* 编辑项目对话框 */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px] p-4 sm:p-6 overflow-hidden border-none shadow-2xl [&>button]:hidden"
          overlayClassName="bg-background/80 backdrop-blur-sm"
        >
          <DialogTitle className="sr-only">{t("project.editProject")}</DialogTitle>
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/50 dark:border-border/50">
              <h2 className="text-base font-semibold text-foreground dark:text-foreground">
                {t("project.editProject")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditProjectDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="pt-4 space-y-4">
              {/* Icon & Name Row */}
              <div className="flex items-center gap-2 md:gap-3 pl-1 pr-3 py-1 bg-muted/80 rounded-lg border focus-within:ring-1 focus-within:ring-ring transition-shadow">
                {/* Icon Picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-8 h-8 p-0 flex items-center justify-center hover:bg-muted rounded-lg transition-colors focus-visible:ring-0"
                    >
                      {(() => {
                        const IconComponent = PROJECT_ICONS[editProjectIcon] || PROJECT_ICONS["folder-kanban"];
                        return <IconComponent className="h-4.5 w-4.5 text-muted-foreground" />;
                      })()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="p-1 rounded-[10px] w-full max-w-[280px]">
                    <div className="grid grid-cols-6 gap-1">
                      {Object.entries(PROJECT_ICONS).map(([key, IconComponent]) => (
                        <DropdownMenuItem
                          key={key}
                          className={cn(
                            "flex items-center justify-center p-2 cursor-pointer rounded-[6px] hover:bg-muted",
                            editProjectIcon === key && "bg-muted text-foreground"
                          )}
                          onClick={() => setEditProjectIcon(key)}
                        >
                          <IconComponent className="h-5 w-5" />
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Name Input */}
                <Input
                  id="edit-name"
                  placeholder={t("project.projectNamePlaceholder")}
                  className="flex-1 h-8 text-sm font-medium border-none bg-transparent focus-visible:ring-0 px-0 shadow-none"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Description */}
              <Textarea
                id="edit-description"
                placeholder={t("project.projectDescriptionPlaceholder")}
                className="min-h-[100px] text-sm resize-none border-none bg-card/50 focus-visible:ring-1 focus-visible:ring-ring p-3 rounded-[var(--radius-lg)] transition-shadow shadow-none"
                value={editProjectDescription}
                onChange={(e) => setEditProjectDescription(e.target.value)}
              />

              {/* 记忆管理 - 只有memoryIsolated为true时才显示 */}
              {project && project.memoryIsolated && (
                <div className="pt-4 border-t border-border/50 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <Label className="text-xs font-semibold text-foreground">
                  项目记忆管理
                </Label>
              </div>

              {/* 搜索框 */}
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索记忆..."
                  className="pl-9 h-9 text-sm"
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                />
                {memorySearchQuery && (
                  <button
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setMemorySearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 记忆列表 */}
              <ScrollArea className="max-h-[300px]">
                {isLoadingMemories ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">加载中...</p>
                  </div>
                ) : filteredMemories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-xs">暂无项目记忆</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMemories.map((memory) => (
                        <div
                          key={memory.id}
                          className="group flex items-start gap-2 md:gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                        >
                          <div className="flex-1 space-y-1 min-w-0">
                            <p className="text-xs leading-relaxed text-foreground break-words">
                              {memory.content}
                            </p>
                            <span className="text-[10px] text-muted-foreground/70">
                              {format(new Date(memory.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDeleteMemory(memory.id)}
                            disabled={isDeletingMemory === memory.id}
                          >
                            {isDeletingMemory === memory.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-4 gap-2 border-t border-border/50 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditProjectDialogOpen(false)}
                className="px-4 h-8 rounded-full text-xs font-medium"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSaveProject}
                disabled={isSavingProject || !editProjectName.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 md:px-6 h-8 rounded-full text-xs font-medium"
              >
                {isSavingProject ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {t("project.updating")}
                  </>
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast 通知 - 固定在页面顶部 */}
      {toasts.map(toast => (
        <SidebarToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={6000}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
}