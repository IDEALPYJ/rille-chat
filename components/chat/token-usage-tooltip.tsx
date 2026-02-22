import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/context";

interface TokenUsageTooltipProps {
  inputTokens: number;
  outputTokens: number;
  inputCacheTokens?: number;
  outputCacheTokens?: number;
  children: React.ReactNode;
}

export function TokenUsageTooltip({
  inputTokens,
  outputTokens,
  inputCacheTokens = 0,
  outputCacheTokens = 0,
  children
}: TokenUsageTooltipProps) {
  const { t } = useI18n();
  const totalTokens = inputTokens + outputTokens + inputCacheTokens + outputCacheTokens;
  
  // 计算各部分占比
  const inputPercent = totalTokens > 0 ? (inputTokens / totalTokens) * 100 : 0;
  const outputPercent = totalTokens > 0 ? (outputTokens / totalTokens) * 100 : 0;
  const inputCachePercent = totalTokens > 0 ? (inputCacheTokens / totalTokens) * 100 : 0;
  const outputCachePercent = totalTokens > 0 ? (outputCacheTokens / totalTokens) * 100 : 0;

  const hasCacheTokens = inputCacheTokens > 0 || outputCacheTokens > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-64 p-3">
        <div className="space-y-3">
          <div className="text-xs font-medium text-foreground dark:text-foreground/70">
            {t("messageDisplay.tokenUsage")}
          </div>
          
          {/* 横条占比图 */}
          <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted dark:bg-muted">
            {inputPercent > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${inputPercent}%` }}
                title={`${t("messageDisplay.input")}: ${inputTokens} ${t("messageDisplay.tokens")}`}
              />
            )}
            {outputPercent > 0 && (
              <div
                className="bg-green-500"
                style={{ width: `${outputPercent}%` }}
                title={`${t("messageDisplay.output")}: ${outputTokens} ${t("messageDisplay.tokens")}`}
              />
            )}
            {inputCachePercent > 0 && (
              <div
                className="bg-purple-500"
                style={{ width: `${inputCachePercent}%` }}
                title={`${t("messageDisplay.inputCache")}: ${inputCacheTokens} ${t("messageDisplay.tokens")}`}
              />
            )}
            {outputCachePercent > 0 && (
              <div
                className="bg-orange-500"
                style={{ width: `${outputCachePercent}%` }}
                title={`${t("messageDisplay.outputCache")}: ${outputCacheTokens} ${t("messageDisplay.tokens")}`}
              />
            )}
          </div>

          {/* 详细数据 */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-foreground/80 dark:text-muted-foreground">{t("messageDisplay.input")}</span>
              </div>
              <span className="font-mono text-foreground dark:text-foreground">{inputTokens}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-foreground/80 dark:text-muted-foreground">{t("messageDisplay.output")}</span>
              </div>
              <span className="font-mono text-foreground dark:text-foreground">{outputTokens}</span>
            </div>
            {hasCacheTokens && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-foreground/80 dark:text-muted-foreground">{t("messageDisplay.inputCache")}</span>
                  </div>
                  <span className="font-mono text-foreground dark:text-foreground">{inputCacheTokens}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-foreground/80 dark:text-muted-foreground">{t("messageDisplay.outputCache")}</span>
                  </div>
                  <span className="font-mono text-foreground dark:text-foreground">{outputCacheTokens}</span>
                </div>
              </>
            )}
            <div className="pt-1 border-t border-border dark:border-border flex items-center justify-between font-medium">
              <span className="text-foreground/80 dark:text-muted-foreground">{t("messageDisplay.total")}</span>
              <span className="font-mono text-foreground dark:text-foreground">{totalTokens}</span>
            </div>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
