"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChatList } from "@/components/chat/chat-list";
import { ChatInput, Attachment as UIAttachment, VoiceInputData } from "@/components/chat/chat-input";
import { AdvancedSettings } from "@/lib/types";
import { ArtifactView } from "@/components/chat/artifact-view";
import { ChatToolbar } from "@/components/chat/chat-toolbar";
import { useChatSession } from "@/hooks/use-chat-session";
import { useTempChat } from "@/hooks/use-temp-chat";
import { useTTS } from "@/hooks/use-tts";
import { useMobileHeader } from "@/context/mobile-header-context";
import { useChatSettings } from "@/hooks/use-chat-settings";
import { useChatLayout } from "@/hooks/use-chat-layout";
import { useFileHandler } from "@/hooks/use-file-handler";
import { useVoiceHandler } from "@/hooks/use-voice-handler";
import { useWebSearchSource } from "@/hooks/use-web-search-source";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  projectId?: string;
  initialSessionId?: string | null;
}

export function ChatView({ projectId, initialSessionId }: ChatViewProps) {
  const searchParams = useSearchParams();
  // Prefer prop if provided (for better control), otherwise use URL param
  const sessionId = initialSessionId !== undefined ? initialSessionId : searchParams.get("id");
  const isTempChat = searchParams.get("temp") === "true";

  // 基础状态
  const [inputValue, setInputValue] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<{ code: string; language: string } | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [selectedPromptTitle, setSelectedPromptTitle] = useState<string | null>(null);
  // 管理 advancedSettings，用于发送消息、重新生成和编辑
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    temperature: 0.7,
    topP: 1,
    topK: 0,
    presencePenalty: 0,
    frequencyPenalty: 0,
    seed: undefined,
    stopSequences: [],
  });

  // 使用自定义 Hooks 管理各种状态
  const chatSettings = useChatSettings(projectId);
  const {
    selectedProvider,
    selectedModel,
    webSearch,
    vectorSearch,
    reasoning,
    userSettings,
    projectEmbeddingEnabled,
    supportsDeepThinking,
    isWebSearchConfigured,
    webSearchProviderName,
    modelCapabilities,
    buttonStates,
    currentModelConfig,
    handleModelSelect,
    setWebSearch,
    setVectorSearch,
    setReasoning,
  } = chatSettings;

  // 联网搜索源选择（需要在chatSettings之后，因为依赖modelCapabilities和isWebSearchConfigured）
  const {
    source: webSearchSource,
    setSource: setWebSearchSource
  } = useWebSearchSource(
    !!modelCapabilities.hasBuiltinWebSearch,
    !!isWebSearchConfigured
  );

  // 使用自定义 Hook 管理临时聊天状态
  const tempChat = useTempChat({
    isTempChat,
    selectedProvider,
    selectedModel,
    webSearch,
    webSearchSource,
    vectorSearch,
    reasoning,
    enabledTools: undefined, // 可以从其他地方获取
  });

  // 使用自定义 Hook 管理聊天会话状态（非临时聊天时）
  const chatSession = useChatSession({
    sessionId: isTempChat ? null : sessionId,
    projectId,
    selectedProvider,
    selectedModel,
    webSearch,
    webSearchSource,
    vectorSearch,
    reasoning,
    enabledTools: undefined, // 可以从其他地方获取
  });

  // 根据是否是临时聊天选择不同的状态
  const messages = isTempChat ? tempChat.messages : chatSession.messages;
  const allMessages = isTempChat ? tempChat.allMessages : chatSession.allMessages;
  const currentLeafId = isTempChat ? tempChat.currentLeafId : chatSession.currentLeafId;
  const setCurrentLeafId = isTempChat ? tempChat.setCurrentLeafId : chatSession.setCurrentLeafId;
  const isLoading = isTempChat ? tempChat.isLoading : chatSession.isLoading;
  const isLoadingHistory = isTempChat ? tempChat.isLoadingHistory : chatSession.isLoadingHistory;
  const hasMoreHistory = isTempChat ? tempChat.hasMoreHistory : chatSession.hasMoreHistory;
  const loadMoreHistory = isTempChat ? tempChat.loadMoreHistory : chatSession.loadMoreHistory;
  const submitMessage = isTempChat ? tempChat.handleSubmit : chatSession.handleSubmit;
  const handleRegenerate = isTempChat ? tempChat.handleRegenerate : chatSession.handleRegenerate;
  const handleEdit = isTempChat ? tempChat.handleEdit : chatSession.handleEdit;
  const handleFork = isTempChat ? tempChat.handleFork : chatSession.handleFork;
  const handleStop = isTempChat ? tempChat.handleStop : chatSession.handleStop;
  const sessionTitle = isTempChat ? tempChat.sessionTitle : chatSession.sessionTitle;

  // 布局管理
  const { inputHeight, inputRef, shouldShowInputAtBottom } = useChatLayout(
    messages.length > 0,
    isLoadingHistory,
    sessionId
  );

  // 文件处理
  const { processAttachments } = useFileHandler(messages, allMessages);

  // 语音处理
  const { voiceInputConfig, isTTSConfigured, uploadVoiceFile } = useVoiceHandler(userSettings);

  // 更新移动端顶栏标题和模型选择器
  const { setTitle, setSelectedProvider: setMobileSelectedProvider, setSelectedModel: setMobileSelectedModel, setOnModelSelect } = useMobileHeader();

  // 使用 TTS hook
  const { speak, stop: stopTTS, isSpeaking } = useTTS();

  // 同步移动端顶栏
  useEffect(() => {
    setTitle(sessionTitle);
  }, [sessionTitle, setTitle]);

  useEffect(() => {
    setMobileSelectedProvider(selectedProvider);
    setMobileSelectedModel(selectedModel);
    setOnModelSelect(() => handleModelSelect);
  }, [selectedProvider, selectedModel, handleModelSelect, setMobileSelectedProvider, setMobileSelectedModel, setOnModelSelect]);

  // 处理朗读
  const handleSpeak = useCallback((text: string) => {
    if (!isTTSConfigured) {
      console.warn("TTS not configured");
      return;
    }

    if (isSpeaking) {
      stopTTS();
    } else {
      speak(text);
    }
  }, [isTTSConfigured, speak, stopTTS, isSpeaking]);

  // 事件处理
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const onSubmit = async (value: string, attachments?: UIAttachment[], voiceData?: VoiceInputData) => {
    if (!value.trim() && (!attachments || attachments.length === 0)) return;

    // 处理附件 URL
    const processedAttachments = processAttachments(attachments as any);

    setInputValue(""); // 立即清空输入框

    // 如果是语音输入，需要先上传音频文件
    let voiceInfo: { audioUrl: string; audioDuration: number } | undefined;
    if (voiceData) {
      voiceInfo = await uploadVoiceFile(voiceData);
    }

    // 统一使用 submitMessage，它已经根据 isTempChat 自动选择正确的处理函数
    await submitMessage(value, processedAttachments, advancedSettings, voiceInfo);
  };

  // 包装重新生成和编辑函数，传递当前的 advancedSettings
  const wrappedHandleRegenerate = useCallback(async (messageId: string) => {
    await handleRegenerate(messageId, { advancedSettings });
  }, [handleRegenerate, advancedSettings]);

  const wrappedHandleEdit = useCallback(async (messageId: string, newContent: string) => {
    await handleEdit(messageId, newContent, { advancedSettings });
  }, [handleEdit, advancedSettings]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-full bg-white dark:bg-background relative overflow-hidden">

      <div className={cn(
        "flex-1 flex flex-col relative min-w-0 transition-all duration-300 ease-in-out",
        selectedArtifact ? "w-1/2" : "w-full"
      )}>
        {/* 顶部工具栏 */}
        <ChatToolbar
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          sessionTitle={sessionTitle}
          isTempChat={isTempChat}
          projectId={projectId}
          sessionId={sessionId}
          shouldShowTitle={shouldShowInputAtBottom}
        />

        {/* 主要内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white dark:from-background via-white/80 dark:via-background/80 to-transparent z-10 pointer-events-none"
            style={{ height: `${inputHeight + 40}px` }}
          />
          {hasMessages ? (
            <motion.div
              layout
              className="flex-1 flex flex-col overflow-hidden w-full"
            >
              <ChatList
                messages={messages}
                allMessages={allMessages}
                currentLeafId={currentLeafId}
                setCurrentLeafId={setCurrentLeafId}
                isLoading={isLoading}
                hasMore={hasMoreHistory}
                onLoadMore={loadMoreHistory}
                onSelectArtifact={setSelectedArtifact}
                onRegenerate={wrappedHandleRegenerate}
                onEdit={wrappedHandleEdit}
                onFork={handleFork}
                onSpeak={isTTSConfigured ? handleSpeak : undefined}
                bottomPadding={inputHeight}
              />
            </motion.div>
          ) : null}
        </div>

        {/* 输入框区域 */}
        <motion.div
          layoutId="chat-input-anchor"
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ height: 0 }}
          initial={{
            bottom: shouldShowInputAtBottom ? 0 : "55%"
          }}
          animate={{
            bottom: shouldShowInputAtBottom ? 0 : "55%"
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 30,
            mass: 1
          }}
        >
          <motion.div
            ref={inputRef}
            className={cn(
              "absolute w-full flex flex-col items-center px-4 pb-4 pointer-events-auto",
              shouldShowInputAtBottom ? "bottom-0" : "top-0"
            )}
            initial={{ y: shouldShowInputAtBottom ? 0 : "0%" }}
            animate={{ y: shouldShowInputAtBottom ? 0 : "0%" }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 30,
              mass: 1
            }}
          >
            <div className="w-full max-w-3xl px-3 sm:px-4 md:px-12">
              <ChatInput
                input={inputValue}
                handleInputChange={handleInputChange}
                handleSubmit={onSubmit}
                isLoading={isLoading}
                projectId={projectId}
                sessionId={sessionId}
                webSearch={webSearch}
                onWebSearchChange={setWebSearch}
                vectorSearch={vectorSearch}
                onVectorSearchChange={setVectorSearch}
                reasoning={reasoning}
                onReasoningChange={setReasoning as any}
                selectedPrompt={selectedPrompt}
                selectedPromptTitle={selectedPromptTitle}
                onPromptChange={(prompt, title) => {
                  setSelectedPrompt(prompt);
                  setSelectedPromptTitle(title ?? null);
                }}
                onStop={handleStop}
                voiceInputMode={voiceInputConfig.mode}
                voiceInputEnabled={voiceInputConfig.isEnabled}
                buttonStates={buttonStates as any}
                webSearchSource={webSearchSource}
                onWebSearchSourceChange={setWebSearchSource}
                modelParameters={modelCapabilities.availableParameters}
                isWebSearchConfigured={!!isWebSearchConfigured}
                webSearchProviderName={webSearchProviderName}
                advancedSettings={advancedSettings}
                onAdvancedSettingsChange={setAdvancedSettings}
                // 向后兼容
                reasoningDisabled={!supportsDeepThinking}
                webSearchDisabled={false}
                vectorSearchDisabled={!projectEmbeddingEnabled}
                sendShortcut={(userSettings as any)?.sendShortcut}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                modelConfig={currentModelConfig}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {selectedArtifact && (
        <ArtifactView
          code={selectedArtifact.code}
          language={selectedArtifact.language}
          onClose={() => setSelectedArtifact(null)}
        />
      )}
    </div>
  );
}
