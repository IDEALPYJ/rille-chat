"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { CodeBlock } from "@/components/ui/code-block";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n/context";

interface ReasoningDisplayProps {
  content: string;
}

export function ReasoningDisplay({ content }: ReasoningDisplayProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const lastLine = useMemo(() => {
    if (!content) return "";
    const lines = content.trim().split("\n");
    return lines[lines.length - 1] || "";
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
        
        {!isExpanded && lastLine && (
          <div className="text-muted-foreground/70 text-[11px] truncate flex-1 font-normal italic">
            {lastLine}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 p-3 rounded-md border border-border/50 bg-muted/30 dark:bg-muted/20">
          <div className="prose prose-zinc prose-xs dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-[11px]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node: _node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';

                  if (inline) {
                    return (
                      <code className="bg-muted px-1 py-0.5 rounded text-[10px] font-mono" {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <CodeBlock
                      language={language}
                      value={String(children).replace(/\n$/, '')}
                    />
                  );
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
