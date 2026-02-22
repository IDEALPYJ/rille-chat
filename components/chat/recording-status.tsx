"use client";

import { useI18n } from "@/lib/i18n/context";

interface RecordingStatusProps {
  isRecording: boolean;
  isProcessingVoice: boolean;
  recordingDuration: number;
  voiceTranscript: string;
  interimTranscript: string;
  formatDuration: (seconds: number) => string;
}

export function RecordingStatus({
  isRecording,
  isProcessingVoice,
  recordingDuration,
  voiceTranscript,
  interimTranscript,
  formatDuration,
}: RecordingStatusProps) {
  const { t } = useI18n();

  if (isRecording) {
    return (
      <div className="flex-1 py-2 px-3 sm:py-[18px] sm:px-6 min-h-[48px] md:min-h-[56px] max-h-32 flex items-center gap-3 pl-[42px] md:pl-[49px] pr-[42px] md:pr-[49px]">
        {/* 录音动画指示器和时长 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-mono text-red-500 tabular-nums min-w-[36px]">
            {formatDuration(recordingDuration)}
          </span>
        </div>
        {/* 识别的文本或提示 */}
        <div className="flex-1 text-foreground dark:text-muted-foregroundoverflow-hidden text-ellipsis">
          {voiceTranscript || interimTranscript ? (
            <span className="line-clamp-2">
              <span>{voiceTranscript}</span>
              {interimTranscript && (
                <span className="text-muted-foreground dark:text-muted-foreground">
                  {interimTranscript}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground dark:text-muted-foregroundanimate-pulse">
              {t("input.listening")}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isProcessingVoice) {
    return (
      <div className="flex-1 py-[18px] px-6 min-h-[48px] md:min-h-[56px] max-h-64 flex items-center gap-3 pr-[42px] md:pr-[49px]">
        {/* 处理中动画指示器 */}
        <div className="flex items-center gap-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        </div>
        <span className="text-muted-foreground dark:text-muted-foregroundanimate-pulse">
          {t("input.processingVoice")}
        </span>
      </div>
    );
  }

  return null;
}

