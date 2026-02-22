/**
 * 工具构建器
 * 负责根据用户配置构建启用的工具列表和额外参数
 */

import { ModelConfig, UserSettings } from '@/lib/types';
import { WebSearchSource } from '@/hooks/use-web-search-source';
import { ModelConfig as DataModelConfig } from '@/lib/types/model';

/**
 * 工具构建输入
 */
export interface ToolsBuildInput {
  /** 是否启用联网搜索 */
  webSearch: boolean;
  
  /** 联网搜索源配置 */
  webSearchSource?: WebSearchSource;
  
  /** 是否启用向量搜索 */
  vectorSearch: boolean;
  
  /** 额外启用的工具列表 */
  enabledTools?: string[];
  
  /** 模型配置 */
  modelConfig: DataModelConfig | ModelConfig;
  
  /** 用户设置 */
  settings: UserSettings;
}

/**
 * 构建启用的工具列表
 * @param input 构建输入
 * @returns 工具名称数组
 */
export function buildEnabledToolsList(input: ToolsBuildInput): string[] {
  const tools: string[] = [];
  const builtinTools = (input.modelConfig as DataModelConfig).builtinTools || [];
  
  // 联网搜索
  if (input.webSearch) {
    // 使用内置搜索：显式指定 builtin，或未指定源且模型支持内置搜索时默认使用
    const useBuiltin =
      input.webSearchSource?.type === 'builtin' ||
      (!input.webSearchSource?.type && (builtinTools.includes('web_search') || builtinTools.includes('google_search')));
    if (useBuiltin) {
      if (builtinTools.includes('web_search')) {
        tools.push('web_search');
      }
      // Gemini 使用 google_search 作为内置搜索工具名
      if (builtinTools.includes('google_search')) {
        tools.push('google_search');
      }
    }
    // 如果使用外部搜索，不添加到工具列表(通过 function calling 处理)
  }
  
  // 代码解释器(如果模型支持且用户启用)
  // 这里可以根据需要添加更多内置工具的启用逻辑
  
  // 用户额外启用的工具
  if (input.enabledTools && input.enabledTools.length > 0) {
    for (const tool of input.enabledTools) {
      // 检查模型是否支持该工具
      if (builtinTools.includes(tool) && !tools.includes(tool)) {
        tools.push(tool);
      }
    }
  }
  
  return tools;
}

/**
 * 检查是否配置了外部搜索服务
 * @param settings 用户设置
 * @returns 是否配置了外部搜索
 */
function hasExternalSearchConfigured(settings: UserSettings): boolean {
  if (!settings.search) return false;

  // 新配置格式
  if ('activeProvider' in settings.search && 'providers' in settings.search) {
    const searchConfig = settings.search as { activeProvider: string; enabled: boolean; providers: Record<string, { apiKey?: string; apiToken?: string; subscriptionKey?: string; instanceUrl?: string }> };
    if (!searchConfig.enabled) return false;

    const provider = searchConfig.providers?.[searchConfig.activeProvider];
    if (!provider) return false;

    // 检查是否有 API key（不同服务商使用不同的字段名）
    return !!(provider.apiKey || provider.apiToken || provider.subscriptionKey || provider.instanceUrl);
  }

  // 旧版 Tavily 配置
  const legacySearch = settings.search as { tavily?: { enabled?: boolean; apiKey?: string } };
  if (legacySearch.tavily?.enabled && legacySearch.tavily?.apiKey) {
    return true;
  }

  return false;
}

/**
 * 构建额外参数
 * @param input 构建输入参数
 * @returns 额外参数对象
 */
export function buildExtraParams(input: {
  webSearch?: boolean;
  webSearchSource?: WebSearchSource;
  vectorSearch?: boolean;
  mcpPlugins?: string[];
  customFunctions?: any[];
  advancedSettings?: any;
  settings?: UserSettings;
}): Record<string, any> {
  const extra: Record<string, any> = {};

  // === 外部联网搜索处理 ===
  // 只有当用户开启了联网搜索开关且配置了外部搜索服务时，才向模型提供 web_search 工具
  // 工具执行器会负责实际调用外部搜索服务
  if (input.webSearch && input.webSearchSource?.type === 'external' && input.settings && hasExternalSearchConfigured(input.settings)) {
    extra.tools = extra.tools || [];
    extra.tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for up-to-date information. Use this when you need current events, recent data, or information beyond your knowledge cutoff.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query'
            },
            num_results: {
              type: 'number',
              description: 'Number of results to return (default: 5)',
              default: 5
            }
          },
          required: ['query'],
          additionalProperties: false
        },
        strict: true
      }
    });
  }

  // === 内置工具选项 ===
  if (input.webSearchSource?.type === 'builtin' && input.webSearchSource.options) {
    extra.web_search_options = input.webSearchSource.options;
  }

  // === MCP插件工具 ===
  if (input.mcpPlugins && input.mcpPlugins.length > 0) {
    // MCP插件会在后续处理中转换为function tools
    extra.mcp_plugins = input.mcpPlugins;
  }

  // === 自定义函数 ===
  if (input.customFunctions && input.customFunctions.length > 0) {
    extra.tools = extra.tools || [];
    extra.tools.push(...input.customFunctions);
  }

  // === Perplexity 特有参数 ===
  if (input.advancedSettings) {
    // search_type: 'fast' | 'pro' | 'auto'
    if (input.advancedSettings.search_type !== undefined) {
      extra.search_type = input.advancedSettings.search_type;
    }
    // search_mode: 'web' | 'academic' | 'sec'
    if (input.advancedSettings.search_mode !== undefined) {
      extra.search_mode = input.advancedSettings.search_mode;
    }
    // search_context_size: 'low' | 'medium' | 'high'
    if (input.advancedSettings.search_context_size !== undefined) {
      extra.search_context_size = input.advancedSettings.search_context_size;
    }
  }

  // === Zai 智谱AI 特有参数: search_engine ===
  // 当使用内置搜索时，确保 search_engine 参数始终传递
  // 优先使用用户设置的值，否则使用默认值 'search_std'
  if (input.webSearchSource?.type === 'builtin' || !input.webSearchSource?.type) {
    extra.search_engine = input.advancedSettings?.search_engine ?? 'search_std';
  }

  // === 保留 settings 供工具执行器使用 ===
  if (input.settings) {
    extra.settings = input.settings;
  }

  return extra;
}

/**
 * 判断是否应该使用内置搜索工具
 * @param webSearch 是否启用联网搜索
 * @param webSearchSource 搜索源配置
 * @param modelConfig 模型配置
 * @returns 是否使用内置搜索
 */
export function shouldUseBuiltinWebSearch(
  webSearch: boolean,
  webSearchSource: WebSearchSource | undefined,
  modelConfig: DataModelConfig | ModelConfig
): boolean {
  if (!webSearch) {
    return false;
  }
  
  const builtinTools = (modelConfig as DataModelConfig).builtinTools || [];
  
  return (
    webSearchSource?.type === 'builtin' &&
    (builtinTools.includes('web_search') || builtinTools.includes('google_search'))
  );
}

/**
 * 判断是否应该使用外部搜索工具
 * @param webSearch 是否启用联网搜索
 * @param webSearchSource 搜索源配置
 * @returns 是否使用外部搜索
 */
export function shouldUseExternalWebSearch(
  webSearch: boolean,
  webSearchSource: WebSearchSource | undefined
): boolean {
  if (!webSearch) {
    return false;
  }
  
  return webSearchSource?.type === 'external';
}
