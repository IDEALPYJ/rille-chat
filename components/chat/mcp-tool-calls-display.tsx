'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Puzzle, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import * as Icons from 'lucide-react';
import { McpToolCallInfo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

interface McpToolCallsDisplayProps {
  toolCalls: McpToolCallInfo[];
}

/**
 * 插件调用显示组件
 * 采用与深度思考、联网搜索统一的折叠式标题栏设计
 */
export function McpToolCallsDisplay({ toolCalls }: McpToolCallsDisplayProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  // 动态获取图标组件
  const getIconComponent = (iconName: string | null | undefined) => {
    if (!iconName) return null;
    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    return IconComponent || null;
  };

  // 生成预览文本
  const previewText = useMemo(() => {
    if (!toolCalls || toolCalls.length === 0) return "";
    
    const totalCount = toolCalls.length;
    const pendingCount = toolCalls.filter(tc => (tc as any).status === 'pending').length;
    const errorCount = toolCalls.filter(tc => tc.error).length;
    
    if (pendingCount > 0) {
      return `正在运行 ${pendingCount}/${totalCount} 个工具...`;
    }
    if (errorCount > 0) {
      return `${totalCount} 个工具调用，${errorCount} 个出错`;
    }
    return `${totalCount} 个工具调用完成`;
  }, [toolCalls]);

  // 检查是否有正在运行的工具
  const hasPending = useMemo(() => {
    return toolCalls.some(tc => (tc as any).status === 'pending');
  }, [toolCalls]);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="pt-0">
      {/* 折叠标题栏 - 橙色主题与插件按钮一致 */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 text-[#9a3412] dark:text-[#fdba74] font-medium text-[11px] group-hover:text-[#7c2d12] dark:group-hover:text-[#fed7aa] transition-colors">
          <Puzzle size={14} className={hasPending ? "animate-pulse" : ""} />
          <span>{t("messageDisplay.pluginCalls")}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
        
        {/* 折叠时显示预览 */}
        {!isExpanded && previewText && (
          <div className="text-muted-foreground dark:text-muted-foreground text-[11px] truncate flex-1 font-normal">
            {previewText}
          </div>
        )}
      </div>

      {/* 展开的内容 */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {toolCalls.map((toolCall, index) => {
            const isSuccess = !toolCall.error;
            const hasResult = toolCall.result !== null && toolCall.result !== undefined;
            const isPending = (toolCall as any).status === 'pending';
            const IconComponent = getIconComponent(toolCall.pluginIcon);
            
            return (
              <div
                key={index}
                className={cn(
                  "rounded-md border overflow-hidden",
                  isSuccess
                    ? "border-border dark:border-border bg-muted/30 dark:bg-muted/20"
                    : "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
                )}
              >
                {/* 工具卡片标题栏 */}
                <div className="flex items-center gap-2 p-2">
                  {/* 插件图标和名称 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {IconComponent ? (
                      <IconComponent className="shrink-0 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                    ) : (
                      <Puzzle className="shrink-0 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                    )}
                    <span className="font-medium text-[11px] text-foreground dark:text-foreground truncate">
                      {toolCall.pluginName}
                    </span>
                    <span className="text-[10px] text-muted-foreground dark:text-muted-foreground truncate">
                      · {toolCall.toolName}
                    </span>
                    {isPending && (
                      <span className="text-[10px] text-muted-foreground animate-pulse ml-1 italic">
                        Running...
                      </span>
                    )}
                  </div>

                  {/* 状态指示器 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending ? (
                      <div className="w-3 h-3 border-2 border-orange-500/50 border-t-orange-500 rounded-full animate-spin" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    )}
                    {!isPending && toolCall.duration !== undefined && (
                      <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground dark:text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{toolCall.duration}ms</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 工具调用详情 - 简化层级 */}
                <div className="px-2 pb-2 space-y-2 border-t border-border dark:border-border pt-2">
                  {/* 调用参数 */}
                  <div>
                    <div className="text-[10px] font-medium text-muted-foreground mb-1">
                      {t("messageDisplay.callParams")}
                    </div>
                    <pre className="bg-muted dark:bg-muted/50 rounded p-2 text-[10px] font-mono text-foreground/80 dark:text-muted-foreground overflow-x-auto">
                      {JSON.stringify(toolCall.arguments, null, 2)}
                    </pre>
                  </div>

                  {/* 调用结果或错误 */}
                  {toolCall.error ? (
                    <div>
                      <div className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1">
                        {t("messageDisplay.errorInfo")}
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 rounded p-2 text-[10px] text-red-700 dark:text-red-300">
                        {toolCall.error}
                      </div>
                    </div>
                  ) : hasResult ? (
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground mb-1">
                        {t("messageDisplay.callResult")}
                      </div>
                      <ResultDisplay result={toolCall.result} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * 简化的结果展示组件
 */
function ResultDisplay({ result }: { result: any }) {
  // 如果是字符串，尝试判断是否是图片 URL
  if (typeof result === 'string') {
    const isImageUrl = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))(?:\?.*)?$/i.test(result);
    if (isImageUrl) {
      return (
        <div className="relative group">
          <img
            src={result}
            alt="Tool output"
            className="max-w-full max-h-48 rounded-md border border-border dark:border-border object-contain"
            loading="lazy"
          />
          <a
            href={result}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-black/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      );
    }
    return <pre className="bg-muted dark:bg-muted/50 rounded p-2 text-[10px] font-mono text-foreground/80 dark:text-muted-foreground whitespace-pre-wrap break-words">{result}</pre>;
  }

  // 如果是数组且包含对象，尝试渲染为简单表格
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object' && result[0] !== null) {
    const keys = Object.keys(result[0]).slice(0, 5); // 最多显示5列
    return (
      <div className="overflow-x-auto border rounded-md border-border dark:border-border">
        <table className="min-w-full">
          <thead className="bg-muted/50 dark:bg-muted/30">
            <tr>
              {keys.map(key => (
                <th key={key} className="px-2 py-1 text-left text-[9px] font-medium text-muted-foreground uppercase">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.slice(0, 5).map((row, i) => (
              <tr key={i} className="border-t border-border dark:border-border">
                {keys.map(key => (
                  <td key={key} className="px-2 py-1 text-[10px] text-foreground/80 dark:text-muted-foreground">
                    {String(row[key] ?? '').slice(0, 50)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.length > 5 && (
          <div className="px-2 py-1 text-center text-[9px] text-muted-foreground border-t border-border dark:border-border">
            +{result.length - 5} more rows
          </div>
        )}
      </div>
    );
  }

  // 默认渲染为 JSON
  return (
    <pre className="bg-muted dark:bg-muted/50 rounded p-2 text-[10px] font-mono text-foreground/80 dark:text-muted-foreground overflow-x-auto">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
