"use client";

import { useEffect, useRef } from "react";

interface InputCompletionProps {
  input: string;
  completionText: string;
  onHeightChange?: (height: number) => void;
}

export function InputCompletion({
  input,
  completionText,
  onHeightChange,
}: InputCompletionProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // 计算要显示的补全文本
  const displayCompletion = (() => {
    if (!completionText || !input.trim()) {
      return null;
    }

    // 去除 completionText 中与 input 重叠的部分
    // API应该只返回新的部分，但AI模型可能不严格遵循，需要智能检测重叠
    let result = completionText.trim();
    
    // 如果 completionText 以 input 开头（完全包含input），去掉input部分
    if (result.toLowerCase().startsWith(input.toLowerCase())) {
      result = result.slice(input.length).trim();
    } else {
      // 检查 completionText 的开头是否与 input 的结尾有部分重叠
      // 例如 input = "hello w", completionText = "w world" -> 显示 " world"
      // 从最长的可能重叠开始检查（最多到input的长度的一半，避免误判）
      const maxOverlap = Math.min(input.length, result.length, Math.floor(input.length * 0.8));
      let overlapLength = 0;
      for (let i = maxOverlap; i > 0; i--) {
        const inputSuffix = input.slice(-i).toLowerCase();
        const completionPrefix = result.slice(0, i).toLowerCase();
        if (inputSuffix === completionPrefix) {
          overlapLength = i;
          break;
        }
      }
      
      if (overlapLength > 0) {
        result = result.slice(overlapLength).trim();
      }
    }

    // 如果处理后没有内容，返回 null
    return result || null;
  })();

  // 使用 useEffect 来测量高度并通知父组件
  // 必须在所有条件检查之前调用，确保 Hooks 调用顺序一致
  useEffect(() => {
    if (measureRef.current && onHeightChange) {
      const height = measureRef.current.scrollHeight;
      onHeightChange(height);
    } else if (onHeightChange && !displayCompletion) {
      // 如果没有补全文本，通知父组件使用默认高度
      onHeightChange(0);
    }
  }, [input, displayCompletion, onHeightChange]);

  // 如果处理后没有内容，不显示
  if (!displayCompletion) {
    return null;
  }

  return (
    <>
      {/* 隐藏的测量div，用于计算包含补全文本的总高度 */}
      <div
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none py-[14px] px-3 md:py-[18px] md:px-6 whitespace-pre-wrap break-all text-xs md:text-xs w-full"
        style={{
          zIndex: 0,
          visibility: "hidden",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
      >
        {input}
        <span className="text-muted-foreground/50 dark:text-foreground/50">
          {displayCompletion}
        </span>
      </div>
      {/* 显示的补全文本层 - 与textarea完全对齐 */}
      <div
        ref={displayRef}
        className="absolute inset-0 pointer-events-none py-[14px] px-3 md:py-[18px] md:px-6 whitespace-pre-wrap break-all text-xs md:text-xs"
        style={{
          zIndex: 1,
        }}
      >
        {/* 用户输入的占位（完全透明，用于对齐和换行） */}
        <span
          style={{
            color: "transparent",
          }}
        >
          {input}
        </span>
        {/* 补全文本 - 紧跟在用户输入后面，自然换行 */}
        <span
          className="text-muted-foreground/60 dark:text-foreground/50"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
            pointerEvents: "none",
          }}
        >
          {displayCompletion}
        </span>
      </div>
    </>
  );
}

