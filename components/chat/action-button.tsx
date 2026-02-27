"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  Mic,
  MicOff,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface ActionButtonProps {
  isRecording: boolean;
  isProcessingVoice: boolean;
  isLoading: boolean;
  hasInput: boolean;
  hasAttachments: boolean;
  isUploading: boolean;
  hasError: boolean;
  voiceInputEnabled: boolean;
  onStopRecording: () => void;
  onStartRecording: () => void;
  onStop: () => void;
  onSubmit?: () => void;
}

export function ActionButton({
  isRecording,
  isProcessingVoice,
  isLoading,
  hasInput,
  hasAttachments,
  isUploading,
  hasError,
  voiceInputEnabled,
  onStopRecording,
  onStartRecording,
  onStop,
  onSubmit,
}: ActionButtonProps) {
  if (isRecording) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          onStopRecording();
        }}
        className="absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 bg-red-500 text-white hover:bg-red-600 transition-colors z-10"
      >
        <MicOff className="h-4 w-4 md:h-5 md:w-5" />
      </Button>
    );
  }

  if (isProcessingVoice) {
    return (
      <Button
        type="button"
        size="icon"
        disabled
        className="absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 bg-blue-500 text-white transition-colors z-10"
      >
        <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          onStop();
        }}
        className="absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 bg-primary text-primary-foreground transition-colors z-10"
      >
        <Square className="h-3 w-3 fill-current" />
      </Button>
    );
  }

  if (hasInput || hasAttachments) {
    const isDisabled = isUploading || hasError;
    return (
      <Button
        type="button"
        size="icon"
        disabled={isDisabled}
        onClick={onSubmit}
        className={cn(
            "absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 transition-colors z-10",
          isDisabled
            ? "bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground cursor-not-allowed"
            : "bg-zinc-900 dark:!bg-[#ffffff] text-white dark:!text-[#000000] hover:bg-zinc-800 dark:hover:!bg-[#f5f5f5] [&_svg]:dark:!text-[#000000]"
        )}
      >
        <ArrowUp className="h-4 w-4 md:h-6 md:w-6" />
      </Button>
    );
  }

  if (voiceInputEnabled) {
    return (
      <Button
        type="button"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          onStartRecording();
        }}
        className="absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 bg-zinc-900 dark:!bg-[#ffffff] text-white dark:!text-[#000000] hover:bg-zinc-800 dark:hover:!bg-[#f5f5f5] [&_svg]:dark:!text-[#000000] transition-colors z-10"
      >
        <Mic className="h-4 w-4 md:h-5 md:w-5" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      disabled
      className="absolute right-[6px] bottom-[6px] md:right-[7px] md:bottom-[7px] h-[36px] w-[36px] md:h-[42px] md:w-[42px] rounded-full shrink-0 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed z-10"
    >
      <ArrowUp className="h-4 w-4 md:h-5 md:w-5" />
    </Button>
  );
}

