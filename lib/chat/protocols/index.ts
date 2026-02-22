/**
 * 协议适配器注册表
 * 提供协议适配器的获取和注册功能
 */

import { ProtocolType, getProtocolForProvider } from '../protocol-config';
import { ProtocolAdapter } from './base-protocol';
import { OpenAIProtocolBridge } from '@/lib/providers/openai/protocol-bridge';
import { GeminiProtocolBridge } from '@/lib/providers/gemini/protocol-bridge';
import { AnthropicProtocolBridge } from '@/lib/providers/anthropic/protocol-bridge';
import { PerplexityProtocolBridge } from '@/lib/providers/perplexity/protocol-bridge';
import { OllamaProtocolAdapter } from './ollama-protocol';
import { BailianProtocolBridge } from '@/lib/providers/bailian/protocol-bridge';
import { ZaiProtocolBridge } from '@/lib/providers/zai/protocol-bridge';

// 协议适配器实例缓存
const adapterCache = new Map<ProtocolType, ProtocolAdapter>();

/**
 * 获取协议适配器实例
 */
export function getProtocolAdapter(protocolType: ProtocolType): ProtocolAdapter {
  // 从缓存获取
  if (adapterCache.has(protocolType)) {
    return adapterCache.get(protocolType)!;
  }

  // 创建新实例
  let adapter: ProtocolAdapter;
  switch (protocolType) {
    case 'openai':
      adapter = new OpenAIProtocolBridge();
      break;
    case 'anthropic':
      adapter = new AnthropicProtocolBridge();
      break;
    case 'gemini':
      adapter = new GeminiProtocolBridge();
      break;
    case 'perplexity':
      adapter = new PerplexityProtocolBridge();
      break;
    case 'ollama':
      adapter = new OllamaProtocolAdapter();
      break;
    case 'bailian':
      adapter = new BailianProtocolBridge();
      break;
    case 'zai':
      adapter = new ZaiProtocolBridge();
      break;
    default:
      throw new Error(`Unknown protocol type: ${protocolType}`);
  }

  // 缓存实例
  adapterCache.set(protocolType, adapter);
  return adapter;
}

/**
 * 根据服务商 ID 获取协议适配器
 */
export function getAdapterForProvider(providerId: string): ProtocolAdapter {
  const protocolType = getProtocolForProvider(providerId);
  return getProtocolAdapter(protocolType);
}
