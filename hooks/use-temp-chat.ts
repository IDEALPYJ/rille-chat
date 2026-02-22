"use client";

import { useState, useEffect, useCallback } from "react";
import { Message, Attachment, AdvancedSettings, ReasoningSettings } from "@/lib/types";
import { getMessageBranch, addMessageToTree, updateMessageInTree } from "@/lib/tree-utils";
import { TEMP_CHAT } from "@/lib/constants";

const TEMP_CHAT_STORAGE_KEY = TEMP_CHAT.STORAGE_KEY;

interface UseTempChatOptions {
  isTempChat: boolean;
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

export function useTempChat({
  isTempChat,
  selectedProvider,
  selectedModel,
  webSearch,
  webSearchSource,
  vectorSearch,
  reasoning,
  enabledTools,
}: UseTempChatOptions) {
  const [tempChatAllMessages, setTempChatAllMessages] = useState<Message[]>([]);
  const [tempChatCurrentLeafId, setTempChatCurrentLeafId] = useState<string | null>(null);
  const [tempChatIsLoading, setTempChatIsLoading] = useState(false);

  // 加载临时聊天数据
  useEffect(() => {
    if (isTempChat) {
      try {
        const stored = sessionStorage.getItem(TEMP_CHAT_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          setTempChatAllMessages(data.messages || []);
          setTempChatCurrentLeafId(data.currentLeafId || null);
        }
      } catch (err) {
        console.error("Failed to load temp chat:", err);
      }
    } else {
      // 离开临时聊天时清除所有数据
      sessionStorage.removeItem(TEMP_CHAT_STORAGE_KEY);
      setTempChatAllMessages([]);
      setTempChatCurrentLeafId(null);
      setTempChatIsLoading(false);
    }
  }, [isTempChat]);

  // 保存临时聊天数据到sessionStorage
  useEffect(() => {
    if (isTempChat && tempChatAllMessages.length > 0) {
      try {
        sessionStorage.setItem(TEMP_CHAT_STORAGE_KEY, JSON.stringify({
          messages: tempChatAllMessages,
          currentLeafId: tempChatCurrentLeafId,
        }));
      } catch (err) {
        console.error("Failed to save temp chat:", err);
      }
    }
  }, [isTempChat, tempChatAllMessages, tempChatCurrentLeafId]);

  // 页面卸载时清除临时聊天数据
  useEffect(() => {
    if (isTempChat) {
      const handleBeforeUnload = () => {
        sessionStorage.removeItem(TEMP_CHAT_STORAGE_KEY);
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        if (isTempChat) {
          sessionStorage.removeItem(TEMP_CHAT_STORAGE_KEY);
        }
      };
    }
  }, [isTempChat]);

  // 临时聊天提交处理
  const handleTempChatSubmit = useCallback(async (
    value: string,
    attachments?: Attachment[],
    advancedSettings?: AdvancedSettings,
    voiceInfo?: { audioUrl: string; audioDuration: number }
  ) => {
    if (!value.trim() && (!attachments || attachments.length === 0)) return;
    if (tempChatIsLoading) return;

    const newUserMessageId = crypto.randomUUID();
    const newUserMessage: Message = {
      id: newUserMessageId,
      role: 'user',
      content: value,
      parentId: tempChatCurrentLeafId,
      attachments: attachments?.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url || "",
        type: a.type,
        size: a.size
      })),
      isVoiceInput: !!voiceInfo,
      audioUrl: voiceInfo?.audioUrl,
      audioDuration: voiceInfo?.audioDuration,
    };

    const updatedAllMessages = addMessageToTree(tempChatAllMessages, newUserMessage);
    setTempChatAllMessages(updatedAllMessages);
    setTempChatCurrentLeafId(newUserMessageId);

    const branch = getMessageBranch(updatedAllMessages, newUserMessageId);
    const apiMessages = branch.map(({ id, role, content, attachments, isVoiceInput, audioUrl, audioDuration }) => {
      const message: Record<string, unknown> = { id, role, content };
      if (attachments) message.attachments = attachments;
      if (isVoiceInput) message.isVoiceInput = isVoiceInput;
      if (audioUrl != null) message.audioUrl = audioUrl;
      if (audioDuration != null) message.audioDuration = audioDuration;
      return message;
    });

    const assistantMsgId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: "",
      reasoning_content: "",
      search_results: "",
      parentId: newUserMessageId,
      model: selectedModel || undefined,
    };

    setTempChatAllMessages(prev => addMessageToTree(prev, assistantPlaceholder));
    setTempChatCurrentLeafId(assistantMsgId);
    setTempChatIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          sessionId: null,
          projectId: null,
          provider: selectedProvider,
          model: selectedModel,
          webSearch: webSearch,
          webSearchSource: webSearchSource,
          vectorSearch: vectorSearch,
          reasoning: reasoning,
          enabledTools: enabledTools,
          advancedSettings: advancedSettings,
          responseMessageId: assistantMsgId,
          tempChat: true,
        }),
      });

      if (!response.ok) {
        throw new Error("请求失败");
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let fullReasoning = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as { c?: string; r?: string };
            if (data.c) {
              fullText += data.c;
              setTempChatAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
                content: fullText
              }));
            }
            if (data.r) {
              fullReasoning += data.r;
              setTempChatAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
                reasoning_content: fullReasoning
              }));
            }
          } catch {
            // 忽略解析错误
          }
        }
      }

      setTempChatAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
        status: 'completed'
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "请求失败";
      setTempChatAllMessages(prev => updateMessageInTree(prev, assistantMsgId, {
        status: 'error',
        error: errorMessage
      }));
    } finally {
      setTempChatIsLoading(false);
    }
  }, [tempChatAllMessages, tempChatCurrentLeafId, tempChatIsLoading, selectedProvider, selectedModel, webSearch, vectorSearch, reasoning]);

  // 计算当前显示的消息（基于分支逻辑）
  const messages = tempChatAllMessages.filter(m => {
    if (!tempChatCurrentLeafId) return true;
    const path: string[] = [];
    let current: Message | undefined = tempChatAllMessages.find(m => m.id === tempChatCurrentLeafId);
    while (current) {
      path.unshift(current.id!);
      current = current.parentId 
        ? tempChatAllMessages.find(m => m.id === current!.parentId)
        : undefined;
    }
    return path.includes(m.id!);
  });

  return {
    messages,
    allMessages: tempChatAllMessages,
    currentLeafId: tempChatCurrentLeafId,
    setCurrentLeafId: setTempChatCurrentLeafId,
    isLoading: tempChatIsLoading,
    isLoadingHistory: false,
    hasMoreHistory: false,
    loadMoreHistory: async () => {},
    handleSubmit: handleTempChatSubmit,
    handleRegenerate: async (_messageId: string, _options?: { advancedSettings?: AdvancedSettings }) => {},
    handleEdit: async (_messageId: string, _newContent: string, _options?: { advancedSettings?: AdvancedSettings }) => {},
    handleFork: async () => {},
    handleStop: () => setTempChatIsLoading(false),
    sessionTitle: "临时聊天",
  };
}

