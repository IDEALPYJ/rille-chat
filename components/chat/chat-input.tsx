"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PromptPicker } from "./prompt-picker";
import { AdvancedSettings, ReasoningSettings, ModelParameter, ModelConfig } from "@/lib/types";
import { AlertToast } from "@/components/ui/alert-toast";
import { useI18n } from "@/lib/i18n/context";
import { useInputCompletion } from "@/hooks/use-input-completion";
import { useFileUpload, Attachment } from "@/hooks/use-file-upload";
import {
  useVoiceInput,
  VoiceInputData,
} from "@/hooks/use-voice-input";
import { AttachmentList } from "./attachment-list";
import { RecordingStatus } from "./recording-status";
import { InputCompletion } from "./input-completion";
import { ActionButton } from "./action-button";
import { AttachmentMenu } from "./attachment-menu";
import { StatusIndicators } from "./status-indicators";
import { WebSearchSource } from "@/hooks/use-web-search-source";

export interface ButtonStates {
  webSearch: {
    visible: boolean;
    disabled: boolean;
    showSourcePicker: boolean;
  };
  plugins: {
    visible: boolean;
    disabled: boolean;
  };
  reasoning: {
    visible: boolean;
    disabled: boolean;
    locked: boolean;
    showEffortPicker: boolean;
  };
  advancedSettings: {
    visible: boolean;
  };
  vectorSearch: {
    visible: boolean;
    disabled: boolean;
  };
}

export type { Attachment, VoiceInputData };

interface ChatInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (
    value: string,
    attachments?: Attachment[],
    voiceData?: VoiceInputData
  ) => void;
  isLoading: boolean;
  projectId?: string;
  sessionId?: string | null;
  webSearch?: boolean;
  onWebSearchChange?: (enabled: boolean) => void;
  vectorSearch?: boolean;
  onVectorSearchChange?: (enabled: boolean) => void;
  reasoning?: ReasoningSettings | boolean;
  onReasoningChange?: (reasoning: ReasoningSettings | boolean) => void;
  selectedProvider?: string | null;
  selectedModel?: string | null;
  selectedPrompt?: string | null;
  selectedPromptTitle?: string | null;
  onPromptChange?: (prompt: string | null, title?: string | null) => void;
  onStop?: () => void;
  voiceInputMode?: "browser" | "ai";
  voiceInputEnabled?: boolean;
  sendShortcut?: "enter" | "ctrl-enter";

  // 新增：按钮状态和能力
  buttonStates?: ButtonStates;
  webSearchSource?: WebSearchSource;
  onWebSearchSourceChange?: (source: WebSearchSource) => void;
  modelParameters?: ModelParameter[];
  isWebSearchConfigured?: boolean;
  webSearchProviderName?: string;
  modelConfig?: ModelConfig | null;

  // 新增：advancedSettings 由父组件管理
  advancedSettings: AdvancedSettings;
  onAdvancedSettingsChange: (settings: AdvancedSettings) => void;

  // 向后兼容：保留旧的disabled props
  reasoningDisabled?: boolean;
  webSearchDisabled?: boolean;
  vectorSearchDisabled?: boolean;
}

export function ChatInput({
  input = "",
  handleInputChange,
  handleSubmit,
  isLoading,
  projectId,
  sessionId = null,
  webSearch = false,
  onWebSearchChange,
  vectorSearch = false,
  onVectorSearchChange,
  reasoning = false,
  onReasoningChange,
  selectedPrompt = null,
  selectedPromptTitle = null,
  onPromptChange,
  onStop,
  voiceInputMode = "browser",
  voiceInputEnabled = true,
  sendShortcut = "enter",
  selectedModel = null,
  buttonStates,
  webSearchSource,
  onWebSearchSourceChange,
  modelParameters,
  isWebSearchConfigured = false,
  webSearchProviderName,
  modelConfig,
  advancedSettings,
  onAdvancedSettingsChange,
  // 向后兼容
  reasoningDisabled = false,
  webSearchDisabled = false,
  vectorSearchDisabled = false,
}: ChatInputProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMultiline, setIsMultiline] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [completionHeight, setCompletionHeight] = useState(0);
  const isComposingRef = useRef(false);

  // 使用自定义hooks
  const { completionText } = useInputCompletion(input);
  // 对话框上传文件时不关联项目，只有在右侧边栏上传时才关联项目
  const {
    attachments,
    fileInputRef,
    uploadFiles,
    removeAttachment,
    clearAttachments,
    addFileById,
  } = useFileUpload(undefined);

  const {
    isRecording,
    isProcessingVoice,
    voiceTranscript,
    interimTranscript,
    recordingDuration,
    formatRecordingDuration,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    voiceInputMode,
    onError: (message) => {
      setAlertMessage(message);
      setAlertOpen(true);
    },
    onSubmit: handleSubmit,
    attachments,
    advancedSettings,
  });

  // 自动高度逻辑 - 考虑补全文本的高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 保存当前滚动位置
      const scrollTop = textarea.scrollTop;
      const scrollHeight = textarea.scrollHeight;

      textarea.style.height = "inherit";
      const newScrollHeight = textarea.scrollHeight;
      const lineHeight =
        parseFloat(getComputedStyle(textarea).lineHeight) || 20;
      // 根据屏幕宽度判断移动端或桌面端的最小高度
      const isDesktop = window.innerWidth >= 768; // md breakpoint
      const minHeight = isDesktop ? 56 : 48;
      const singleLineThreshold = minHeight + lineHeight * 0.8;
      setIsMultiline(newScrollHeight > singleLineThreshold);

      // 如果有补全文本，使用补全文本的高度（因为它包含了输入文本+补全文本）
      // 否则使用textarea自身的高度
      const finalHeight = completionHeight > 0
        ? Math.min(completionHeight, 256)
        : Math.min(Math.max(newScrollHeight, minHeight), 256);
      textarea.style.height = `${finalHeight}px`;

      // 如果在输入法合成中，恢复滚动位置到底部
      if (isComposingRef.current) {
        textarea.scrollTop = textarea.scrollHeight;
      } else {
        // 否则保持原来的相对滚动位置
        const newScrollRatio = scrollTop / scrollHeight;
        textarea.scrollTop = newScrollRatio * newScrollHeight;
      }
    }
  }, [input, completionHeight]);

  // 当补全文本消失时，重置补全高度
  useEffect(() => {
    if (!completionText) {
      requestAnimationFrame(() => {
        setCompletionHeight(0);
      });
    }
  }, [completionText]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab键接受补全
    if (e.key === "Tab" && completionText) {
      e.preventDefault();
      const newValue = input + completionText;
      const syntheticEvent = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      safeHandleInputChange(syntheticEvent);
      return;
    }

    // 处理发送快捷键
    if (e.key === "Enter") {
      // Shift + Enter 始终换行
      if (e.shiftKey) {
        return;
      }

      // 根据设置处理 Enter 和 Ctrl + Enter
      if (sendShortcut === "enter") {
        // Enter 发送
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (input.trim() && !isLoading) {
            const form = e.currentTarget.closest("form");
            form?.requestSubmit();
          }
        }
      } else {
        // Ctrl + Enter 发送
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (input.trim() && !isLoading) {
            const form = e.currentTarget.closest("form");
            form?.requestSubmit();
          }
        }
      }
    }
  };

  const safeHandleInputChange =
    handleInputChange ||
    (() => {
      console.warn("Missing handleInputChange, input is read-only");
    });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const result = uploadFiles(files);
    if (result && !result.success && result.message) {
      setAlertMessage(result.message);
      setAlertOpen(true);
    }
    setShowAttachments(false);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget.contains(e.relatedTarget as Node)) return;

    setIsDragging(false);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 检查是否是拖拽的文件ID（从右侧边栏拖来的已上传文件）
    const fileId = e.dataTransfer.getData('application/file-id');
    if (fileId) {
      try {
        // 尝试从JSON数据获取文件信息
        const fileJson = e.dataTransfer.getData('application/json');
        if (fileJson) {
          const fileData = JSON.parse(fileJson);
          addFileById(fileData.id, fileData.name, fileData.url, fileData.type || 'application/octet-stream', fileData.size);
          return;
        }
        // 如果没有JSON数据，尝试从API获取文件信息
        const response = await fetch(`/api/files/${fileId}`);
        if (response.ok) {
          const blob = await response.blob();
          const contentType = response.headers.get('content-type') || 'application/octet-stream';
          const contentDisposition = response.headers.get('content-disposition') || '';
          const fileName = contentDisposition.match(/filename="(.+)"/)?.[1] || `file-${fileId}`;
          addFileById(fileId, fileName, `/api/files/${fileId}`, contentType, blob.size);
        } else {
          setAlertMessage("无法引用该文件");
          setAlertOpen(true);
        }
      } catch (error) {
        console.error("添加文件引用失败:", error);
        setAlertMessage("添加文件引用失败");
        setAlertOpen(true);
      }
      return;
    }

    // 普通文件上传
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const result = uploadFiles(files);
      if (result && !result.success && result.message) {
        setAlertMessage(result.message);
        setAlertOpen(true);
      }
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const isUploading = attachments.some((a) => a.status === "uploading");
    const hasError = attachments.some((a) => a.status === "error");

    // 如果有文件正在上传或有文件上传失败，不允许发送
    if (
      (!input.trim() && attachments.length === 0) ||
      isLoading ||
      isUploading ||
      hasError
    ) {
      return;
    }

    // 只发送成功上传的文件
    const validAttachments = attachments.filter((a) => a.status === "completed");

    let finalInput = input;
    if (selectedPrompt) {
      finalInput = `${selectedPrompt}\n\n${input}`;
    }

    handleSubmit(finalInput, validAttachments);
    clearAttachments();
    onPromptChange?.(null);
  };

  return (
    <div
      className="w-full mx-auto flex flex-col gap-2 relative pb-safe"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 拖拽上传覆盖层 */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex items-center justify-center transition-all duration-200">
          <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in zoom-in duration-200">
            <p className="font-medium text-medium text-zinc-900 dark:text-zinc-100">
              {t("input.dragToUpload")}
            </p>
          </div>
        </div>
      )}

      {/* 已选文件横向展示区 */}
      {attachments.length > 0 && (
        <>
          {(attachments.some((a) => a.status === "uploading") || attachments.some((a) => a.status === "error")) && (
            <div className="text-xs text-amber-600 dark:text-amber-500 px-2">
              {attachments.some((a) => a.status === "error") && "请删除错误状态的文件以发送消息"}
              {attachments.some((a) => a.status === "uploading") && !attachments.some((a) => a.status === "error") && "文件上传中，请稍候..."}
            </div>
          )}
          <AttachmentList
            attachments={attachments}
            onRemove={removeAttachment}
          />
        </>
      )}

      <div className="relative z-20">
        <StatusIndicators
          isMultiline={isMultiline}
          reasoning={reasoning}
          webSearch={webSearch}
          vectorSearch={vectorSearch}
        />

        <form
          onSubmit={onFormSubmit}
          className={cn(
            "relative flex items-end border bg-white dark:bg-[#111114] overflow-hidden transition-all duration-200",
            "rounded-[24px] md:rounded-[28px]",
            "min-h-[48px] md:min-h-[56px]"
          )}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowAttachments(!showAttachments)}
            className="absolute left-[6px] bottom-[6px] md:left-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 hover:bg-gray-100 dark:hover:bg-zinc-800/50 bg-transparent text-gray-500 dark:text-zinc-400 z-10"
          >
            <Plus
              className={`h-5 w-5 md:h-6 md:w-6 transition-transform duration-200 ${showAttachments ? "rotate-45" : ""
                }`}
            />
          </Button>

          {/* 输入框 - 录音/处理时显示状态 */}
          {isRecording || isProcessingVoice ? (
            <RecordingStatus
              isRecording={isRecording}
              isProcessingVoice={isProcessingVoice}
              recordingDuration={recordingDuration}
              voiceTranscript={voiceTranscript}
              interimTranscript={interimTranscript}
              formatDuration={formatRecordingDuration}
            />
          ) : (
            <div className="relative flex-1 pl-[42px] pr-[42px] md:pl-[49px] md:pr-[49px] flex items-start">
              <div className="relative w-full">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={safeHandleInputChange}
                  onKeyDown={onKeyDown}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={() => {
                    isComposingRef.current = false;
                  }}
                  placeholder={t("input.placeholder")}
                  rows={1}
                  className="resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 py-[14px] px-3 md:py-[18px] md:px-6 min-h-[48px] md:min-h-[56px] max-h-64 w-full bg-transparent dark:bg-transparent dark:text-zinc-100 text-zinc-900 relative z-10 whitespace-pre-wrap break-all text-xs md:text-xs"
                />
                <InputCompletion
                  input={input}
                  completionText={completionText}
                  onHeightChange={setCompletionHeight}
                />
              </div>
            </div>
          )}

          {/* 发送按钮或语音输入按钮 */}
          <ActionButton
            isRecording={isRecording}
            isProcessingVoice={isProcessingVoice}
            isLoading={isLoading}
            hasInput={!!input.trim()}
            hasAttachments={attachments.length > 0}
            isUploading={attachments.some((a) => a.status === "uploading")}
            hasError={attachments.some((a) => a.status === "error")}
            voiceInputEnabled={voiceInputEnabled}
            onStopRecording={stopRecording}
            onStartRecording={startRecording}
            onStop={onStop || (() => { })}
          />
        </form>
      </div>

      {/* 文件输入始终在DOM中，确保ref可用 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
        accept="*/*"
        id="file-upload-input"
      />

      <AttachmentMenu
        show={showAttachments}
        fileInputRef={fileInputRef}
        webSearch={webSearch}
        vectorSearch={vectorSearch}
        reasoning={reasoning}
        selectedPrompt={selectedPrompt}
        sessionId={sessionId}
        projectId={projectId}
        selectedModel={selectedModel}
        advancedSettings={advancedSettings}
        onWebSearchChange={onWebSearchChange}
        onVectorSearchChange={onVectorSearchChange}
        onReasoningChange={onReasoningChange}
        onPromptPickerOpen={() => setShowPromptPicker(true)}
        onAdvancedSettingsChange={onAdvancedSettingsChange}
        buttonStates={buttonStates || {
          webSearch: {
            visible: !webSearchDisabled,
            disabled: webSearchDisabled,
            showSourcePicker: false
          },
          plugins: { visible: true, disabled: false },
          reasoning: {
            visible: !reasoningDisabled,
            disabled: reasoningDisabled,
            locked: false,
            showEffortPicker: false
          },
          advancedSettings: { visible: true },
          vectorSearch: {
            visible: !!projectId && !vectorSearchDisabled,
            disabled: vectorSearchDisabled
          }
        }}
        webSearchSource={webSearchSource}
        onWebSearchSourceChange={onWebSearchSourceChange}
        modelParameters={modelParameters}
        isWebSearchConfigured={isWebSearchConfigured}
        webSearchProviderName={webSearchProviderName}
        modelConfig={modelConfig || null}
      />

      <PromptPicker
        open={showPromptPicker}
        onOpenChange={setShowPromptPicker}
        selectedPromptTitle={selectedPromptTitle}
        onSelect={(content, title) => {
          onPromptChange?.(content || null, title || null);
        }}
      />
      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        message={alertMessage}
      />
    </div>
  );
}
