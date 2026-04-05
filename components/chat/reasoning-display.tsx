"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n/context";

interface ReasoningDisplayProps {
  content: string;
}

export function ReasoningDisplay({ content }: ReasoningDisplayProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  // 智能预览文本：优先显示**包裹的标题，无标题则显示最新段落首句
  const previewText = useMemo(() => {
    if (!content) return "";
    const lines = content.trim().split("\n");

    // 1. 查找被**包裹的标题（从后往前找，显示最新的标题）
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) {
        // 返回**包裹的内容
        return boldMatch[1];
      }
    }

    // 2. 查找Markdown标题（支持 # ## ### 等）
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (/^#{1,6}\s+.+/.test(trimmed)) {
        // 移除 # 符号，返回标题文本
        return trimmed.replace(/^#{1,6}\s+/, "");
      }
    }

    // 3. 无标题时，显示最新段落的第一句话（从后往前找）
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      // 跳过空行、代码块标记、列表标记
      if (!line || line.startsWith("```") || line.startsWith("-") || line.startsWith("*")) {
        continue;
      }
      // 提取第一句话（到第一个句号、问号或感叹号）
      const match = line.match(/^([^。！？.!?]+[。！？.!?]?)/);
      if (match) {
        return match[1];
      }
      return line.slice(0, 50); // 如果没有标点，取前50字符
    }

    // 4. 兜底：返回最后一行非空内容
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) {
        return lines[i].trim();
      }
    }
    return "";
  }, [content]);

  if (!content) return null;

  return (
    <div className="pt-0">
      <div
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium text-[11px] group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
          <Brain size={14} />
          <span>{t("messageDisplay.reasoning")}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>

        {!isExpanded && previewText && (
          <div className="text-muted-foreground/70 text-[11px] truncate flex-1 font-normal italic">
            {previewText}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 p-3 rounded-md border border-border/50 bg-muted/30 dark:bg-muted/20">
          <div className="prose prose-zinc prose-xs dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-[11px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node: _node, children, ...props }: any) {
                  return (
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre({ children }: any) {
                  return <>{children}</>;
                }
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
