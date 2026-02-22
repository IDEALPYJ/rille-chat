"use client";

import { useMemo } from "react";
import { UserSettings } from "@/lib/types";
import { VoiceInputData } from "@/components/chat/chat-input";

/**
 * 管理语音输入相关的配置和上传逻辑
 */
export function useVoiceHandler(userSettings: UserSettings | null) {
  // 检查语音输入是否已配置
  const voiceInputConfig = useMemo(() => {
    // 如果用户设置还未加载完成，默认禁用语音输入，避免按钮闪烁
    if (!userSettings) {
      return { mode: "browser" as const, isEnabled: false };
    }

    const voiceConfig = userSettings.voice;
    const provider = voiceConfig?.input?.provider || "browser";
    const mode = provider === "browser" ? "browser" : "ai";

    // 检查 AI 模式是否已配置
    let isEnabled = true;
    if (mode === "ai") {
      const providerConfig = voiceConfig?.input?.providers?.[provider];
      isEnabled = !!(providerConfig?.apiKey && providerConfig?.model);
    }

    return { mode, isEnabled } as { mode: "browser" | "ai"; isEnabled: boolean };
  }, [userSettings]);

  // 检查 TTS 是否已配置
  const isTTSConfigured = useMemo(() => {
    const voiceConfig = userSettings?.voice;
    if (!voiceConfig?.output?.provider) return false;
    
    const providerId = voiceConfig.output.provider;
    // Edge TTS 不需要配置
    if (providerId === "edge-tts") return true;
    
    const providerConfig = voiceConfig.output.providers?.[providerId];
    return !!(providerConfig?.apiKey && providerConfig?.model);
  }, [userSettings?.voice]);

  /**
   * 上传语音文件并返回语音信息
   */
  const uploadVoiceFile = async (voiceData: VoiceInputData): Promise<{ audioUrl: string; audioDuration: number } | undefined> => {
    try {
      const formData = new FormData();
      formData.append('file', voiceData.audioBlob, 'voice-message.wav');
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        return {
          audioUrl: uploadData.url,
          audioDuration: voiceData.audioDuration,
        };
      }
    } catch (err) {
      console.error('Failed to upload voice message:', err);
    }
    return undefined;
  };

  return {
    voiceInputConfig,
    isTTSConfigured,
    uploadVoiceFile,
  };
}

