"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Sparkles,
  Puzzle,
  Database,
  Zap,
  Check,
  Search,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { AdvancedSettingsPicker } from "./advanced-settings-picker";
import { McpPluginPicker } from "./mcp-plugin-picker";
import { AdvancedSettings, ReasoningSettings, ModelParameter, ModelConfig } from "@/lib/types";
import { WebSearchButton } from "./buttons/web-search-button";
import { ReasoningButton } from "./buttons/reasoning-button";
import { WebSearchSource } from "@/hooks/use-web-search-source";
import { Skill } from "@/lib/types/skill";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// 动态获取图标组件（与 add-skill-dialog.tsx 保持一致）
function getSkillIconComponent(iconName: string | null) {
  if (!iconName) return Icons.Zap;
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
  return IconComponent || Icons.Zap;
}

interface ButtonStates {
  webSearch: {
    visible: boolean;
    disabled: boolean;
    showSourcePicker: boolean;
  };
  plugins: {
    visible: boolean;
    disabled: boolean;
  };
  reasoning: {
    visible: boolean;
    disabled: boolean;
    locked: boolean;
    showEffortPicker: boolean;
  };
  advancedSettings: {
    visible: boolean;
  };
  vectorSearch: {
    visible: boolean;
    disabled: boolean;
  };
}

interface AttachmentMenuProps {
  show: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  webSearch: boolean;
  vectorSearch: boolean;
  reasoning: ReasoningSettings | boolean; // 支持旧格式（boolean）和新格式（ReasoningSettings）
  selectedPrompt: string | null;
  sessionId?: string | null;
  projectId?: string;
  selectedProvider?: string | null;  
  selectedModel?: string | null;
  advancedSettings: AdvancedSettings;
  onWebSearchChange?: (enabled: boolean) => void;
  onVectorSearchChange?: (enabled: boolean) => void;
  onReasoningChange?: (reasoning: ReasoningSettings | boolean) => void;
  onPromptPickerOpen: () => void;
  onAdvancedSettingsChange: (settings: AdvancedSettings) => void;

  // 新增：按钮状态
  buttonStates: ButtonStates;

  // 新增：联网搜索源
  webSearchSource?: WebSearchSource;
  onWebSearchSourceChange?: (source: WebSearchSource) => void;

  // 新增：模型参数列表(用于高级设置)
  modelParameters?: ModelParameter[];

  // 新增：是否配置了外部搜索
  isWebSearchConfigured?: boolean;
  // 新增：外部搜索服务名称
  webSearchProviderName?: string;
  modelConfig: ModelConfig | null;
}

export function AttachmentMenu({
  show,
  fileInputRef,
  webSearch,
  vectorSearch,
  reasoning,
  selectedPrompt,
  sessionId,
  projectId,
  selectedModel,
  advancedSettings,
  onWebSearchChange,
  onVectorSearchChange,
  onReasoningChange,
  onPromptPickerOpen,
  onAdvancedSettingsChange,
  buttonStates,
  webSearchSource,
  onWebSearchSourceChange,
  modelParameters,
  isWebSearchConfigured = false,
  webSearchProviderName,
  modelConfig,
}: AttachmentMenuProps) {
  const { t } = useI18n();

  // 兼容旧格式：将 boolean 转换为 ReasoningSettings
  const reasoningSettings: ReasoningSettings = typeof reasoning === 'boolean'
    ? { enabled: reasoning }
    : reasoning;

  const handleReasoningToggle = (enabled: boolean) => {
    if (onReasoningChange) {
      if (typeof reasoning === 'boolean') {
        onReasoningChange(enabled);
      } else {
        onReasoningChange({
          ...reasoning,
          enabled,
        });
      }
    }
  };

  // 使用 useCallback 包装文件输入点击处理函数，避免 React Compiler 错误
  const handleFileButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const input =
      fileInputRef.current ||
      (document.getElementById(
        "file-upload-input"
      ) as HTMLInputElement);
    if (input) {
      // 使用 setTimeout 避免在事件处理中直接修改值
      setTimeout(() => {
        input.value = "";
        input.click();
      }, 0);
    }
  }, [fileInputRef]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0, y: -40 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -40 }}
          transition={{
            height: { duration: 0.25 },
            opacity: { duration: 0.2 },
            y: { type: "spring", stiffness: 300, damping: 25 },
          }}
          className="overflow-hidden z-30 -mt-2"
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 pb-1.5 pl-[42px] md:pl-0 -ml-[42px] md:ml-0">
            {/* 附件按钮 */}
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border transition-all group whitespace-nowrap cursor-pointer"
              onClick={handleFileButtonClick}
            >
              <Paperclip className="h-3 w-3 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-gray-600 dark:text-foreground/70 group-hover:text-gray-800 dark:group-hover:text-foreground/70">
                {t("buttons.attachment")}
              </span>
            </button>

            {/* 联网搜索按钮 - 使用新组件 */}
            {buttonStates.webSearch.visible && onWebSearchChange && (
              <WebSearchButton
                enabled={webSearch}
                disabled={buttonStates.webSearch.disabled}
                disabledReason={(buttonStates.webSearch as any).disabledReason}
                showSourcePicker={buttonStates.webSearch.showSourcePicker || !!modelParameters?.find(p => p.id === 'search_strategy' || p.id === 'engine' || p.id === 'search_engine')}
                isExternalConfigured={isWebSearchConfigured}
                externalProviderName={webSearchProviderName}
                source={webSearchSource}
                onToggle={onWebSearchChange}
                onSourceChange={onWebSearchSourceChange}
                modelParameters={modelParameters}
                userSettings={advancedSettings}
                onParameterChange={(paramId, value) => {
                  onAdvancedSettingsChange({
                    ...advancedSettings,
                    [paramId]: value
                  });
                }}
              />
            )}

            {/* 向量搜索按钮 */}
            {buttonStates.vectorSearch.visible && projectId && onVectorSearchChange && (
              <button
                type="button"
                onClick={() => onVectorSearchChange(!vectorSearch)}
                disabled={buttonStates.vectorSearch.disabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap ${vectorSearch
                  ? "bg-green-100 dark:bg-green-900/30 border-transparent text-green-700 dark:text-green-300 hover:bg-green-100/80 dark:hover:bg-green-900/40"
                  : "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
                  }`}
              >
                <Database
                  className={`h-3 w-3 shrink-0 ${vectorSearch
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground"
                    }`}
                />
                <span className="text-xs font-medium">{t("buttons.vectorSearch")}</span>
              </button>
            )}

            {/* 深度思考按钮 - 使用新组件 */}
            {buttonStates.reasoning.visible && selectedModel && (
              <ReasoningButton
                enabled={reasoningSettings.enabled}
                disabled={buttonStates.reasoning.disabled}
                disabledReason={(buttonStates.reasoning as any).disabledReason}
                locked={buttonStates.reasoning.locked}
                showEffortPicker={buttonStates.reasoning.showEffortPicker}
                modelConfig={modelConfig}
                reasoning={reasoningSettings}
                onToggle={handleReasoningToggle}
                onReasoningChange={onReasoningChange as any}
              />
            )}

            {/* 技能按钮 */}
            <SkillButton sessionId={sessionId} />

            {/* 提示词按钮 */}
            <button
              type="button"
              onClick={() => onPromptPickerOpen()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap ${selectedPrompt
                ? "bg-[#fef3c7] dark:bg-[rgba(245,158,11,0.15)] border-transparent text-[#92400e] dark:text-[#fcd34d] hover:bg-[#fef3c7]/80 dark:hover:bg-[rgba(245,158,11,0.2)]"
                : "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
                }`}
            >
              <Sparkles
                className={`h-3 w-3 shrink-0 ${selectedPrompt
                  ? "text-[#92400e] dark:text-[#fcd34d]"
                  : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground"
                  }`}
              />
              <span className="text-xs font-medium">{t("buttons.prompt")}</span>
            </button>

            {/* 插件按钮 */}
            {buttonStates.plugins.visible && (
              <PluginButton sessionId={sessionId} />
            )}

            {/* 高级设置按钮 */}
            {buttonStates.advancedSettings.visible && (
              <AdvancedSettingsPicker
                settings={advancedSettings}
                onSettingsChange={onAdvancedSettingsChange}
                modelParameters={modelParameters}
                reasoning={reasoningSettings}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 插件按钮组件
function PluginButton({ sessionId }: { sessionId?: string | null }) {
  const { t } = useI18n();
  const [hasEnabledPlugins, setHasEnabledPlugins] = useState(false);

  // 获取插件启用状态
  const fetchPluginStatus = useCallback(async () => {
    try {
      // 获取全局启用的插件ID列表
      const enabledRes = await fetch("/api/mcp/plugins/enabled");
      if (enabledRes.ok) {
        const enabledData = await enabledRes.json();
        const enabledPluginIds = enabledData.enabledPluginIds || [];
        setHasEnabledPlugins(enabledPluginIds.length > 0);
      }
    } catch {
      // 获取失败时不改变状态
    }
  }, []);

  // 初始获取插件状态
  useEffect(() => {
    fetchPluginStatus();
  }, [fetchPluginStatus]);

  // 处理对话框打开状态变化
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      // 对话框关闭时重新获取状态
      fetchPluginStatus();
    }
  }, [fetchPluginStatus]);

  return (
    <McpPluginPicker sessionId={sessionId || null} onSessionCreated={() => {}} onOpenChange={handleOpenChange}>
      <button
        type="button"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap",
          hasEnabledPlugins
            ? "bg-[#ffedd5] dark:bg-[rgba(249,115,22,0.15)] border-transparent text-[#9a3412] dark:text-[#fdba74] hover:bg-[#ffedd5]/80 dark:hover:bg-[rgba(249,115,22,0.2)]"
            : "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
        )}
      >
        <Puzzle
          className={cn(
            "h-3 w-3 shrink-0",
            hasEnabledPlugins
              ? "text-[#9a3412] dark:text-[#fdba74]"
              : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground"
          )}
        />
        <span className="text-xs font-medium">{t("buttons.plugin")}</span>
      </button>
    </McpPluginPicker>
  );
}

// 技能按钮组件
function SkillButton({ sessionId }: { sessionId?: string | null }) {
  const { t } = useI18n();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/skills")
      .then((res) => res.json())
      .then((data) => setSkills(data.skills || []));
  }, []);

  // 当组件挂载时，获取会话已选择的技能
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}/skills`)
        .then((res) => res.json())
        .then((data) => {
          const enabledSkillIds = data.skills
            .filter((s: any) => s.enabled)
            .map((s: any) => s.skillId);
          setSelectedSkills(enabledSkillIds);
        });
    }
  }, [sessionId]);

  const toggleSkill = (skillId: string) => {
    const isSelected = selectedSkills.includes(skillId);
    const newSelection = isSelected
      ? selectedSkills.filter((id) => id !== skillId)
      : [...selectedSkills, skillId];
    setSelectedSkills(newSelection);

    // 更新会话技能关联
    if (sessionId) {
      fetch(`/api/sessions/${sessionId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId, enabled: !isSelected }),
      });
    }
  };

  if (skills.length === 0) {
    return null;
  }

  const hasSelected = selectedSkills.length > 0;

  const filteredSkills = skills.filter(
    (s) =>
      s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group whitespace-nowrap",
          hasSelected
            ? "bg-[#e0f2fe] dark:bg-[rgba(14,165,233,0.15)] border-transparent text-[#0c4a6e] dark:text-[#7dd3fc] hover:bg-[#e0f2fe]/80 dark:hover:bg-[rgba(14,165,233,0.2)]"
            : "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
        )}
      >
        <Zap
          className={cn(
            "h-3 w-3 shrink-0",
            hasSelected
              ? "text-[#0c4a6e] dark:text-[#7dd3fc]"
              : "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground"
          )}
        />
        <span className="text-xs font-medium">{t("buttons.skill")}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[600px] h-[60vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border/50 shadow-2xl rounded-[var(--radius-lg)]"
          overlayClassName="bg-background/80 backdrop-blur-sm"
        >
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle>{t("skill.selectTitle")}</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-2">
            <div className="relative">
              <Search
                className="absolute h-4 w-4 text-muted-foreground z-10 pointer-events-none left-2 top-1.5"
                strokeWidth={1.5}
              />
              <Input
                placeholder={t("capabilities.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-muted/30 border rounded-[var(--radius-md)] text-sm focus-visible:ring-0 focus-visible:ring-offset-0 h-7 min-h-[28px] pl-8 shadow-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {filteredSkills.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
                <Zap className="h-8 w-8 opacity-20" />
                <p>{t("capabilities.noSkills")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredSkills.map((skill) => (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={cn(
                      "group border rounded-md p-3 hover:border-primary/50 hover:bg-accent/50 transition-all cursor-pointer relative flex items-center gap-2",
                      selectedSkills.includes(skill.id)
                        ? "border-primary/50 bg-primary/5"
                        : "bg-card/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                        selectedSkills.includes(skill.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {selectedSkills.includes(skill.id) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    {(() => {
                      const IconComponent = getSkillIconComponent(skill.icon);
                      return <IconComponent className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
                    })()}
                    <h3 className="font-medium text-sm truncate flex-1">
                      {skill.displayName}
                    </h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

