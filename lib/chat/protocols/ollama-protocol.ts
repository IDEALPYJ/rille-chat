/**
 * Ollama Chat 协议适配器（本地）
 */

import { ProviderConfig } from '@/lib/types';
import { ProtocolAdapter, BaseCallArgs, CheckResult, ModelInfo } from './base-protocol';
import { UnifiedStreamEvent, StreamUsage } from './unified-types';
import { logger } from '@/lib/logger';
import { validateURL } from '@/lib/utils/url-validator';

// Ollama默认地址
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * 安全地获取Ollama基础URL
 * Ollama允许本地地址，但需要验证格式
 */
function getSafeOllamaBaseURL(baseURL: string | undefined): string {
  const url = baseURL || DEFAULT_OLLAMA_URL;

  // 验证URL格式（Ollama允许本地地址）
  const validation = validateURL(url);
  if (!validation.valid && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    logger.warn('Invalid Ollama URL, using default', {
      provided: url,
      error: validation.error,
    });
    return DEFAULT_OLLAMA_URL;
  }

  return url;
}

export class OllamaProtocolAdapter implements ProtocolAdapter {
  async *call(args: BaseCallArgs): AsyncIterable<UnifiedStreamEvent> {
    const { messages, model, settings, providerConfig } = args;
    // 使用安全的URL验证
    const baseURL = getSafeOllamaBaseURL(providerConfig.baseURL);
    const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}/api/chat`;

    try {
      // 转换消息格式为 Ollama 格式
      const convertedMessages = this.convertMessagesToOllamaFormat(messages);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: convertedMessages,
          stream: true,
          options: {
            temperature: settings.temperature,
            top_p: settings.top_p,
            top_k: settings.top_k,
            num_predict: settings.max_tokens,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let usage: StreamUsage | undefined;
      let finishReason: string = 'stop';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.message?.content) {
              yield {
                type: 'content',
                delta: data.message.content,
                role: 'assistant',
              };
            }

            if (data.done) {
              finishReason = data.message?.stop_reason || 'stop';
              if (data.eval_count && data.prompt_eval_count) {
                usage = {
                  prompt_tokens: data.prompt_eval_count,
                  completion_tokens: data.eval_count,
                  total_tokens: data.prompt_eval_count + data.eval_count,
                };
              }
            }
          } catch (parseError) {
            logger.warn('Failed to parse Ollama stream chunk', parseError as Error);
          }
        }
      }

      yield {
        type: 'finish',
        reason: finishReason,
        usage,
      };
    } catch (error: any) {
      logger.error('Ollama protocol call error', error);
      yield {
        type: 'error',
        message: error.message || 'Unknown error',
        raw: error,
      };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      // 使用安全的URL验证
      const baseURL = getSafeOllamaBaseURL(config.baseURL);
      const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}/api/tags`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      // 使用安全的URL验证
      const baseURL = getSafeOllamaBaseURL(config.baseURL);
      const url = `${baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL}/api/tags`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
      }));
    } catch (error: any) {
      logger.error('Ollama protocol listModels error', error);
      return [];
    }
  }

  private convertMessagesToOllamaFormat(messages: any[]): any[] {
    return messages
      .filter(msg => msg.role !== 'system') // Ollama 将 system 消息合并到第一个 user 消息
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));
  }
}
