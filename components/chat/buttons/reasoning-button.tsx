/**
 * 深度思考按钮组件
 * 支持开关切换和推理强度配置(hover菜单)
 */

"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { ReasoningSettings, ModelConfig } from "@/lib/types";
import { ReasoningEffortPicker } from "../settings/reasoning-effort-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";

interface ReasoningButtonProps {
  /** 是否启用深度思考 */
  enabled: boolean;

  /** 是否禁用按钮 */
  disabled: boolean;

  /** 禁用原因提示 */
  disabledReason?: string;

  /** 是否锁定(reasoning-only模型) */
  locked: boolean;

  /** 是否显示推理强度配置器 */
  showEffortPicker: boolean;

  /** 模型配置 */
  modelConfig: ModelConfig | null;

  /** 推理设置 */
  reasoning: ReasoningSettings;

  /** 切换开关的回调 */
  onToggle: (enabled: boolean) => void;

  /** 推理设置变更的回调 */
  onReasoningChange: (reasoning: ReasoningSettings) => void;
}

export function ReasoningButton({
  enabled,
  disabled,
  disabledReason,
  locked,
  showEffortPicker,
  modelConfig,
  reasoning,
  onToggle,
  onReasoningChange,
}: ReasoningButtonProps) {
  const { t } = useI18n();

  // locked时不可切换
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !locked) {
      onToggle(!enabled);
    }
  };

  // 基础按钮样式
  const buttonClass = cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap relative",
    // Disabled state (unavailable)
    disabled
      ? "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground cursor-not-allowed"
      : // Locked but Enabled (Forced On)
      locked && enabled
        ? "bg-[#ede9fe] dark:bg-[rgba(139,92,246,0.15)] border-transparent text-[#5b21b6] dark:text-[#c4b5fd] cursor-default opacity-100"
        : // Locked and Disabled (Forced Off - though usually just disabled)
        locked && !enabled
          ? "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground cursor-not-allowed"
          : // Normal Enabled
          enabled
            ? "bg-[#ede9fe] dark:bg-[rgba(139,92,246,0.15)] border-transparent text-[#5b21b6] dark:text-[#c4b5fd] hover:bg-[#ede9fe]/80 dark:hover:bg-[rgba(139,92,246,0.2)] cursor-pointer"
            : // Normal Disabled (Off)
            "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-500 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80 cursor-pointer"
  );

  const buttonContent = (
    <>
      <Sparkles
        className={cn(
          "w-3.5 h-3.5 transition-colors",
          !disabled && !locked && enabled && "group-hover:scale-110"
        )}
      />
      <span className="text-xs font-medium">{t("buttons.deepThinking")}</span>
    </>
  );

  // 如果启用且可以配置推理强度，使用ReasoningEffortPicker包装（hover触发）
  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100); // 100ms 延时
  };

  if (showEffortPicker && enabled) {
    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        <ReasoningEffortPicker
          modelConfig={modelConfig}
          reasoning={reasoning}
          onReasoningChange={onReasoningChange}
          open={isHovered}
          onOpenChange={setIsHovered}
        >
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={buttonClass}
          >
            {buttonContent}
          </button>
        </ReasoningEffortPicker>
      </div>
    );
  }

  // 统一按钮内容
  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={buttonClass}
    >
      {buttonContent}
    </button>
  );

  // 只有禁用时显示 tooltip
  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="inline-block cursor-help">
              {button}
            </div>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top" sideOffset={8}>
              <p className="text-xs">{disabledReason ? t(disabledReason as any) : t("reasoningEffort.notSupported")}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 普通可切换状态
  return button;
}
