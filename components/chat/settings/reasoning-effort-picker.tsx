"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReasoningSettings, ModelConfig } from "@/lib/types";
import { ReasoningControl, getReasoningConfig } from "@/lib/chat/reasoning-utils";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

interface ReasoningEffortPickerProps {
  modelConfig: ModelConfig | null;
  reasoning: ReasoningSettings;
  onReasoningChange: (reasoning: ReasoningSettings) => void;
  children: React.ReactNode;
  open?: boolean; // 外部控制open状态（用于hover）
  onOpenChange?: (open: boolean) => void; // 外部控制open状态变化
}

/**
 * 格式化数值为可读格式（如 4096 -> "4K"）
 * 使用1024=1K的标准
 */
function formatTokenValue(value: number): string {
  if (value >= 1024) {
    const kValue = value / 1024;
    return `${kValue % 1 === 0 ? kValue.toFixed(0) : kValue.toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * 获取预设档位（用于数值型预算）
 * 返回：1k, 2k, 4k, 8k, 16k, 32k, 64k, 模型最大预算（根据max值决定展示几个，去重）
 * 使用1024=1K的标准
 */
function getPresetValues(config: ReasoningControl & { kind: 'budget' }): number[] {
  const { min, max = min * 8 } = config;
  const presets: number[] = [];

  // 生成档位：1k, 2k, 4k, 8k, 16k, 32k, 64k（使用1024=1K标准）
  const presetValues = [1024, 2048, 4096, 8192, 16384, 32768, 65536];

  // 添加不超过max的预设值
  for (const preset of presetValues) {
    if (preset <= max) {
      presets.push(preset);
    }
  }

  // 如果max不在预设值中，且max大于最后一个预设值，检查是否需要添加max
  // 如果max和某个预设值太接近（差值小于预设值的5%），则不添加max
  if (max > 0 && !presets.includes(max)) {
    if (presets.length === 0 || max > presets[presets.length - 1]) {
      // 检查max是否与任何预设值太接近
      const isTooClose = presets.some(preset => {
        const diff = Math.abs(max - preset);
        const threshold = preset * 0.05; // 5%的阈值
        return diff < threshold;
      });

      // 只有当max不接近任何预设值时才添加
      if (!isTooClose) {
        presets.push(max);
      }
    }
  }

  return presets;
}

/**
 * 将对数值转换为线性位置百分比（用于对数坐标）
 */
function logToPosition(value: number, min: number, max: number): number {
  // 确保value至少为min
  const effectiveValue = Math.max(value, min);

  // 使用最小非零值作为对数计算的起点，避免log(0)
  const effectiveMin = min > 0 ? min : 1;

  // 对数转换
  const logMin = Math.log(effectiveMin);
  const logMax = Math.log(max);
  const logValue = Math.log(effectiveValue);

  return ((logValue - logMin) / (logMax - logMin)) * 100;
}

/**
 * 将线性位置百分比转换为实际值（用于对数坐标）
 */
function positionToLog(position: number, min: number, max: number): number {
  // 位置为0时返回min
  if (position <= 0) return min;
  if (position >= 100) return max;

  // 使用最小非零值作为对数计算的起点
  const effectiveMin = min > 0 ? min : 1;

  // 对数转换
  const logMin = Math.log(effectiveMin);
  const logMax = Math.log(max);
  const logValue = logMin + (position / 100) * (logMax - logMin);

  return Math.round(Math.exp(logValue));
}

/**
 * 吸附到最近的预设值
 * 如果当前值接近某个预设值（在预设值的5%范围内），则吸附到该预设值
 */
function snapToPreset(value: number, presets: number[]): number {
  if (presets.length === 0) return value;

  let nearestPreset = presets[0];
  let minDiff = Math.abs(value - nearestPreset);

  // 找到最近的预设值
  for (const preset of presets) {
    const diff = Math.abs(value - preset);
    if (diff < minDiff) {
      minDiff = diff;
      nearestPreset = preset;
    }
  }

  // 如果差值在预设值的5%范围内，则吸附
  const threshold = nearestPreset * 0.05;
  if (minDiff < threshold) {
    return nearestPreset;
  }

  return value;
}

export function ReasoningEffortPicker({
  modelConfig,
  reasoning,
  onReasoningChange,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ReasoningEffortPickerProps) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = React.useState(false);

  // 获取该模型支持的所有模式
  const supportedModes = modelConfig?.reasoning?.intensity?.supportedModes || [];

  // 获取当前有效的配置
  const config = getReasoningConfig(modelConfig, reasoning.effort_mode);

  // 如果外部控制存在，使用外部控制；否则使用内部状态
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  if (!config) {
    return null;
  }

  const handleEffortChange = (value: string | number) => {
    onReasoningChange({
      ...reasoning,
      effort: value,
    });
  };

  const currentEffort = reasoning.effort ?? config.default;

  // 切换模式处理
  const handleModeChange = (mode: 'adaptive' | 'effort' | 'budget') => {
    if (mode === reasoning.effort_mode) return;

    // 获取新模式的默认值
    const newConfig = getReasoningConfig(modelConfig, mode);
    if (newConfig) {
      onReasoningChange({
        ...reasoning,
        effort_mode: mode,
        effort: newConfig.default,
      });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        side="top"
        align="center"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">{t("reasoningEffort.thinkingIntensity")}</div>
            {supportedModes.length > 1 && (
              <div className="flex gap-1.5">
                {supportedModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode as 'adaptive' | 'effort' | 'budget')}
                    className={cn(
                      "flex-1 flex items-center justify-center px-2 py-1.5 rounded-md border text-xs font-medium transition-all",
                      config.kind === mode
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white dark:bg-card border-gray-200 dark:border-border text-gray-600 dark:text-muted-foreground hover:border-gray-300 dark:hover:border-border/80"
                    )}
                  >
                    {mode === 'adaptive' ? t("reasoningEffort.adaptiveMode") :
                      mode === 'effort' ? t("reasoningEffort.effortMode") : t("reasoningEffort.budgetMode")}
                  </button>
                ))}
              </div>
            )}
          </div>
          {config.kind === 'adaptive' || config.kind === 'effort' ? (
            // 枚举型档位选择 - 使用拖动条 (adaptive 和 effort 模式共用)
            config.options.length > 1 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 flex-1 pt-1">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Slider
                      min={0}
                      max={Math.max(1, config.options.length - 1)}
                      step={1}
                      value={[Math.max(0, Math.min(config.options.length - 1, config.options.findIndex(opt => opt.value === String(currentEffort)) || 0))]}
                      onValueChange={([index]) => {
                        const clampedIndex = Math.max(0, Math.min(config.options.length - 1, Math.round(index)));
                        if (clampedIndex >= 0 && clampedIndex < config.options.length) {
                          handleEffortChange(config.options[clampedIndex].value);
                        }
                      }}
                      className="w-full"
                      marks={config.options.map((_, index) => {
                        const maxIndex = config.options.length - 1;
                        return maxIndex > 0 ? (index / maxIndex) * 100 : 0;
                      })}
                    />
                    <div className="flex justify-between px-0.5">
                      {config.options.map((option, index) => (
                        <span
                          key={option.value}
                          className={cn(
                            "text-[9px] transition-colors capitalize",
                            option.value === String(currentEffort) ? "text-primary font-medium" : "text-muted-foreground/40"
                          )}
                          style={{
                            flex: index === 0 || index === config.options.length - 1 ? '0 0 auto' : '1 1 0',
                            textAlign: index === 0 ? 'left' : index === config.options.length - 1 ? 'right' : 'center'
                          }}
                        >
                          {option.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right capitalize select-none">
                    {t(`reasoningEffort.${String(currentEffort)}` as any) || String(currentEffort)}
                  </span>
                </div>
              </div>
            )
          ) : config.kind === 'budget' ? (
            // 数值型 token 预算
            <div className="space-y-2 pt-2 border-t">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center h-6">
                    {(() => {
                      const presets = getPresetValues(config);
                      const maxValue = config.max || config.min * 8;
                      // 所有budget类型统一使用1024作为最小值（1K）
                      const minValue = 1024;

                      // 使用对数坐标计算预设值的百分比位置
                      const markPositions = presets.map((preset) => {
                        return logToPosition(preset, minValue, maxValue);
                      });

                      // 将当前值转换为对数空间的位置
                      // 如果当前值小于1024，则使用1024
                      const currentEffortValue = Math.max(Number(currentEffort), minValue);
                      const currentPosition = logToPosition(currentEffortValue, minValue, maxValue);

                      return (
                        <div className="relative w-full">
                          <Slider
                            className="w-full"
                            min={0}
                            max={100}
                            step={0.1}
                            value={[currentPosition]}
                            onValueChange={([position]) => {
                              // 将对数空间的位置转换回实际值
                              let actualValue = positionToLog(position, minValue, maxValue);

                              // 确保值不小于1024
                              actualValue = Math.max(actualValue, minValue);

                              // 吸附到最近的预设值
                              actualValue = snapToPreset(actualValue, presets);

                              handleEffortChange(actualValue);
                            }}
                            marks={markPositions}
                          />
                        </div>
                      );
                    })()}
                  </div>
                  <Input
                    type="number"
                    className="w-16 h-6 text-[10px]"
                    min={1024}
                    max={config.max}
                    step={config.step || 512}
                    value={currentEffort}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1024;
                      const clampedValue = Math.max(
                        1024,
                        config.max ? Math.min(value, config.max) : value
                      );
                      handleEffortChange(clampedValue);
                    }}
                  />
                </div>
                {/* 在滑动条下方显示预设值标签 - 宽度需排除右侧输入框 */}
                <div className="relative h-4 mr-[76px]">
                  {(() => {
                    const presets = getPresetValues(config);
                    const maxValue = config.max || config.min * 8;
                    const minValue = 1024;
                    const markPositions = presets.map((preset) => logToPosition(preset, minValue, maxValue));

                    return presets.map((preset, index) => {
                      const position = markPositions[index];
                      return (
                        <span
                          key={`${preset}-${index}`}
                          className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2 whitespace-nowrap"
                          style={{ left: `${position}%` }}
                        >
                          {formatTokenValue(preset)}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
