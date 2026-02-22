/**
 * 消息格式转换工具
 * 在统一消息格式和系统消息格式之间转换
 */

import { Message } from '@/lib/types';
import { UnifiedMessage } from './unified-types';
import OpenAI from 'openai';

/**
 * 将系统 Message 格式转换为 UnifiedMessage 格式
 */
export function convertToUnifiedMessages(messages: Message[]): UnifiedMessage[] {
  return messages.map((msg) => {
    const unified: UnifiedMessage = {
      role: msg.role === 'data' ? 'user' : msg.role, // 将 'data' 转换为 'user'
      content: msg.content,
    };

    // 如果有 attachments，转换为 content 数组格式
    if (msg.attachments && msg.attachments.length > 0) {
      const contentParts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: msg.content },
      ];

      for (const attachment of msg.attachments) {
        if (attachment.type.startsWith('image/')) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: attachment.url },
          });
        }
      }

      unified.content = contentParts;
    }

    return unified;
  });
}

/**
 * 将 CommonSettings 从 AdvancedSettings 转换
 */
import { AdvancedSettings } from '@/lib/types';
import { CommonSettings } from './unified-types';

export function convertToCommonSettings(advancedSettings?: AdvancedSettings): CommonSettings {
  if (!advancedSettings) {
    return {};
  }

  const settings: CommonSettings = {
    temperature: advancedSettings.temperature,
    top_p: advancedSettings.topP,
    top_k: advancedSettings.topK,
    presence_penalty: advancedSettings.presencePenalty,
    frequency_penalty: advancedSettings.frequencyPenalty,
    seed: advancedSettings.seed,
    stop: advancedSettings.stopSequences && advancedSettings.stopSequences.length > 0
      ? advancedSettings.stopSequences
      : undefined,
  };

  // 传递 OpenRouter 等服务商特有的参数
  if (advancedSettings.engine) {
    settings.engine = advancedSettings.engine;
  }
  if (advancedSettings.verbosity) {
    settings.verbosity = advancedSettings.verbosity;
  }
  if (advancedSettings.search_strategy !== undefined) {
    settings.search_strategy = advancedSettings.search_strategy;
  }
  if (advancedSettings.max_results !== undefined) {
    settings.max_results = advancedSettings.max_results;
  }

  // 传递 Perplexity 特有参数
  if (advancedSettings.search_type !== undefined) {
    settings.search_type = advancedSettings.search_type;
  }
  if (advancedSettings.search_mode !== undefined) {
    settings.search_mode = advancedSettings.search_mode;
  }
  if (advancedSettings.search_context_size !== undefined) {
    settings.search_context_size = advancedSettings.search_context_size;
  }

  // 传递 Zai 智谱AI 特有参数: search_engine
  // 始终传递 search_engine，优先使用用户设置的值，否则使用默认值 'search_std'
  settings.search_engine = advancedSettings.search_engine ?? 'search_std';

  return settings;
}

/**
 * 将 UnifiedMessage 转换为 OpenAI 格式
 */
export function convertUnifiedMessageToOpenAI(message: UnifiedMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (message.role === 'tool') {
    const toolMsg: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
      role: 'tool',
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      tool_call_id: message.tool_call_id!,
    };
    // 添加 name 字段（如果存在）
    if (message.name) {
      (toolMsg as any).name = message.name;
    }
    return toolMsg;
  }
  
  if (message.role === 'assistant' && message.tool_calls) {
    return {
      role: 'assistant',
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      tool_calls: message.tool_calls,
    };
  }

  // 处理多模态内容
  if (Array.isArray(message.content)) {
    // assistant 和 system 角色不支持 image_url，过滤掉只保留 text
    if (message.role === 'assistant' || message.role === 'system') {
      const textParts = message.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => ({ type: 'text' as const, text: part.text || '' }));
      return {
        role: message.role,
        content: textParts.length > 0 ? textParts : '',
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    }

    const contentParts = message.content.map((part: any) => {
      if (part.type === 'text') {
        return { type: 'text' as const, text: part.text || '' };
      } else if (part.type === 'image_url') {
        return { type: 'image_url' as const, image_url: part.image_url || { url: '' } };
      }
      return { type: 'text' as const, text: JSON.stringify(part) };
    });

    return {
      role: 'user' as const,
      content: contentParts,
    };
  }

  if (message.role === 'assistant') {
    return {
      role: 'assistant' as const,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    };
  }
  if (message.role === 'system') {
    return {
      role: 'system' as const,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    };
  }
  return {
    role: 'user' as const,
    content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
  };
}
