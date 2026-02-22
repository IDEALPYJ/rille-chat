/**
 * 联网搜索按钮组件
 * 支持切换开关和搜索源选择(hover菜单)
 */

"use client";

import * as React from "react";
import { Globe, Bot, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { WebSearchSource } from "@/hooks/use-web-search-source";
import { ModelParameter } from "@/lib/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipPortal,
} from "@/components/ui/tooltip";

interface WebSearchButtonProps {
  /** 是否启用联网搜索 */
  enabled: boolean;

  /** 是否禁用按钮 */
  disabled: boolean;

  /** 禁用原因提示 */
  disabledReason?: string;

  /** 是否显示搜索源选择器(当模型自带搜索时) */
  showSourcePicker: boolean;

  /** 是否配置了外部搜索服务 */
  isExternalConfigured?: boolean;

  /** 外部搜索服务名称 */
  externalProviderName?: string;

  /** 当前搜索源配置 */
  source?: WebSearchSource;

  /** 切换开关的回调 */
  onToggle: (enabled: boolean) => void;

  /** 搜索源变更的回调 */
  onSourceChange?: (source: WebSearchSource) => void;

  /** 模型参数列表(用于显示search_strategy拖动条) */
  modelParameters?: ModelParameter[];

  /** 当前用户设置 */
  userSettings?: Record<string, any>;

  /** 参数变更回调 */
  onParameterChange?: (paramId: string, value: number | string | boolean) => void;
}

export function WebSearchButton({
  enabled,
  disabled,
  disabledReason,
  showSourcePicker,
  isExternalConfigured = false,
  externalProviderName,
  source,
  onToggle,
  onSourceChange,
  modelParameters,
  userSettings,
  onParameterChange,
}: WebSearchButtonProps) {
  const { t } = useI18n();

  // 查找 search_strategy 参数
  const searchStrategyParam = modelParameters?.find(p => p.id === 'search_strategy');
  const hasSearchStrategy = !!searchStrategyParam && enabled;

  // 查找 engine 参数 (OpenRouter 等服务商使用)
  const engineParam = modelParameters?.find(p => p.id === 'engine');
  const hasEngine = !!engineParam && enabled && source?.type === 'builtin';

  // 查找 search_engine 参数 (Zai 智谱AI 使用)
  const searchEngineParam = modelParameters?.find(p => p.id === 'search_engine');
  const hasSearchEngine = !!searchEngineParam && enabled && source?.type === 'builtin';

  // 查找 Perplexity 特有参数
  const searchTypeParam = modelParameters?.find(p => p.id === 'search_type');
  const searchModeParam = modelParameters?.find(p => p.id === 'search_mode');
  const searchContextSizeParam = modelParameters?.find(p => p.id === 'search_context_size');

  // 是否显示 Perplexity 特有参数
  const hasPerplexityParams = enabled && source?.type === 'builtin' && (
    !!searchTypeParam || !!searchModeParam || !!searchContextSizeParam
  );

  // 点击切换开关
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onToggle(!enabled);
    }
  };

  // 搜索源选择
  const handleSourceChange = (type: string) => {
    if (onSourceChange) {
      onSourceChange({
        ...source,
        type: type as 'builtin' | 'external'
      });
    }
  };

  // 基础按钮样式
  const buttonClass = cn(
    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap",
    disabled
      ? "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground cursor-not-allowed"
      : enabled
      ? "bg-[#dbeafe] dark:bg-[rgba(59,130,246,0.15)] border-transparent text-[#1e40af] dark:text-[#93c5fd] hover:bg-[#dbeafe]/80 dark:hover:bg-[rgba(59,130,246,0.2)]"
      : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-500 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
  );

  // 如果可以选择搜索源，使用Popover包装（hover触发）
  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = React.useCallback(() => {
    if (disabled) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = React.useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150); // 延迟关闭，避免鼠标快速移动时闪烁
  }, []);

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // 判断是否显示源选择器
  const shouldShowSourcePicker = showSourcePicker ||
    !!modelParameters?.find(p => p.id === 'search_strategy' || p.id === 'engine' || p.id === 'search_engine') ||
    hasPerplexityParams;

  if (shouldShowSourcePicker) {
    return (
      <Popover open={isHovered} onOpenChange={(open) => {
        // 只在关闭时允许，打开时由hover控制
        if (!open) {
          setIsHovered(false);
        }
      }} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={buttonClass}
          >
            <Globe
              className={cn(
                "w-3.5 h-3.5 transition-colors",
                !disabled && enabled && "group-hover:scale-110"
              )}
            />
            <span className="text-xs font-medium">{t("buttons.webSearch")}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3"
          side="top"
          align="center"
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
            setIsHovered(true);
          }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            {/* 搜索源选择 - 互斥按钮 */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">{t("webSearchPopover.searchSource")}</div>
              <div className="flex gap-1.5">
                {/* 模型自带搜索按钮 */}
                <button
                  type="button"
                  onClick={() => handleSourceChange('builtin')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all",
                    source?.type === 'builtin'
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                  )}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{t("webSearchPopover.modelBuiltin")}</span>
                </button>

                {/* 外部搜索服务按钮 */}
                {isExternalConfigured && (
                  <button
                    type="button"
                    onClick={() => handleSourceChange('external')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium transition-all",
                      source?.type === 'external'
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{externalProviderName || t("webSearchPopover.external")}</span>
                  </button>
                )}
              </div>
            </div>

            {/* search_strategy 拖动条 */}
            {hasSearchStrategy && source?.type === 'builtin' && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{t("webSearchPopover.searchStrategy")}</span>
                  <span className="text-xs text-muted-foreground">
                    {(() => {
                      const value = Number(userSettings?.search_strategy ?? searchStrategyParam.default);
                      if (value === 0) return t("webSearchPopover.fast");
                      if (value === 1) return t("webSearchPopover.deep");
                      if (value === 2) return t("webSearchPopover.agent");
                      return t("webSearchPopover.fast");
                    })()}
                  </span>
                </div>
                <Slider
                  value={[Number(userSettings?.search_strategy ?? searchStrategyParam.default)]}
                  min={searchStrategyParam.min}
                  max={searchStrategyParam.max}
                  step={searchStrategyParam.step}
                  onValueChange={(value) => {
                    onParameterChange?.('search_strategy', value[0]);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{t("webSearchPopover.fast")}</span>
                  {searchStrategyParam.max && searchStrategyParam.max >= 2 && <span>{t("webSearchPopover.deep")}</span>}
                  <span>{searchStrategyParam.max && searchStrategyParam.max >= 2 ? t("webSearchPopover.agent") : t("webSearchPopover.deep")}</span>
                </div>
              </div>
            )}

            {/* engine 选择器 (OpenRouter 等服务商使用) */}
            {hasEngine && (
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground">{t("webSearchPopover.searchEngine")}</div>
                <div className="flex gap-1.5">
                  {engineParam.options?.map((option: string) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onParameterChange?.('engine', option)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all capitalize",
                        userSettings?.engine === option || (!userSettings?.engine && engineParam.default === option)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* search_engine 选择器 (Zai 智谱AI 使用) */}
            {hasSearchEngine && (
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-muted-foreground">{t("webSearchPopover.searchEngine")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {searchEngineParam.options?.map((option: string) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onParameterChange?.('search_engine', option)}
                      className={cn(
                        "flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all",
                        userSettings?.search_engine === option || (!userSettings?.search_engine && searchEngineParam.default === option)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                      )}
                    >
                      {(() => {
                        // Zai 搜索引擎选项映射
                        const labels: Record<string, string> = {
                          'search_std': t("webSearchPopover.standard"),
                          'search_pro': t("webSearchPopover.advanced"),
                          'search_pro_sogou': t("webSearchPopover.sogou"),
                          'search_pro_quark': t("webSearchPopover.quark")
                        };
                        return labels[option] || option;
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Perplexity 特有参数 */}
            {hasPerplexityParams && (
              <div className="space-y-3 pt-2 border-t">
                {/* search_type 选择器 */}
                {searchTypeParam && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">{t("webSearchPopover.searchType")}</div>
                    <div className="flex gap-1.5">
                      {searchTypeParam.options?.map((option: string) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => onParameterChange?.('search_type', option)}
                          className={cn(
                            "flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all capitalize",
                            userSettings?.search_type === option || (!userSettings?.search_type && searchTypeParam.default === option)
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                          )}
                        >
                          {option === 'fast' ? t("webSearchPopover.fast") : option === 'pro' ? t("webSearchPopover.pro") : option === 'auto' ? t("webSearchPopover.auto") : option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* search_mode 选择器 */}
                {searchModeParam && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground">{t("webSearchPopover.searchMode")}</div>
                    <div className="flex gap-1.5">
                      {searchModeParam.options?.map((option: string) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => onParameterChange?.('search_mode', option)}
                          className={cn(
                            "flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all capitalize",
                            userSettings?.search_mode === option || (!userSettings?.search_mode && searchModeParam.default === option)
                              ? "bg-primary/10 border-primary text-primary"
                              : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                          )}
                        >
                          {option === 'web' ? t("webSearchPopover.web") : option === 'academic' ? t("webSearchPopover.academic") : option === 'sec' ? 'SEC' : option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* search_context_size 拖动条 */}
                {searchContextSizeParam && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{t("webSearchPopover.searchContext")}</span>
                      <span className="text-xs text-muted-foreground">
                        {(() => {
                          const value = userSettings?.search_context_size ?? searchContextSizeParam.default;
                          if (value === 'low') return t("webSearchPopover.low");
                          if (value === 'medium') return t("webSearchPopover.medium");
                          if (value === 'high') return t("webSearchPopover.high");
                          return value;
                        })()}
                      </span>
                    </div>
                    <Slider
                      value={[(() => {
                        const value = userSettings?.search_context_size ?? searchContextSizeParam.default;
                        const options = searchContextSizeParam.options || ['low', 'medium', 'high'];
                        return options.indexOf(value as string);
                      })()]}
                      min={0}
                      max={(searchContextSizeParam.options || ['low', 'medium', 'high']).length - 1}
                      step={1}
                      onValueChange={(value) => {
                        const options = searchContextSizeParam.options || ['low', 'medium', 'high'];
                        onParameterChange?.('search_context_size', options[value[0]]);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{t("webSearchPopover.low")}</span>
                      <span>{t("webSearchPopover.medium")}</span>
                      <span>{t("webSearchPopover.high")}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // 普通按钮（无源选择）
  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={buttonClass}
    >
      <Globe
        className={cn(
          "w-3.5 h-3.5 transition-colors",
          !disabled && enabled && "group-hover:scale-110"
        )}
      />
      <span className="text-xs font-medium">{t("buttons.webSearch")}</span>
    </button>
  );

  // 禁用时显示 tooltip
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
              <p className="text-xs">{disabledReason ? t(disabledReason as any) : t("webSearchPopover.notSupported")}</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
