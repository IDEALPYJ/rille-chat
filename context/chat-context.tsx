"use client";

import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Message, Attachment, AdvancedSettings, ReasoningSettings } from "@/lib/types";
import {
  getMessageBranch,
  findLatestLeaf,
  addMessageToTree,
  updateMessageInTree
} from "@/lib/tree-utils";
import { loadModelConfigsForProvider } from "@/lib/data/models";
import { getAvatarFromModelId } from "@/lib/config/icon-mappings";

interface ChatContextType {
  // 状态
  messages: Message[];
  allMessages: Message[];
  currentLeafId: string | null;
  isLoading: boolean;
  isLoadingHistory: boolean;
  sessionId: string | null;
  projectId: string | null;
  loadedSessionId: string | null;
  sessionTitle: string | null;

  // 动作
  setSessionId: (id: string | null) => void;
  setProjectId: (id: string | null) => void;
  setCurrentLeafId: (id: string | null) => void;
  loadHistory: (sid: string) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  hasMoreHistory: boolean;
  handleSubmit: (inputValue: string, attachments?: Attachment[], options?: ChatOptions) => Promise<void>;
  handleRegenerate: (messageId: string, options?: ChatOptions) => Promise<void>;
  handleEdit: (messageId: string, newContent: string, options?: ChatOptions) => Promise<void>;
  handleFork: (messageId: string) => Promise<void>;
  handleStop: () => void;
  clearMessages: () => void;

  // 后台消息通知状态
  backgroundTask: {
    sessionId: string;
    projectId: string | null;
    title?: string;
    model?: string;
    provider?: string;
    status: 'running' | 'completed';
    summary?: string;
  } | null;
  dismissNotification: () => void;
}

interface ChatOptions {
  selectedProvider: string | null;
  selectedModel: string | null;
  webSearch: boolean;
  webSearchSource?: {
    type: 'builtin' | 'external';
    provider?: string;
    options?: Record<string, any>;
  };
  vectorSearch: boolean;
  reasoning: ReasoningSettings;
  enabledTools?: string[];
  advancedSettings?: AdvancedSettings;
  voiceInfo?: { audioUrl: string; audioDuration: number };
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 核心状态
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [currentLeafId, setCurrentLeafId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);

  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // 后台任务通知
  const [backgroundTask, setBackgroundTask] = useState<{
    sessionId: string;
    projectId: string | null;
    title?: string;
    model?: string;
    provider?: string;
    status: 'running' | 'completed';
    summary?: string;
  } | null>(null);

  // Refs
  const loadedSessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const historyAbortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);

  // 保持 Ref 同步
  useEffect(() => {
    currentSessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    currentProjectIdRef.current = projectId;
  }, [projectId]);

  // 组件卸载时终止请求
  useEffect(() => {
    return () => {
      if (historyAbortControllerRef.current) historyAbortControllerRef.current.abort();
    };
  }, []);

  // 派生当前分支
  const messages = getMessageBranch(allMessages, currentLeafId);

  const refreshSidebar = useCallback((targetSessionId?: string) => {
    window.dispatchEvent(new CustomEvent('refresh-sessions', {
      detail: { sessionId: targetSessionId, projectId: currentProjectIdRef.current }
    }));
  }, []);

  const loadHistory = useCallback(async (sid: string) => {
    // 如果已经加载了该 session，避免重复加载覆盖当前状态
    // 特别是在新会话创建时，processStream 会预先设置 loadedSessionIdRef
    if (sid === loadedSessionIdRef.current) {
      return;
    }

    if (historyAbortControllerRef.current) {
      historyAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    historyAbortControllerRef.current = controller;

    setIsLoadingHistory(true);
    try {
      // 初始加载限制为 50 条
      const limit = 50;
      const response = await fetch(`/api/chat/history?sessionId=${sid}&msgLimit=${limit}`, {
        signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        const historyMessages: Message[] = data.messages;
        setAllMessages(historyMessages);
        setHasMoreHistory(!!data.hasMore);

        if (historyMessages.length > 0) {
          const latestLeafId = findLatestLeaf(historyMessages);
          setCurrentLeafId(latestLeafId);
        }
        setLoadedSessionId(sid);
        loadedSessionIdRef.current = sid;

        // 设置会话标题
        if (data.session?.title) {
          setSessionTitle(data.session.title);
        }
      } else if (response.status === 404) {
        // Session not found
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Failed to load history:", error);
      }
    } finally {
      if (historyAbortControllerRef.current === controller) {
        setIsLoadingHistory(false);
      }
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (!sessionId || !hasMoreHistory || isLoadingHistory) return;

    // 找到最旧的消息作为 cursor
    const oldestMessage = allMessages.length > 0
      ? allMessages.reduce((prev, curr) =>
        (new Date(prev.createdAt || 0) < new Date(curr.createdAt || 0) ? prev : curr)
      )
      : null;

    if (!oldestMessage) return;

    setIsLoadingHistory(true);
    try {
      const limit = 50;
      const cursor = oldestMessage.createdAt; // 使用 createdAt 作为游标
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}&msgLimit=${limit}&before=${cursor}`, {
      });

      if (response.ok) {
        const data = await response.json();
        const moreMessages: Message[] = data.messages;

        if (moreMessages.length > 0) {
          setAllMessages(prev => {
            // 合并消息，避免重复
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = moreMessages.filter(m => !existingIds.has(m.id));
            return [...newMessages, ...prev]; // 新消息（旧历史）在前
          });
        }
        setHasMoreHistory(!!data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [sessionId, hasMoreHistory, isLoadingHistory, allMessages]);

  const processStream = useCallback(async (
    apiMessages: any[],
    parentId: string,
    currentSessionId: string | null,
    options: ChatOptions
  ) => {
    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 获取用户问题的简略作为标题
    const lastUserMessage = apiMessages.filter(m => m.role === 'user').pop();
    const userQueryTitle = lastUserMessage
      ? (lastUserMessage.content.length > 20 ? lastUserMessage.content.slice(0, 20) + "..." : lastUserMessage.content)
      : "新对话";

    // 设置后台任务状态
    const taskSessionId = currentSessionId || 'temp-session';
    setBackgroundTask({
      sessionId: taskSessionId,
      projectId: currentProjectIdRef.current,
      title: userQueryTitle,
      model: options.selectedModel || undefined,
      provider: options.selectedProvider || undefined,
      status: 'running'
    });

    // 提前创建 AI 消息占位，以便立即显示加载状态
    const assistantMsgId = (options as any)?.responseMessageId || crypto.randomUUID();

    // 获取模型头像
    let modelAvatar: string | undefined;
    if (options.selectedProvider && options.selectedModel) {
      try {
        const modelConfigs = await loadModelConfigsForProvider(options.selectedProvider);
        const modelConfig = modelConfigs.find(m => m.id === options.selectedModel);
        modelAvatar = modelConfig?.avatar || getAvatarFromModelId(options.selectedModel);
      } catch {
        // 如果加载失败，尝试从模型ID推断
        modelAvatar = getAvatarFromModelId(options.selectedModel);
      }
    }

    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: "",
      reasoning_content: "",
      search_results: "",
      parentId: parentId,
      model: options.selectedModel || undefined,
      provider: options.selectedProvider || undefined,
      modelAvatar: modelAvatar,
    };

    setAllMessages(prev => addMessageToTree(prev, assistantPlaceholder));
    setCurrentLeafId(assistantMsgId);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: currentSessionId,
          projectId: currentProjectIdRef.current,
          provider: options.selectedProvider,
          model: options.selectedModel,
          webSearch: options.webSearch,
          webSearchSource: options.webSearchSource,
          vectorSearch: options.vectorSearch,
          reasoning: options.reasoning,
          enabledTools: options.enabledTools,
          advancedSettings: options.advancedSettings,
          responseMessageId: (options as any).responseMessageId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text();
          errorData = { error: errorText || `Server Error: ${response.status}` };
        }

        setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
          status: 'error',
          error: errorData.error,
          errorCode: errorData.code || String(response.status)
        }));
        setIsLoading(false);
        setBackgroundTask(null);
        return;
      }
      if (!response.body) throw new Error("No response body");

      // [新增] 立即获取 Session ID 并刷新 Sidebar（实现“即时历史记录”）
      // 注意：x-session-id 应该在响应头中返回
      const initialSessionId = response.headers.get("x-session-id");
      if (initialSessionId) {
        // 更新后台任务ID
        setBackgroundTask(prev => prev ? { ...prev, sessionId: initialSessionId } : null);

        // 如果是新会话，立即在前端设置为当前会话并刷新列表
        if (!currentSessionId) {
          setSessionId(initialSessionId);
          setSessionTitle(userQueryTitle);

          // 替换 URL 但不刷新页面
          const newUrl = projectId
            ? `/chat/projects/${projectId}?id=${initialSessionId}`
            : `/chat?id=${initialSessionId}`;
          window.history.replaceState(null, '', newUrl);

          refreshSidebar(initialSessionId);
        } else {
          // 已有会话也刷新一下，更新时间戳
          refreshSidebar(currentSessionId);
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessageContent = "";
      let assistantReasoningContent = "";
      let assistantSearchResults = "";
      let assistantRetrievalChunks = "";
      let assistantUsage: any = null;
      let assistantSessionId = initialSessionId || ""; // 初始化为 header 中的 ID
      let assistantContentParts: any[] = []; // [新增] 结构化内容

      let buffer = "";
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 80;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // 只有当当前显示的会话与正在生成的会话一致时（或者正在生成的是新会话且当前未选择会话），才更新 UI
          // 注意：如果 currentSessionIdRef.current 为 null，说明可能是刚创建的新会话，这时候也应该更新
          const isCurrentSession = !currentSessionIdRef.current || currentSessionIdRef.current === assistantSessionId;

          if (isCurrentSession) {
            setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
              content: assistantMessageContent,
              reasoning_content: assistantReasoningContent,
              search_results: assistantSearchResults,
              retrieval_chunks: assistantRetrievalChunks || undefined,
              contentParts: assistantContentParts.length > 0 ? assistantContentParts : undefined,
              ...(assistantUsage ? {
                input_tokens: assistantUsage.prompt_tokens,
                output_tokens: assistantUsage.completion_tokens,
                total_tokens: assistantUsage.total_tokens,
                input_cache_tokens: assistantUsage.prompt_tokens_details?.cached_tokens,
                output_cache_tokens: assistantUsage.completion_tokens_details?.reasoning_tokens,
              } : {})
            }));
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let hasNewData = false;
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.sessionId !== undefined && !assistantSessionId) {
              assistantSessionId = data.sessionId;
              // 更新后台任务的 sessionId (如果之前没拿到)
              setBackgroundTask(prev => prev ? { ...prev, sessionId: data.sessionId } : null);
            }
            if (data.c !== undefined) {
              assistantMessageContent += data.c;
              // 更新 contentParts（使用不可变更新）
              const lastPart = assistantContentParts[assistantContentParts.length - 1];
              if (lastPart && lastPart.type === 'text') {
                assistantContentParts = [
                  ...assistantContentParts.slice(0, -1),
                  { ...lastPart, content: lastPart.content + data.c }
                ];
              } else {
                assistantContentParts = [...assistantContentParts, { type: 'text', content: data.c }];
              }
              hasNewData = true;
            }
            if (data.r !== undefined) { assistantReasoningContent += data.r; hasNewData = true; }
            if (data.s !== undefined) { assistantSearchResults += data.s; hasNewData = true; }
            if (data.rc !== undefined) { assistantRetrievalChunks = data.rc; hasNewData = true; }
            if (data.tc !== undefined) {
              // 旧版兼容：MCP工具调用信息
              setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
                mcp_tool_calls: data.tc
              }));
              // 同时将其转换为 contentParts 的初始状态（如果尚未存在）
              if (assistantContentParts.length === 0 && Array.isArray(data.tc)) {
                data.tc.forEach((info: any) => {
                  assistantContentParts.push({ type: 'tool_call', info });
                });
              }
              hasNewData = true;
            }
            if (data.te !== undefined) {
              // [新增] 处理流式工具事件
              const event = data.te;
              if (event.type === 'tool_start') {
                assistantContentParts.push({ type: 'tool_call', info: event.info });
              } else if (event.type === 'tool_result') {
                const existingPart = assistantContentParts.find(p => p.type === 'tool_call' && p.info.toolCallId === event.info.toolCallId);
                if (existingPart) {
                  existingPart.info = event.info;
                }
              }
              hasNewData = true;
            }
            if (data.u !== undefined) { assistantUsage = data.u; hasNewData = true; }
            if (data.e !== undefined) {
              // 处理错误事件
              setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
                status: 'error',
                error: data.e,
                errorCode: 'API_ERROR'
              }));
              hasNewData = true;
            }
            if (data.t !== undefined) {
              // Receive new title
              setSessionTitle(data.t);
              // Also refresh sidebar to reflect title change
              refreshSidebar(assistantSessionId);
            }
          } catch (e) {
            console.error("Error parsing stream line:", e, line);
          }
        }

        const now = Date.now();
        if (hasNewData && now - lastUpdateTime > UPDATE_INTERVAL) {
          const isCurrentSession = !currentSessionIdRef.current || (assistantSessionId && currentSessionIdRef.current === assistantSessionId);

          if (isCurrentSession) {
            setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
              content: assistantMessageContent,
              reasoning_content: assistantReasoningContent,
              search_results: assistantSearchResults,
              retrieval_chunks: assistantRetrievalChunks || undefined,
              contentParts: assistantContentParts.length > 0 ? assistantContentParts : undefined,
              ...(assistantUsage ? {
                input_tokens: assistantUsage.prompt_tokens,
                output_tokens: assistantUsage.completion_tokens,
                total_tokens: assistantUsage.total_tokens,
                input_cache_tokens: assistantUsage.prompt_tokens_details?.cached_tokens,
                output_cache_tokens: assistantUsage.completion_tokens_details?.reasoning_tokens,
              } : {})
            }));
          }
          lastUpdateTime = now;
        }
      }

      const newSessionId = assistantSessionId || response.headers.get("x-session-id");

      // 更新完成后的逻辑
      if (newSessionId) {
        // 确保最终状态同步
        if (!loadedSessionIdRef.current && currentSessionIdRef.current === newSessionId) {
          setLoadedSessionId(newSessionId);
          loadedSessionIdRef.current = newSessionId;
        }

        // 这里的逻辑大部分已经提前处理了，主要是检查后台任务状态

        // 检查用户是否仍在当前页面
        // 如果 currentSessionIdRef.current 等于流结束时的 newSessionId，说明用户还在看着这个会话
        const isStillOnPage = currentSessionIdRef.current === newSessionId;

        if (!isStillOnPage) {
          setBackgroundTask(prev => ({
            sessionId: newSessionId,
            projectId: currentProjectIdRef.current,
            title: prev?.title, // 保持之前的标题
            model: prev?.model,
            provider: prev?.provider,
            status: 'completed',
            summary: assistantMessageContent.slice(0, 60) + (assistantMessageContent.length > 60 ? "..." : "")
          }));
        } else {
          // 如果在当前页面，任务自然结束，不需要显示弹窗
          setBackgroundTask(null);
        }
      }

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Stream error:", err);
        setAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
          errorCode: 'STREAM_ERROR'
        }));
      }
      setBackgroundTask(null); // 出错清除
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [projectId, refreshSidebar, pathname]);

  const handleSubmit = useCallback(async (
    inputValue: string,
    attachments?: Attachment[],
    options?: ChatOptions
  ) => {
    if (!options) return;
    if ((!inputValue.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    const newUserMessageId = crypto.randomUUID();
    const newUserMessage: Message = {
      id: newUserMessageId,
      role: 'user',
      content: inputValue,
      parentId: currentLeafId,
      attachments: attachments?.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        type: a.type,
        size: a.size
      })),
      // 语音消息信息
      isVoiceInput: !!options?.voiceInfo,
      audioUrl: options?.voiceInfo?.audioUrl,
      audioDuration: options?.voiceInfo?.audioDuration,
    };

    const updatedAllMessages = addMessageToTree(allMessages, newUserMessage);
    setAllMessages(updatedAllMessages);
    setCurrentLeafId(newUserMessageId);

    const branch = getMessageBranch(updatedAllMessages, newUserMessageId);
    const apiMessages = branch.map(({ id, role, content, attachments, isVoiceInput, audioUrl, audioDuration }) => {
      const message: any = { id, role, content };
      if (attachments) message.attachments = attachments;
      if (isVoiceInput) message.isVoiceInput = isVoiceInput;
      // 只在有有效值时才包含audioUrl和audioDuration（不能是null或undefined）
      if (audioUrl != null) message.audioUrl = audioUrl;
      if (audioDuration != null) message.audioDuration = audioDuration;
      return message;
    });

    if (currentSessionIdRef.current) {
      refreshSidebar(currentSessionIdRef.current);
    }

    // 预先生成 AI 响应的 ID，以便在前端和后端保持一致
    const assistantMsgId = crypto.randomUUID();

    await processStream(apiMessages, newUserMessageId, currentSessionIdRef.current, { ...options, responseMessageId: assistantMsgId } as any);
  }, [allMessages, currentLeafId, isLoading, processStream, refreshSidebar]);

  const handleRegenerate = useCallback(async (messageId: string, options?: ChatOptions) => {
    if (!options || isLoading) return;

    const targetMessage = allMessages.find(m => m.id === messageId);
    if (!targetMessage || !targetMessage.parentId) return;

    const parentId = targetMessage.parentId;
    const branch = getMessageBranch(allMessages, parentId);
    const apiMessages = branch.map(({ id, role, content }) => ({ id, role, content }));

    const assistantMsgId = crypto.randomUUID();
    await processStream(apiMessages, parentId, currentSessionIdRef.current, { ...options, responseMessageId: assistantMsgId } as any);
  }, [allMessages, isLoading, processStream]);

  const handleEdit = useCallback(async (messageId: string, newContent: string, options?: ChatOptions) => {
    if (!options || isLoading) return;

    const targetMessage = allMessages.find(m => m.id === messageId);
    if (!targetMessage) return;

    const parentId = targetMessage.parentId || null;
    const newUserMessageId = crypto.randomUUID();

    const newUserMessage: Message = {
      id: newUserMessageId,
      role: 'user',
      content: newContent,
      parentId: parentId,
    };

    const updatedAllMessages = addMessageToTree(allMessages, newUserMessage);
    setAllMessages(updatedAllMessages);
    setCurrentLeafId(newUserMessageId);

    const branch = getMessageBranch(updatedAllMessages, newUserMessageId);
    const apiMessages = branch.map(({ id, role, content }) => ({ id, role, content }));

    const assistantMsgId = crypto.randomUUID();
    await processStream(apiMessages, newUserMessageId, currentSessionIdRef.current, { ...options, responseMessageId: assistantMsgId } as any);
  }, [allMessages, isLoading, processStream]);

  const handleFork = useCallback(async (messageId: string) => {
    try {
      const response = await fetch("/api/chat/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (response.ok) {
        const { sessionId: newSessionId } = await response.json();
        const redirectUrl = projectId
          ? `/chat/projects/${projectId}?id=${newSessionId}`
          : `/chat?id=${newSessionId}`;
        router.push(redirectUrl);
        refreshSidebar(newSessionId);
      } else {
        const errorData = await response.json();
        console.error("Failed to fork session:", errorData.error);
      }
    } catch (error) {
      console.error("Error forking session:", error);
    }
  }, [projectId, router, refreshSidebar]);

  const clearMessages = useCallback(() => {
    setAllMessages([]);
    setCurrentLeafId(null);
    setLoadedSessionId(null);
    loadedSessionIdRef.current = null;
    setSessionTitle(null);
  }, []);

  const dismissNotification = useCallback(() => {
    setBackgroundTask(null);
  }, []);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        allMessages,
        currentLeafId,
        isLoading,
        isLoadingHistory,
        sessionId,
        projectId,
        loadedSessionId,
        sessionTitle,
        setSessionId,
        setProjectId,
        setCurrentLeafId,
        loadHistory,
        loadMoreHistory,
        hasMoreHistory,
        handleSubmit,
        handleRegenerate,
        handleEdit,
        handleFork,
        handleStop,
        clearMessages,
        backgroundTask,
        dismissNotification
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}