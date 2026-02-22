"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { Attachment } from "./use-file-upload";
import { AdvancedSettings } from "@/lib/types";

// 客户端日志工具（仅用于开发环境）
const isDev = process.env.NODE_ENV !== 'production';
const clientLogger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
     
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
       
      console.warn(...args);
    }
  },
};

export interface VoiceInputData {
  text: string;
  audioBlob: Blob;
  audioDuration: number;
}

interface UseVoiceInputOptions {
  voiceInputMode: "browser" | "ai";
  onError: (message: string) => void;
  onSubmit: (
    text: string,
    attachments: Attachment[],
    voiceData?: VoiceInputData
  ) => void;
  attachments: Attachment[];
  advancedSettings: AdvancedSettings;
}

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const STT_INTERVAL = 2500; // 2.5秒

export function useVoiceInput({
  voiceInputMode,
  onError,
  onSubmit,
  attachments,
  advancedSettings,
}: UseVoiceInputOptions) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [, setBrowserRecognitionAvailable] =
    useState(true);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sttIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sttRequestsRef = useRef<Set<AbortController>>(new Set());

  // 创建 WAV Blob
  const createWavBlob = useCallback(
    (pcmData: Int16Array, sampleRate: number): Blob => {
      const numChannels = 1;
      const bitsPerSample = 16;
      const bytesPerSample = bitsPerSample / 8;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = pcmData.length * bytesPerSample;
      const headerSize = 44;
      const totalSize = headerSize + dataSize;

      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);

      const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(view, 0, "RIFF");
      view.setUint32(4, totalSize - 8, true);
      writeString(view, 8, "WAVE");
      writeString(view, 12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, "data");
      view.setUint32(40, dataSize, true);

      const wavView = new Int16Array(buffer, headerSize);
      wavView.set(pcmData);

      return new Blob([buffer], { type: "audio/wav" });
    },
    []
  );

  // 启动录音计时器
  const startRecordingTimer = useCallback(() => {
    recordingStartTimeRef.current = Date.now();
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(
        Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
      );
    }, 1000);
  }, []);

  // 停止录音计时器
  const stopRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // 格式化录音时长
  const formatRecordingDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // 发送音频片段到STT API进行识别
  const sendAudioChunkForSTT = useCallback(
    async (chunks: Float32Array[]) => {
      if (chunks.length === 0) return null;

      try {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const mergedFloat32 = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          mergedFloat32.set(chunk, offset);
          offset += chunk.length;
        }

        const pcmInt16 = new Int16Array(mergedFloat32.length);
        for (let i = 0; i < mergedFloat32.length; i++) {
          const sample = Math.max(-1, Math.min(1, mergedFloat32[i]));
          pcmInt16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        const wavBlob = createWavBlob(pcmInt16, SAMPLE_RATE);

        const abortController = new AbortController();
        sttRequestsRef.current.add(abortController);

        const formData = new FormData();
        formData.append("audio", wavBlob, "recording.wav");
        formData.append("language", "zh-CN");

        const response = await fetch("/api/stt", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });

        sttRequestsRef.current.delete(abortController);

        if (!response.ok) {
          throw new Error(`STT API error: ${response.status}`);
        }

        const data = await response.json();
        return data.text || "";
      } catch (err: any) {
        if (err.name !== "AbortError") {
          clientLogger.error("STT chunk recognition error:", err);
        }
        return null;
      }
    },
    [createWavBlob]
  );

  // 检查浏览器是否支持语音识别
  const checkBrowserRecognitionSupport = useCallback(() => {
    return (
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
  }, []);

  // 开始浏览器语音识别
  const startBrowserRecognition = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onError(t("errors.browserNotSupported"));
      setBrowserRecognitionAvailable(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      pcmChunksRef.current = [];

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(
        BUFFER_SIZE,
        1,
        1
      );

      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      workletNodeRef.current = scriptProcessor;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "zh-CN";

      recognition.onstart = () => {
        setIsRecording(true);
        setBrowserRecognitionAvailable(true);
        if (voiceTranscript === "" && interimTranscript === "") {
          setVoiceTranscript("");
          setInterimTranscript("");
        }
        startRecordingTimer();
      };

      recognition.onresult = (event: any) => {
        let finalText = "";
        let interimText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalText) {
          setVoiceTranscript((prev) => prev + finalText);
        }
        setInterimTranscript(interimText);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        clientLogger.error("Speech recognition error:", error);

        if (error === "no-speech" || error === "aborted") {
          return;
        }

        setBrowserRecognitionAvailable(false);

        const errorMessages: Record<string, string> = {
          network: t("errors.voiceRecognition.network"),
          "audio-capture": t("errors.voiceRecognition.audioCapture"),
          "not-allowed": t("errors.voiceRecognition.notAllowed"),
          "service-not-allowed": t("errors.voiceRecognition.serviceNotAllowed"),
          "bad-grammar": t("errors.voiceRecognition.badGrammar"),
          "language-not-supported": t(
            "errors.voiceRecognition.languageNotSupported"
          ),
        };

        const errorMessage =
          errorMessages[error] ||
          `${t("errors.voiceRecognitionError")}: ${error}`;
        onError(errorMessage);

        if (error === "network") {
          clientLogger.log(
            "Attempting to restart browser recognition after network error..."
          );
          setTimeout(() => {
            setIsRecording((currentRecording) => {
              if (currentRecording && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  clientLogger.log("Failed to restart recognition:", e);
                }
              }
              return currentRecording;
            });
          }, 1000);
        }
      };

      recognition.onend = () => {
        setTimeout(() => {
          if (recognitionRef.current) {
            setIsRecording((currentRecording) => {
              if (currentRecording && recognitionRef.current) {
                clientLogger.log(
                  "Browser recognition ended unexpectedly, attempting to restart..."
                );
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  clientLogger.log("Failed to restart recognition after end:", e);
                }
              }
              return currentRecording;
            });
          }
        }, 500);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsRecording(false);
      stopRecordingTimer();
      const errorMessage =
        err.name === "NotAllowedError"
          ? t("errors.microphoneDenied")
          : `${t("errors.microphoneError")}: ${err.message}`;
      onError(errorMessage);
    }
  }, [
    startRecordingTimer,
    stopRecordingTimer,
    onError,
    t,
    voiceTranscript,
    interimTranscript,
  ]);

  // 启动AI服务商的流式识别
  const startAIStreamRecognition = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      pcmChunksRef.current = [];

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(
        BUFFER_SIZE,
        1,
        1
      );

      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);
      workletNodeRef.current = scriptProcessor;

      sttIntervalRef.current = setInterval(async () => {
        if (pcmChunksRef.current.length > 0) {
          const text = await sendAudioChunkForSTT(pcmChunksRef.current);
          if (text) {
            setVoiceTranscript(text);
            setInterimTranscript("");
          }
        }
      }, STT_INTERVAL);
    } catch (err: any) {
      clientLogger.error("Failed to start AI stream recognition:", err);
      setIsRecording(false);
      stopRecordingTimer();
      const errorMessage =
        err.name === "NotAllowedError"
          ? t("errors.microphoneDenied")
          : `${t("errors.microphoneError")}: ${err.message}`;
      onError(errorMessage);
    }
  }, [sendAudioChunkForSTT, stopRecordingTimer, onError, t]);

  // 开始 AI 语音识别
  const startAIRecognition = useCallback(async () => {
    try {
      setIsRecording(true);
      setVoiceTranscript("");
      setInterimTranscript("");
      startRecordingTimer();
      sttRequestsRef.current.clear();

      const browserSupported = checkBrowserRecognitionSupport();

      if (browserSupported) {
        setBrowserRecognitionAvailable(true);

        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "zh-CN";

        recognition.onstart = () => {
          setBrowserRecognitionAvailable(true);
        };

        recognition.onresult = (event: any) => {
          let finalText = "";
          let interimText = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalText += result[0].transcript;
            } else {
              interimText += result[0].transcript;
            }
          }

          if (finalText) {
            setVoiceTranscript((prev) => prev + finalText);
          }
          setInterimTranscript(interimText);
        };

        recognition.onerror = (event: any) => {
          const error = event.error;
          clientLogger.log("Browser speech recognition error:", error);

          if (error === "no-speech" || error === "aborted") {
            return;
          }

          setBrowserRecognitionAvailable(false);

          const errorMessages: Record<string, string> = {
            network: t("errors.voiceRecognition.networkError"),
            "audio-capture": t("errors.voiceRecognition.audioCapture"),
            "not-allowed": t("errors.voiceRecognition.notAllowed"),
            "service-not-allowed": t("errors.voiceRecognition.serviceNotAllowed"),
            "bad-grammar": t("errors.voiceRecognition.badGrammar"),
            "language-not-supported": t(
              "errors.voiceRecognition.languageNotSupported"
            ),
          };

          const errorMessage =
            errorMessages[error] ||
            `${t("errors.voiceRecognitionError")}: ${error}，${t(
              "errors.voiceRecognition.networkError"
            )}`;
          clientLogger.warn(errorMessage);
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
          startAIStreamRecognition();
        } catch (e) {
          clientLogger.log("Failed to start browser speech recognition:", e);
          setBrowserRecognitionAvailable(false);
          startAIStreamRecognition();
        }
      } else {
        setBrowserRecognitionAvailable(false);
        startAIStreamRecognition();
      }
    } catch (err: any) {
      setIsRecording(false);
      stopRecordingTimer();
      const errorMessage =
        err.name === "NotAllowedError"
          ? t("errors.microphoneDenied")
          : `${t("errors.microphoneError")}: ${err.message}`;
      onError(errorMessage);
    }
  }, [
    startRecordingTimer,
    stopRecordingTimer,
    checkBrowserRecognitionSupport,
    startAIStreamRecognition,
    onError,
    t,
  ]);

  // 开始录音
  const startRecording = useCallback(() => {
    if (voiceInputMode === "browser") {
      startBrowserRecognition();
    } else {
      startAIRecognition();
    }
  }, [voiceInputMode, startBrowserRecognition, startAIRecognition]);

  // 停止录音并提交
  const stopRecording = useCallback(async () => {
    const audioDuration =
      (Date.now() - recordingStartTimeRef.current) / 1000;
    stopRecordingTimer();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (sttIntervalRef.current) {
      clearInterval(sttIntervalRef.current);
      sttIntervalRef.current = null;
    }

    sttRequestsRef.current.forEach((controller) => controller.abort());
    sttRequestsRef.current.clear();

    setIsRecording(false);
    setInterimTranscript("");

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (voiceInputMode === "browser") {
      const finalText = (voiceTranscript + interimTranscript).trim();
      if (finalText) {
        let audioBlob: Blob | undefined;
        if (pcmChunksRef.current.length > 0) {
          try {
            const totalLength = pcmChunksRef.current.reduce(
              (sum, chunk) => sum + chunk.length,
              0
            );
            const mergedFloat32 = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of pcmChunksRef.current) {
              mergedFloat32.set(chunk, offset);
              offset += chunk.length;
            }

            const pcmInt16 = new Int16Array(mergedFloat32.length);
            for (let i = 0; i < mergedFloat32.length; i++) {
              const sample = Math.max(-1, Math.min(1, mergedFloat32[i]));
              pcmInt16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
            }

            audioBlob = createWavBlob(pcmInt16, SAMPLE_RATE);
          } catch (err) {
            clientLogger.error("Failed to create audio blob:", err);
          }
        }

        onSubmit(
          finalText,
          attachments.filter((a) => a.status === "completed"),
          audioBlob
            ? {
                text: finalText,
                audioBlob: audioBlob,
                audioDuration,
              }
            : undefined
        );
      }

      pcmChunksRef.current = [];
    } else {
      if (pcmChunksRef.current.length > 0) {
        setIsProcessingVoice(true);

        try {
          const totalLength = pcmChunksRef.current.reduce(
            (sum, chunk) => sum + chunk.length,
            0
          );
          const mergedFloat32 = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of pcmChunksRef.current) {
            mergedFloat32.set(chunk, offset);
            offset += chunk.length;
          }

          const pcmInt16 = new Int16Array(mergedFloat32.length);
          for (let i = 0; i < mergedFloat32.length; i++) {
            const sample = Math.max(-1, Math.min(1, mergedFloat32[i]));
            pcmInt16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          }

          const wavBlob = createWavBlob(pcmInt16, SAMPLE_RATE);

          const formData = new FormData();
          formData.append("audio", wavBlob, "recording.wav");
          formData.append("language", "zh-CN");

          const response = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`STT API error: ${response.status}`);
          }

          const data = await response.json();
          const textToSubmit = data.text || "";

          setIsProcessingVoice(false);

          if (textToSubmit && textToSubmit.trim()) {
            onSubmit(
              textToSubmit,
              attachments.filter((a) => a.status === "completed"),
              {
                text: textToSubmit,
                audioBlob: wavBlob,
                audioDuration,
              }
            );
          }
        } catch (err: any) {
          setIsProcessingVoice(false);
          onError(`${t("errors.voiceRecognitionError")}: ${err.message}`);
        }

        pcmChunksRef.current = [];
      } else {
        const finalText = (voiceTranscript + interimTranscript).trim();
        if (finalText) {
          onSubmit(
            finalText,
            attachments.filter((a) => a.status === "completed")
          );
        }
      }
    }

    setVoiceTranscript("");
    setInterimTranscript("");
    setRecordingDuration(0);
  }, [
    voiceInputMode,
    voiceTranscript,
    interimTranscript,
    onSubmit,
    attachments,
    advancedSettings,
    createWavBlob,
    stopRecordingTimer,
    onError,
    t,
  ]);

  // 取消录音
  const cancelRecording = useCallback(() => {
    stopRecordingTimer();

    if (sttIntervalRef.current) {
      clearInterval(sttIntervalRef.current);
      sttIntervalRef.current = null;
    }

    sttRequestsRef.current.forEach((controller) => controller.abort());
    sttRequestsRef.current.clear();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (voiceInputMode !== "browser") {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      pcmChunksRef.current = [];
    }

    setIsRecording(false);
    setVoiceTranscript("");
    setInterimTranscript("");
    setRecordingDuration(0);
  }, [voiceInputMode, stopRecordingTimer]);

  // 清理
  useEffect(() => {
    return () => {
      cancelRecording();
    };
  }, [cancelRecording]);

  return {
    isRecording,
    isProcessingVoice,
    voiceTranscript,
    interimTranscript,
    recordingDuration,
    formatRecordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

