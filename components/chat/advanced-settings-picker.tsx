"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"
import { AdvancedSettingsButtonContent } from "./advanced-settings-button-content"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { AdvancedSettings, ModelParameter, ReasoningSettings } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"

import { cn } from "@/lib/utils"

interface AdvancedSettingsPickerProps {
  settings: AdvancedSettings
  onSettingsChange: (settings: AdvancedSettings) => void
  modelParameters?: ModelParameter[]  // 新增：模型参数配置
  reasoning?: ReasoningSettings   
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  temperature: 0.7,
  topP: 1,
  topK: 0,
  presencePenalty: 0,
  frequencyPenalty: 0,
  seed: undefined,
  stopSequences: [],
  verbosity: 'medium',
}

export function AdvancedSettingsPicker({
  settings,
  onSettingsChange,
  modelParameters = [],
  reasoning: _reasoning,
}: AdvancedSettingsPickerProps) {
  const { t } = useI18n()

  // 获取采样参数配置
  const samplingParams = modelParameters.filter(p =>
    ['temperature', 'top_p', 'top_k', 'presence_penalty', 'frequency_penalty', 'verbosity', 'context_1m'].includes(p.id)
  );

  // 获取参数配置的辅助函数
  const getParamConfig = (paramId: string): ModelParameter | null => {
    return samplingParams.find(p => p.id === paramId) || null;
  };

  // 参数现在已经在 useChatSettings 中通过 resolveParameterConflicts 过滤
  // 所以这里我们只需要检查参数是否存在于 modelParameters 中即可

  const handleChange = (key: keyof AdvancedSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    })
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)

  // 计算实际显示的参数数量
  const visibleParamsCount = React.useMemo(() => {
    let count = 0;
    const paramIds = ['temperature', 'top_p', 'top_k', 'presence_penalty', 'frequency_penalty', 'context_1m'];

    for (const paramId of paramIds) {
      const paramConfig = samplingParams.find(p => p.id === paramId) || null;
      if (modelParameters.length > 0 && !paramConfig) continue;
      count++;
    }

    if (modelParameters.find(p => p.id === 'verbosity')) {
      count++;
    }

    return count;
  }, [modelParameters, samplingParams]);

  // 如果没有可显示的参数，禁用按钮
  const isDisabled = visibleParamsCount === 0;

  return (
    <TooltipProvider delayDuration={100}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isDisabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group",
              isDisabled
                ? "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-400 dark:text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
            )}
            title={isDisabled ? t("common.noAdvancedParams") : ""}
          >
            <AdvancedSettingsButtonContent hasChanges={hasChanges} />
          </button>
        </PopoverTrigger>
        {!isDisabled && (
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-[350px] p-3" side="top" align="center">
            <div className="space-y-2">
              <div className="grid gap-3 pt-2">
                {/* Verbosity */}
                {(() => {
                  const paramConfig = modelParameters.find(p => p.id === 'verbosity');
                  if (!paramConfig) return null;

                  const options = paramConfig.options || ["low", "medium", "high"];
                  const currentIndex = options.indexOf(settings.verbosity || 'medium');
                  const safeIndex = currentIndex !== -1 ? currentIndex : 1;
                  const maxIndex = options.length - 1;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-xs font-medium flex-grow">{t("advancedSettings.verbosity")}</Label>
                          {paramConfig.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive text-xs">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-xs">{t("advancedSettings.verbosityDesc" as any)}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 lowercase">verbosity</p>
                      </div>

                      <div className="flex items-center gap-2 flex-1 pt-1">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <Slider
                            id="verbosity"
                            className="w-full"
                            min={0}
                            max={maxIndex}
                            step={1}
                            disabled={paramConfig.disabled}
                            value={[safeIndex]}
                            onValueChange={([val]) => handleChange("verbosity", options[val])}
                            marks={options.map((_, index) => (index / maxIndex) * 100)}
                          />
                          <div className="flex justify-between px-0.5">
                            {options.map((opt, index) => (
                              <span
                                key={opt}
                                className={cn(
                                  "text-[9px] transition-colors capitalize",
                                  index === safeIndex ? "text-primary font-medium" : "text-muted-foreground/40"
                                )}
                                style={{
                                  flex: index === 0 || index === options.length - 1 ? '0 0 auto' : '1 1 0',
                                  textAlign: index === 0 ? 'left' : index === options.length - 1 ? 'right' : 'center'
                                }}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right capitalize select-none">
                          {t(`advancedSettings.verbosity_${options[safeIndex]}` as any) || options[safeIndex]}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 1M Context */}
                {(() => {
                  const paramConfig = getParamConfig('context_1m');
                  if (!paramConfig) return null;

                  const isEnabled = settings.context_1m === 'enabled';

                  return (
                    <div className={cn("flex items-center justify-between gap-4 py-1 transition-opacity", paramConfig.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-xs font-medium flex-grow">{t("imageChat.context1M")}</Label>
                          {paramConfig.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive text-xs">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-xs">{t("imageChat.context1MTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 lowercase">context_1m</p>
                      </div>

                      <div className="flex justify-end flex-1">
                        <Switch
                          id="context_1m"
                          checked={isEnabled}
                          disabled={paramConfig.disabled}
                          onCheckedChange={(checked: boolean) => handleChange("context_1m", checked ? "enabled" : "disabled")}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Compaction */}
                {(() => {
                  const paramConfig = modelParameters.find(p => p.id === 'compaction');
                  if (!paramConfig) return null;

                  const isEnabled = settings.compaction === 'enabled';

                  return (
                    <div className={cn("flex items-center justify-between gap-4 py-1 transition-opacity", paramConfig.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-xs font-medium flex-grow">{t("imageChat.compaction")}</Label>
                          {paramConfig.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive text-xs">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-xs">{t("imageChat.compactionTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 lowercase">compaction</p>
                      </div>

                      <div className="flex justify-end flex-1">
                        <Switch
                          id="compaction"
                          checked={isEnabled}
                          disabled={paramConfig.disabled}
                          onCheckedChange={(checked: boolean) => handleChange("compaction", checked ? "enabled" : "disabled")}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Compaction Trigger */}
                {(() => {
                  const paramConfig = modelParameters.find(p => p.id === 'compaction_trigger');
                  // 只有在 compaction 启用时才显示
                  if (!paramConfig || settings.compaction !== 'enabled') return null;

                  const min = paramConfig?.min ?? 50000;
                  const max = paramConfig?.max ?? 200000;
                  const step = paramConfig?.step ?? 1000;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 150000;
                  const currentValue = settings.compaction_trigger ?? defaultValue;
                  const isOutOfRange = currentValue < min || currentValue > max;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label className="text-xs font-medium flex-grow">{t("imageChat.compactionTrigger")}</Label>
                          {paramConfig.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive text-xs">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-xs">{t("imageChat.compactionTriggerTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80 lowercase">compaction_trigger</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="compaction_trigger"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig.disabled}
                          value={[Math.min(Math.max(currentValue, min), max)]}
                          onValueChange={([value]) => handleChange("compaction_trigger", value)}
                        />
                        <Input
                          type="number"
                          value={currentValue}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val)) {
                              handleChange("compaction_trigger", val)
                            }
                          }}
                          onBlur={() => onSettingsChange(settings)}
                          className={cn(
                            "w-28 h-8 text-xs font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            isOutOfRange && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Temperature */}
                {(() => {
                  const paramConfig = getParamConfig('temperature');
                  if (modelParameters.length > 0 && !paramConfig) return null;

                  const min = paramConfig?.min ?? 0;
                  const max = paramConfig?.max ?? 2;
                  const step = paramConfig?.step ?? 0.1;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 0.7;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig?.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="temperature" className="text-xs font-medium flex-grow">{t("advancedSettings.creativity")}</Label>
                          {paramConfig?.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p>{t("advancedSettings.creativityDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">temperature</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="temperature"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig?.disabled}
                          value={[settings.temperature ?? defaultValue]}
                          onValueChange={([value]) => handleChange("temperature", value)}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{settings.temperature ?? defaultValue}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Top P */}
                {(() => {
                  const paramConfig = getParamConfig('top_p');
                  // 如果模型有参数配置但不包含top_p，则不显示
                  if (modelParameters.length > 0 && !paramConfig) return null;

                  const min = paramConfig?.min ?? 0;
                  const max = paramConfig?.max ?? 1;
                  const step = paramConfig?.step ?? 0.05;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 1;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig?.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="topP" className="text-xs font-medium flex-grow">{t("advancedSettings.diversity")}</Label>
                          {paramConfig?.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p>{t("advancedSettings.diversityDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">Top P</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="topP"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig?.disabled}
                          value={[settings.topP ?? defaultValue]}
                          onValueChange={([value]) => handleChange("topP", value)}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{settings.topP ?? defaultValue}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Top K */}
                {(() => {
                  const paramConfig = getParamConfig('top_k');
                  if (modelParameters.length > 0 && !paramConfig) return null;

                  const min = paramConfig?.min ?? 0;
                  const max = paramConfig?.max ?? 100;
                  const step = paramConfig?.step ?? 1;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 0;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig?.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="topK" className="text-xs font-medium flex-grow">{t("advancedSettings.vocabulary")}</Label>
                          {paramConfig?.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p>{t("advancedSettings.vocabularyDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">Top K</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="topK"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig?.disabled}
                          value={[settings.topK ?? defaultValue]}
                          onValueChange={([value]) => handleChange("topK", value)}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{settings.topK ?? defaultValue}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Presence Penalty */}
                {(() => {
                  const paramConfig = getParamConfig('presence_penalty');
                  if (modelParameters.length > 0 && !paramConfig) return null;

                  const min = paramConfig?.min ?? -2;
                  const max = paramConfig?.max ?? 2;
                  const step = paramConfig?.step ?? 0.1;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 0;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig?.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="presencePenalty" className="text-xs font-medium flex-grow">{t("advancedSettings.topicFreshness")}</Label>
                          {paramConfig?.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p>{t("advancedSettings.topicFreshnessDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">Presence Penalty</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="presencePenalty"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig?.disabled}
                          value={[settings.presencePenalty ?? defaultValue]}
                          onValueChange={([value]) => handleChange("presencePenalty", value)}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{settings.presencePenalty ?? defaultValue}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Frequency Penalty */}
                {(() => {
                  const paramConfig = getParamConfig('frequency_penalty');
                  if (modelParameters.length > 0 && !paramConfig) return null;

                  const min = paramConfig?.min ?? -2;
                  const max = paramConfig?.max ?? 2;
                  const step = paramConfig?.step ?? 0.1;
                  const defaultValue = typeof paramConfig?.default === 'number' ? paramConfig.default : 0;

                  return (
                    <div className={cn("flex items-center justify-between gap-4 transition-opacity", paramConfig?.disabled && "opacity-50")}>
                      <div className="flex-shrink-0 w-[110px]">
                        <div className="flex items-center justify-between gap-1">
                          <Label htmlFor="frequencyPenalty" className="text-xs font-medium flex-grow">{t("advancedSettings.repetition")}</Label>
                          {paramConfig?.disabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-destructive/70 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p className="text-destructive">{paramConfig.disabledReason || t("common.notAvailable")}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center" className="max-w-xs">
                                <p>{t("advancedSettings.repetitionDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/80">Frequency Penalty</p>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Slider
                          id="frequencyPenalty"
                          className="w-full"
                          min={min}
                          max={max}
                          step={step}
                          disabled={paramConfig?.disabled}
                          value={[settings.frequencyPenalty ?? defaultValue]}
                          onValueChange={([value]) => handleChange("frequencyPenalty", value)}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">{settings.frequencyPenalty ?? defaultValue}</span>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </TooltipProvider>
  )
}