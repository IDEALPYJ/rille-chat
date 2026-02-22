/**
 * 联网搜索源选择Hook
 * 管理联网搜索使用模型自带工具还是外部服务商
 */

import { useState, useEffect } from 'react';

/**
 * 联网搜索源配置
 */
export interface WebSearchSource {
  /** 搜索源类型 */
  type: 'builtin' | 'external';
  
  /** 外部服务商ID (当type为external时使用) */
  provider?: string;
  
  /** 搜索选项 */
  options?: {
    /** 用户位置 (用于本地化搜索结果) */
    user_location?: {
      type: 'approximate';
      country?: string;
      city?: string;
      region?: string;
      timezone?: string;
    };
    
    /** 域名过滤 */
    filters?: {
      allowed_domains?: string[];
    };
    
    /** 是否启用外部网络访问 (仅builtin) */
    external_web_access?: boolean;
  };
}

/**
 * 联网搜索源选择Hook
 * @param hasBuiltinWebSearch 模型是否有内置搜索工具
 * @param isExternalConfigured 外部搜索服务是否已配置
 * @returns 搜索源状态和setter
 */
export function useWebSearchSource(
  hasBuiltinWebSearch: boolean,
  isExternalConfigured: boolean
) {
  const [source, setSource] = useState<WebSearchSource>(() => {
    // 默认优先使用内置搜索
    if (hasBuiltinWebSearch) {
      return { type: 'builtin' };
    }
    
    // 如果有外部配置，使用外部搜索
    if (isExternalConfigured) {
      return { type: 'external' };
    }
    
    // 都没有时默认external (但会被禁用)
    return { type: 'external' };
  });

  // 当模型切换导致能力变化时自动调整
  useEffect(() => {
    // 使用 requestAnimationFrame 避免同步 setState
    requestAnimationFrame(() => {
      // 如果当前使用builtin，但模型不支持，切换到external
      if (!hasBuiltinWebSearch && source.type === 'builtin') {
        setSource({ type: 'external' });
      }

      // 如果当前使用external，但没有配置，且模型支持builtin，切换到builtin
      if (!isExternalConfigured && source.type === 'external' && hasBuiltinWebSearch) {
        setSource({ type: 'builtin' });
      }
    });
  }, [hasBuiltinWebSearch, isExternalConfigured, source.type]);

  /**
   * 设置搜索源
   */
  const updateSource = (newSource: WebSearchSource) => {
    setSource(newSource);
  };

  return {
    source,
    setSource: updateSource,
    
    // 便捷的状态检查
    isBuiltin: source.type === 'builtin',
    isExternal: source.type === 'external',
    canSwitchSource: hasBuiltinWebSearch && isExternalConfigured,
  };
}
