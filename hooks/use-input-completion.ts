"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";

interface UserSettings {
  inputCompletion?: {
    enabled?: boolean;
  };
}

export function useInputCompletion(input: string) {
  const { t } = useI18n();
  const [completionText, setCompletionText] = useState("");
  const [isLoadingCompletion, setIsLoadingCompletion] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionAbortControllerRef = useRef<AbortController | null>(null);

  // 获取用户设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          setUserSettings(data);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();

    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    window.addEventListener("settings-updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, []);

  // 获取输入补全
  const fetchCompletion = useCallback(
    async (text: string) => {
      if (!userSettings?.inputCompletion?.enabled || !text.trim()) {
        setCompletionText("");
        return;
      }

      if (completionAbortControllerRef.current) {
        completionAbortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      completionAbortControllerRef.current = abortController;

      setIsLoadingCompletion(true);
      try {
        const response = await fetch("/api/input/completion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          return;
        }

        if (!response.ok) {
          throw new Error(t("errors.completionRequestFailed"));
        }

        const data = await response.json();
        const completion = data.completion || "";
        setCompletionText(completion);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch completion:", err);
          setCompletionText("");
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingCompletion(false);
        }
      }
    },
    [userSettings, t]
  );

  // 监听输入变化，延迟调用补全API
  useEffect(() => {
    setCompletionText("");

    if (completionAbortControllerRef.current) {
      completionAbortControllerRef.current.abort();
    }

    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }

    if (!input.trim()) {
      return;
    }

    if (!userSettings?.inputCompletion?.enabled) {
      return;
    }

    completionTimeoutRef.current = setTimeout(() => {
      fetchCompletion(input);
    }, 500);

    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [input, fetchCompletion, userSettings]);

  // 清理补全请求
  useEffect(() => {
    return () => {
      if (completionAbortControllerRef.current) {
        completionAbortControllerRef.current.abort();
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  return {
    completionText,
    isLoadingCompletion,
  };
}

