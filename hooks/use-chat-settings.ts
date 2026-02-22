"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { UserSettings, ModelConfig, ReasoningSettings, ModelParameter } from "@/lib/types";
import { SUPPORTED_WEB_SEARCH_PROVIDERS } from "@/lib/constants";
import { getReasoningConfig, supportsReasoningEffort } from "@/lib/chat/reasoning-utils";
import {
  getModelConfig,
  hasFeature,
  hasBuiltinTool
} from "@/lib/utils/model-config";
import { resolveParameterConflicts } from "@/lib/providers";

/**
 * 管理聊天设置相关的状态和逻辑
 * 包括：用户设置、模型配置、功能开关（webSearch、vectorSearch、reasoning）
 */
export function useChatSettings(projectId?: string) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [vectorSearch, setVectorSearch] = useState(false);
  const [reasoning, setReasoning] = useState<ReasoningSettings>({ enabled: false });
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [projectEmbeddingEnabled, setProjectEmbeddingEnabled] = useState(false);

  // 获取用户设置
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          setUserSettings(data);
        }
      } catch (_err) {
        console.error("Failed to fetch settings:", _err);
      }
    };
    fetchSettings();

    // 监听设置更新事件
    const handleSettingsUpdate = () => {
      fetchSettings();
    };
    window.addEventListener("settings-updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("settings-updated", handleSettingsUpdate);
    };
  }, []);

  // 获取项目 embedding 配置
  useEffect(() => {
    const fetchProjectEmbedding = async () => {
      if (!projectId) {
        setProjectEmbeddingEnabled(false);
        return;
      }
      try {
        const res = await fetch(`/api/projects?id=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProjectEmbeddingEnabled(data.project?.embeddingEnabled === true && !!data.project?.embeddingModelId);
        } else {
          setProjectEmbeddingEnabled(false);
        }
      } catch (_err) {
        console.error("Failed to fetch project embedding status:", _err);
        setProjectEmbeddingEnabled(false);
      }
    };
    fetchProjectEmbedding();
  }, [projectId]);

  // 获取当前选中模型的配置
  const currentModelConfig = useMemo<ModelConfig | null>(() => {
    if (!userSettings?.providers || !selectedProvider || !selectedModel) {
      return null;
    }

    // 优先从静态配置获取
    const staticConfig = getModelConfig(selectedProvider, selectedModel);

    // 从用户设置获取
    const provider = userSettings.providers[selectedProvider];
    const userModel = provider?.models?.find((m: string | ModelConfig) => {
      const modelId = typeof m === 'string' ? m : m.id;
      return modelId === selectedModel;
    });

    // 如果有静态配置，使用静态配置并合并enabled状态
    if (staticConfig) {
      const userEnabled = typeof userModel === 'object' ? userModel.enabled : true;
      const result: ModelConfig = {
        ...staticConfig,
        enabled: userEnabled,
        name: staticConfig.displayName,
        contextLength: staticConfig.contextWindow,
        deepThinking: hasFeature(staticConfig, 'reasoning'),
        webSearch: hasBuiltinTool(staticConfig, 'web_search'),
        toolCall: hasFeature(staticConfig, 'function_call'),
      };

      return result;
    }

    // 降级到用户配置
    if (!userModel || typeof userModel === 'string') {
      return null;
    }

    return userModel as ModelConfig;
  }, [userSettings, selectedProvider, selectedModel]);

  // === 模型能力判断 ===
  const modelCapabilities = useMemo(() => {
    if (!currentModelConfig) {
      return {
        supportsFunctionCall: false,
        supportsReasoning: false,
        hasBuiltinWebSearch: false,
        hasBuiltinCodeInterpreter: false,
        availableBuiltinTools: [] as string[],
        availableParameters: [] as ModelParameter[],
        isReasoningOnly: false,
      };
    }

    const features = Array.isArray(currentModelConfig.features)
      ? currentModelConfig.features
      : [];
    const builtinTools = currentModelConfig.builtinTools || [];
    // 原始参数 (用于判断 isReasoningOnly)
    const originalParameters = currentModelConfig.parameters || [];

    // 过滤后的参数 (用于 UI 显示和交互)
    let parameters = [...originalParameters];

    // 应用参数冲突规则
    if (selectedProvider && selectedModel) {
      parameters = resolveParameterConflicts(
        selectedProvider,
        selectedModel,
        parameters,
        { reasoning }
      );
    }

    return {
      supportsFunctionCall: features.includes('function_call'),
      supportsReasoning: features.includes('reasoning'),
      // web_search (OpenAI/Bailian等) 与 google_search (Gemini) 均视为内置搜索
      hasBuiltinWebSearch: builtinTools.includes('web_search') || builtinTools.includes('google_search'),
      hasBuiltinCodeInterpreter: builtinTools.includes('code_interpreter'),
      availableBuiltinTools: builtinTools,
      availableParameters: parameters,
      // 优化 isReasoningOnly 判断：
      // 1. 必须有 reasoning 特性
      // 2. 如果明确设置了 readonly: false，则不是 reasoning-only
      // 3. 如果没有 temperature 参数，且没有设置 readonly: false，则视为 reasoning-only (o1型模型)
      isReasoningOnly: features.includes('reasoning') &&
        currentModelConfig?.reasoning?.readonly !== false &&
        !originalParameters.some(p => p.id === 'temperature'),
    };
  }, [currentModelConfig, reasoning, selectedProvider, selectedModel]);

  // 向后兼容的别名
  const supportsDeepThinking = modelCapabilities.supportsReasoning;
  const modelSupportsWebSearch = modelCapabilities.hasBuiltinWebSearch;

  // 检查模型是否支持推理强度设置
  const supportsReasoningEffortSetting = useMemo(() => {
    return supportsReasoningEffort(currentModelConfig);
  }, [currentModelConfig]);

  // 检查外部搜索服务商是否已启用并配置好
  const isWebSearchConfigured = useMemo(() => {
    if (!userSettings?.search) {
      return false;
    }

    const searchConfig = userSettings.search;
    // 新格式: SearchConfig
    if ('activeProvider' in searchConfig && 'providers' in searchConfig) {
      if (!searchConfig.enabled) {
        return false;
      }

      const activeProvider = searchConfig.activeProvider;
      if (!(SUPPORTED_WEB_SEARCH_PROVIDERS as readonly string[]).includes(activeProvider)) {
        return false;
      }
      const providerConfig = searchConfig.providers?.[activeProvider];

      if (!providerConfig) {
        return false;
      }

      // 检查必需的配置项（根据不同的搜索提供商，需要的配置项不同）
      // 大多数提供商需要 apiKey，但有些可能使用其他字段（如 apiToken, subscriptionKey 等）
      const hasApiKey = providerConfig.apiKey && providerConfig.apiKey.trim() !== '';
      const hasApiToken = providerConfig.apiToken && providerConfig.apiToken.trim() !== '';
      const hasSubscriptionKey = providerConfig.subscriptionKey && providerConfig.subscriptionKey.trim() !== '';
      const hasInstanceUrl = providerConfig.instanceUrl && providerConfig.instanceUrl.trim() !== '';

      // jina 使用 free-endpoint 模式时不需要 apiKey
      const isJinaFreeMode = activeProvider === 'jina' && providerConfig.mode === 'free-endpoint';

      return hasApiKey || hasApiToken || hasSubscriptionKey || hasInstanceUrl || isJinaFreeMode;
    }

    // 旧格式: { tavily?: TavilyConfig }
    if ('tavily' in searchConfig) {
      const tavilyConfig = (searchConfig as { tavily?: { enabled?: boolean; apiKey?: string } }).tavily;
      return tavilyConfig?.enabled === true && tavilyConfig?.apiKey && tavilyConfig.apiKey.trim() !== '';
    }

    return false;
  }, [userSettings]);

  // 联网搜索按钮是否可用（如果模型有内置搜索就用内置的，否则用外部搜索服务商）
  const isWebSearchEnabled = useMemo(() => {
    return modelSupportsWebSearch || isWebSearchConfigured;
  }, [modelSupportsWebSearch, isWebSearchConfigured]);

  // 获取当前配置的搜索服务提供商名称
  const webSearchProviderName = useMemo(() => {
    if (!userSettings?.search) {
      return undefined;
    }

    const searchConfig = userSettings.search;
    // 新格式: SearchConfig
    if ('activeProvider' in searchConfig && 'providers' in searchConfig) {
      if (!searchConfig.enabled) {
        return undefined;
      }
      return searchConfig.activeProvider;
    }

    // 旧格式: { tavily?: TavilyConfig }
    if ('tavily' in searchConfig) {
      const tavilyConfig = (searchConfig as { tavily?: { enabled?: boolean; apiKey?: string } }).tavily;
      if (tavilyConfig?.enabled === true && tavilyConfig?.apiKey) {
        return 'tavily';
      }
    }

    return undefined;
  }, [userSettings]);

  // 模型切换处理函数
  const handleModelSelect = useCallback((provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  }, []);

  // 当模型或设置变化时，检查并关闭不支持的功能
  useEffect(() => {
    if (!supportsDeepThinking && reasoning.enabled) {
      setReasoning({ enabled: false });
    }
  }, [supportsDeepThinking, reasoning.enabled]);

  // 当启用深度思考时，如果模型支持推理强度且未设置，自动填充默认值
  useEffect(() => {
    if (reasoning.enabled && supportsReasoningEffortSetting && !reasoning.effort) {
      const config = getReasoningConfig(currentModelConfig, reasoning.effort_mode);
      if (config) {
        setReasoning(prev => ({
          ...prev,
          effort: prev.effort ?? config.default,
          effort_mode: prev.effort_mode ?? (config.kind as any),
        }));
      }
    }
  }, [reasoning.enabled, supportsReasoningEffortSetting, reasoning.effort, selectedModel, reasoning.effort_mode]);

  // 当模型切换时，如果新模型不支持推理强度，清空 effort
  useEffect(() => {
    if (!supportsReasoningEffortSetting && reasoning.effort !== undefined) {
      setReasoning(prev => ({
        ...prev,
        effort: undefined,
      }));
    }
  }, [supportsReasoningEffortSetting, reasoning.effort]);

  // 当模型切换时，如果当前 effort 不在新模型支持的选项中（如从 GPT 的 "none" 切到 Gemini 3 Pro），重置为模型默认值
  useEffect(() => {
    if (!reasoning.enabled || !supportsReasoningEffortSetting || reasoning.effort === undefined) return;
    const config = getReasoningConfig(currentModelConfig, reasoning.effort_mode);
    if (!config || config.kind !== 'effort') return;
    const supportedValues = new Set(
      config.options.map((o) => (typeof o === 'object' && o !== null && 'value' in o ? (o as { value: string }).value : String(o)))
    );
    const effortStr = String(reasoning.effort);
    if (!supportedValues.has(effortStr)) {
      setReasoning((prev) => ({ ...prev, effort: config.default }));
    }
  }, [selectedModel, currentModelConfig?.id, reasoning.enabled, reasoning.effort, reasoning.effort_mode, supportsReasoningEffortSetting]);

  useEffect(() => {
    if (!isWebSearchEnabled && webSearch) {
      setWebSearch(false);
    }
  }, [isWebSearchEnabled, webSearch]);

  useEffect(() => {
    if (!projectEmbeddingEnabled && vectorSearch) {
      setVectorSearch(false);
    }
  }, [projectEmbeddingEnabled, vectorSearch]);

  // 当模型切换时，处理默认开启 (defaultEnabled) 逻辑
  useEffect(() => {
    if (currentModelConfig?.reasoning?.defaultEnabled) {
      setReasoning(prev => ({ ...prev, enabled: true }));
    }
  }, [currentModelConfig?.id, currentModelConfig?.reasoning?.defaultEnabled]);

  // 处理 readonly 逻辑：如果强制开启，则始终保持 enabled 为 true
  useEffect(() => {
    if (currentModelConfig?.reasoning?.readonly && currentModelConfig?.reasoning?.defaultEnabled) {
      if (!reasoning.enabled) {
        setReasoning(prev => ({ ...prev, enabled: true }));
      }
    }
  }, [currentModelConfig?.reasoning?.readonly, currentModelConfig?.reasoning?.defaultEnabled, reasoning.enabled]);

  // === 按钮状态计算 ===
  const buttonStates = useMemo(() => {
    // 检测是否为 kimi-k2.5 模型（思考与搜索互斥）
    const isKimiK25 = selectedModel === 'kimi-k2.5';

    // 当 kimi-k2.5 启用思考时，禁用搜索；启用搜索时，禁用思考
    const reasoningEnabled = reasoning.enabled;
    const webSearchEnabled = webSearch;

    // kimi-k2.5 互斥逻辑：当一个开启时，另一个必须禁用
    const disableWebSearchBecauseOfReasoning = isKimiK25 && reasoningEnabled;
    const disableReasoningBecauseOfWebSearch = isKimiK25 && webSearchEnabled;

    return {
      // 联网搜索按钮
      webSearch: {
        visible: isWebSearchEnabled,
        disabled: !isWebSearchEnabled || disableWebSearchBecauseOfReasoning,
        disabledReason: disableWebSearchBecauseOfReasoning
          ? "buttons.reasoningWebSearchConflict"
          : undefined,
        // 显示源选择器的条件：
        // 1. 模型有内置搜索且配置了外部搜索（至少两种搜索方式）
        // 2. 或者模型有内置搜索且有额外的搜索参数（如 engine、search_strategy、search_engine）
        showSourcePicker: modelCapabilities.hasBuiltinWebSearch && (
          isWebSearchConfigured ||
          modelCapabilities.availableParameters.some(p => p.id === 'engine' || p.id === 'search_strategy' || p.id === 'search_engine')
        )
      },

      // 插件按钮
      plugins: {
        visible: modelCapabilities.supportsFunctionCall,
        disabled: false
      },

      // 深度思考按钮
      reasoning: {
        visible: modelCapabilities.supportsReasoning,
        disabled: modelCapabilities.isReasoningOnly || disableReasoningBecauseOfWebSearch,
        disabledReason: disableReasoningBecauseOfWebSearch
          ? "buttons.reasoningWebSearchConflict"
          : undefined,
        // 如果 readonly 为 false，则强制解锁；否则由 isReasoningOnly 或 readonly 决定其锁定状态
        locked: currentModelConfig?.reasoning?.readonly === false
          ? false
          : (modelCapabilities.isReasoningOnly || (currentModelConfig?.reasoning?.readonly ?? false)),
        showEffortPicker: supportsReasoningEffortSetting
      },

      // 高级设置按钮
      advancedSettings: {
        visible: modelCapabilities.availableParameters.some(
          p => ['temperature', 'top_p', 'top_k', 'presence_penalty', 'frequency_penalty', 'verbosity', 'context_1m', 'compaction', 'compaction_trigger'].includes(p.id)
        )
      },

      // 向量搜索按钮
      vectorSearch: {
        visible: projectEmbeddingEnabled,
        disabled: !projectEmbeddingEnabled
      }
    };
  }, [modelCapabilities, isWebSearchConfigured, projectEmbeddingEnabled, selectedModel, reasoning.enabled, webSearch]);

  // 当模型切换为reasoning-only时，自动开启推理
  useEffect(() => {
    if (modelCapabilities.isReasoningOnly && !reasoning.enabled) {
      setReasoning({ enabled: true });
    }
  }, [modelCapabilities.isReasoningOnly, reasoning.enabled]);

  // kimi-k2.5 互斥逻辑：当开启思考时自动关闭搜索，开启搜索时自动关闭思考
  useEffect(() => {
    if (selectedModel === 'kimi-k2.5') {
      if (reasoning.enabled && webSearch) {
        // 如果同时开启，优先保持思考，关闭搜索
        setWebSearch(false);
      }
    }
  }, [selectedModel, reasoning.enabled, webSearch]);

  return {
    selectedProvider,
    selectedModel,
    webSearch,
    vectorSearch,
    reasoning,
    userSettings,
    projectEmbeddingEnabled,
    currentModelConfig,

    // 能力信息
    modelCapabilities,
    supportsDeepThinking,
    supportsReasoningEffortSetting,
    isWebSearchEnabled,
    isWebSearchConfigured,
    webSearchProviderName,

    // 按钮状态
    buttonStates,

    // 操作函数
    handleModelSelect,
    setWebSearch,
    setVectorSearch,
    setReasoning,
  };
}

