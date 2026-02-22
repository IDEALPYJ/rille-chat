"use client";

import { useEffect, useRef } from "react";
import { useChatContext } from "@/context/chat-context";
import { Attachment, AdvancedSettings, ReasoningSettings } from "@/lib/types";

interface UseChatSessionOptions {
  sessionId: string | null;
  projectId?: string | null;
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
}

export function useChatSession({
  sessionId,
  projectId,
  selectedProvider,
  selectedModel,
  webSearch,
  webSearchSource,
  vectorSearch,
  reasoning,
  enabledTools,
}: UseChatSessionOptions) {
  const {
    messages,
    allMessages,
    currentLeafId,
    setCurrentLeafId,
    isLoading,
    isLoadingHistory,
    loadHistory,
    loadMoreHistory,
    hasMoreHistory,
    setSessionId,
    setProjectId,
    handleSubmit: contextHandleSubmit,
    handleRegenerate: contextHandleRegenerate,
    handleEdit: contextHandleEdit,
    handleFork,
    handleStop,
    clearMessages,
    loadedSessionId: contextLoadedSessionId,
    projectId: contextProjectId,
    sessionTitle,
    sessionId: contextSessionId,
  } = useChatContext();

  const prevSessionIdRef = useRef<string | null>(sessionId);
  const loadedSessionIdRef = useRef<string | null>(null);

  // 同步 sessionId 到 Context
  useEffect(() => {
    setSessionId(sessionId);
  }, [sessionId, setSessionId]);

  // 管理 projectId 变化和清理
  useEffect(() => {
    const targetProjectId = projectId || null;
    
    // 如果 Context 中的 projectId 与当前目标 projectId 不一致
    // 说明切换了项目上下文（或从项目切换到普通对话），需要清理
    if (contextProjectId !== targetProjectId) {
      // 只有当 Context 中确实有数据需要清理时才调用，避免不必要的重置
      if (contextLoadedSessionId || allMessages.length > 0) {
        clearMessages();
        loadedSessionIdRef.current = null;
      }
      setProjectId(targetProjectId);
    }
  }, [projectId, contextProjectId, setProjectId, clearMessages, contextLoadedSessionId, allMessages.length]);

  // 自动管理历史记录加载和清理
  useEffect(() => {
    if (sessionId) {
      // 只有当 URL 中的 sessionId 改变，且不是当前已加载的 session 时才加载历史
      
      // 1. 如果 Context 中已经完全加载了这个 session
      if (sessionId === contextLoadedSessionId) {
        loadedSessionIdRef.current = sessionId;
        return;
      }

      // 2. 如果是新会话创建过程：
      // - isLoading 为 true (正在生成)
      // - allMessages 不为空 (本地已乐观更新)
      // - 之前没有加载过 session (从新会话页跳转)
      // 此时应该信任本地状态，不重新加载
      if (isLoading && allMessages.length > 0 && !loadedSessionIdRef.current) {
        loadedSessionIdRef.current = sessionId;
        return;
      }

      // 3. 额外的安全检查：如果 Context 中的 sessionId 已经匹配，且正在加载，也跳过
      if (sessionId === contextSessionId && isLoading) {
        loadedSessionIdRef.current = sessionId;
        return;
      }

      if (sessionId !== loadedSessionIdRef.current) {
        loadHistory(sessionId);
        loadedSessionIdRef.current = sessionId;
      }
    } else {
      // 如果没有 sessionId (即新对话页面)
      // 1. 如果之前有加载过 (loadedSessionIdRef.current) 且之前有 sessionId (prevSessionIdRef.current) -> 说明是在当前组件内切换到了新对话
      // 2. 如果 Context 中有 loadedSessionId -> 说明是从其他页面(带Session)跳转过来的新对话页面
      if ((loadedSessionIdRef.current && prevSessionIdRef.current) || contextLoadedSessionId) {
        clearMessages();
        loadedSessionIdRef.current = null;
      }
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId, loadHistory, clearMessages, contextLoadedSessionId, isLoading, allMessages.length, contextSessionId]);

  // 包装 Context 的函数以传入当前选项
  const handleSubmit = async (
    inputValue: string, 
    attachments?: Attachment[], 
    advancedSettings?: AdvancedSettings,
    voiceInfo?: { audioUrl: string; audioDuration: number }
  ) => {
    await contextHandleSubmit(inputValue, attachments, {
      selectedProvider,
      selectedModel,
      webSearch,
      webSearchSource,
      vectorSearch,
      reasoning,
      enabledTools,
      advancedSettings,
      voiceInfo
    });
  };

  const handleRegenerate = async (messageId: string, options?: { advancedSettings?: AdvancedSettings }) => {
    await contextHandleRegenerate(messageId, {
      selectedProvider,
      selectedModel,
      webSearch,
      webSearchSource,
      vectorSearch,
      reasoning,
      enabledTools,
      advancedSettings: options?.advancedSettings
    });
  };

  const handleEdit = async (messageId: string, newContent: string, options?: { advancedSettings?: AdvancedSettings }) => {
    await contextHandleEdit(messageId, newContent, {
      selectedProvider,
      selectedModel,
      webSearch,
      webSearchSource,
      vectorSearch,
      reasoning,
      enabledTools,
      advancedSettings: options?.advancedSettings
    });
  };

  return {
    messages,
    allMessages,
    currentLeafId,
    setCurrentLeafId,
    isLoading,
    isLoadingHistory,
    loadHistory,
    loadMoreHistory,
    hasMoreHistory,
    handleSubmit,
    handleRegenerate,
    handleEdit,
    handleFork,
    handleStop,
    clearMessages,
    sessionTitle,
    // loadedSessionId 不再需要直接暴露，除非外部组件有特定依赖
    loadedSessionId: loadedSessionIdRef.current,
  };
}
