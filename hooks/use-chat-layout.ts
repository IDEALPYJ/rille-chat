"use client";

import { useState, useEffect, useRef } from "react";
import { UI } from "@/lib/constants";

/**
 * 管理聊天布局相关的状态和逻辑
 * 包括：输入框高度测量、ResizeObserver、布局计算
 */
export function useChatLayout(
  hasMessages: boolean,
  isLoadingHistory: boolean,
  sessionId: string | null
) {
  const [inputHeight, setInputHeight] = useState<number>(UI.DEFAULT_INPUT_HEIGHT);
  const inputRef = useRef<HTMLDivElement>(null);

  // 动态测量输入框高度
  useEffect(() => {
    if (!inputRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setInputHeight(entry.contentRect.height + UI.INPUT_PADDING_BOTTOM);
      }
    });

    observer.observe(inputRef.current);
    return () => observer.disconnect();
  }, []);

  // 当有消息、正在加载历史、或存在 sessionId (意味着正在查看某个会话) 时，保持输入框在底部
  // 这样可以避免在切换会话加载数据期间，输入框先跳到中间再跳到底部的抖动
  const shouldShowInputAtBottom = hasMessages || isLoadingHistory || !!sessionId;

  return {
    inputHeight,
    inputRef,
    shouldShowInputAtBottom,
  };
}

