/**
 * Gemini generateContent API 适配器
 * 负责执行 API 调用并处理流式 SSE 响应
 */

import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { logger } from '@/lib/logger';
import { GeminiTranslator } from './translator';

// 默认Gemini API地址
const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';

/**
 * 获取安全的Gemini baseURL
 * 严格验证用户提供的URL，只允许Google API域名
 */
function getSafeGeminiBaseURL(userBaseURL: string | undefined): string {
  if (!userBaseURL) {
    return DEFAULT_GEMINI_BASE_URL;
  }

  try {
    const parsed = new URL(userBaseURL);

    // 只允许HTTPS协议
    if (parsed.protocol !== 'https:') {
      logger.warn('Invalid protocol for Gemini, using default', { protocol: parsed.protocol });
      return DEFAULT_GEMINI_BASE_URL;
    }

    // 严格检查允许的域名
    const allowedDomains = ['generativelanguage.googleapis.com', 'googleapis.com'];
    const isAllowed = allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
    });

    if (!isAllowed) {
      logger.warn('Domain not in allowlist for Gemini, using default', {
        hostname: parsed.hostname,
      });
      return DEFAULT_GEMINI_BASE_URL;
    }

    // 清理尾部斜杠
    let cleaned = userBaseURL;
    while (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }

    return cleaned;
  } catch (error) {
    logger.warn('Invalid baseURL format for Gemini, using default', { error });
    return DEFAULT_GEMINI_BASE_URL;
  }
}

export class GeminiAdapter implements APIAdapter {
  private translator = new GeminiTranslator();

  async *call(
    input: TranslatorInput | BaseCallArgs,
    providerConfig: ProviderConfig
  ): AsyncIterable<UnifiedStreamEvent> {
    const apiKey = providerConfig.apiKey;
    // 使用安全的URL验证
    const baseURL = getSafeGeminiBaseURL(providerConfig.baseURL) + '/v1beta';

    // 构建请求体
    let requestBody: any;
    let modelId: string;
    
    if ('modelConfig' in input) {
      // TranslatorInput 类型
      modelId = input.modelConfig.id;
      requestBody = this.translator.translate(input as TranslatorInput);
    } else {
      // BaseCallArgs 类型 - 构建基本参数
      const baseArgs = input as BaseCallArgs;
      modelId = baseArgs.model;
      requestBody = {
        contents: baseArgs.messages.map(m => {
          // 处理 tool 角色的消息 - 使用 functionResponse 格式
          if (m.role === 'tool') {
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            return {
              role: 'user',
              parts: [{
                functionResponse: {
                  name: m.name || 'unknown_function',
                  response: {
                    result: content,
                  },
                },
              }],
            };
          }
          
          // 处理 assistant 角色的消息 - 检查是否有 tool_calls
          if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
            const parts: any[] = [];
            
            // 添加文本内容（如果有）
            if (m.content) {
              const textContent = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
              if (textContent.trim()) {
                parts.push({ text: textContent });
              }
            }
            
            // 添加 functionCall 部分
            for (let i = 0; i < m.tool_calls.length; i++) {
              const toolCall = m.tool_calls[i];
              if (toolCall.function) {
                const functionCallPart: any = {
                  functionCall: {
                    name: toolCall.function.name,
                    args: JSON.parse(toolCall.function.arguments || '{}'),
                  },
                };
                // Gemini 3 需要 thought_signature 来维护函数调用上下文
                // 第一个 functionCall 必须包含 thought_signature
                // 使用虚拟签名跳过验证（根据 Google 文档）
                if (i === 0) {
                  functionCallPart.thoughtSignature = 'skip_thought_signature_validator';
                }
                parts.push(functionCallPart);
              }
            }
            
            return {
              role: 'model',
              parts,
            };
          }
          
          return {
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content || '' }]
          };
        }),
        ...((baseArgs.extra as any)?.tools && {
          tools: (baseArgs.extra as any).tools.map((t: any) => ({
            functionDeclarations: [{
              name: t.function?.name || t.name,
              description: t.function?.description || t.description,
              parameters: t.function?.parameters || t.parameters
            }]
          }))
        }),
      };
    }
    
    const url = `${baseURL}/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

    logger.info('Gemini API call', { model: modelId, url });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errMsg =
          (errorData?.error as { message?: string })?.message ||
          (typeof errorData?.error === 'string' ? errorData.error : null) ||
          (errorData?.message as string) ||
          `Gemini API error: ${response.statusText}`;
        logger.error('Gemini API error response', { status: response.status, errorData });
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let usage: StreamUsage | undefined;
      let finishReason = 'stop';
      let functionCallIndex = 0;
      const functionCallBuffers = new Map<number, { id: string; name: string; args: string }>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;

          try {
            const data = JSON.parse(payload);
            const candidates = data.candidates || [];

            for (const candidate of candidates) {
              if (candidate.finishReason) {
                finishReason = String(candidate.finishReason).toLowerCase();
              }

              const parts = candidate.content?.parts || [];
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (part.text) {
                  if (part.thought) {
                    yield { type: 'thinking', delta: part.text };
                  } else {
                    yield { type: 'content', delta: part.text, role: 'assistant' as const };
                  }
                }
                if (part.functionCall) {
                  const index = functionCallIndex++;
                  const functionCall = part.functionCall;
                  const callId = `call_${index}`;
                  
                  // 累积参数（Gemini 通常一次性返回完整参数，但为了统一格式，我们模拟增量）
                  const argsString = JSON.stringify(functionCall.args || {});
                  functionCallBuffers.set(index, {
                    id: callId,
                    name: functionCall.name || '',
                    args: argsString,
                  });
                  
                  // 发送工具调用事件，包含 id 和 index
                  yield {
                    type: 'tool_call',
                    id: callId,
                    nameDelta: functionCall.name || '',
                    argsDelta: argsString,
                    index,
                  };
                }
              }
            }

            if (data.usageMetadata) {
              usage = {
                prompt_tokens: data.usageMetadata.promptTokenCount || 0,
                completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
                total_tokens: data.usageMetadata.totalTokenCount || 0,
              };
            }
          } catch (parseError) {
            // 忽略空行、心跳等无法解析的 chunk，仅记录 debug 以减少噪音
            if (payload.length > 2) {
              logger.debug('Gemini stream chunk parse skipped', { payload: payload.slice(0, 80), error: parseError });
            }
          }
        }
      }

      yield { type: 'finish', reason: finishReason, usage };
    } catch (error: any) {
      logger.error('Gemini adapter call error', error);
      yield { type: 'error', message: error.message || 'Unknown error', raw: error };
    }
  }

  async check(config: ProviderConfig): Promise<CheckResult> {
    try {
      const targetModel = config.checkModel || 'gemini-1.5-flash-latest';
      // 使用安全的URL验证
      const base = getSafeGeminiBaseURL(config.baseURL) + '/v1beta';
      const url = `${base}/models/${targetModel}:generateContent?key=${config.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `Google API error: ${res.statusText}`
        );
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Gemini adapter check error', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      // 使用安全的URL验证
      const base = getSafeGeminiBaseURL(config.baseURL) + '/v1beta';
      const models: ModelInfo[] = [];
      let pageToken = '';

      do {
        const url = `${base}/models?key=${config.apiKey}${
          pageToken ? `&pageToken=${pageToken}` : ''
        }&pageSize=1000`;
        const res = await fetch(url);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `Google API error: ${res.statusText}`
          );
        }

        const data = await res.json();
        if (data.models) {
          const fetched = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => ({
              id: m.name?.replace('models/', '') || m.name,
              name: m.displayName || m.name?.replace('models/', ''),
              description: m.description,
            }));
          models.push(...fetched);
        }
        pageToken = data.nextPageToken || '';
      } while (pageToken);

      return models;
    } catch (error: any) {
      logger.error('Gemini adapter listModels error', error);
      throw error;
    }
  }
}
