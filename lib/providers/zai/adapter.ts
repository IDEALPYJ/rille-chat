/**
 * Zai (智谱AI) OpenAI API 适配器
 * 负责执行 API 调用并处理流式 SSE 响应
 */

import OpenAI from 'openai';
import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent, StreamUsage } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { logger } from '@/lib/logger';
import { ZaiTranslator } from './translator';
import { sanitizeBaseURL } from '@/lib/utils/url-validator';

// 允许的ZAI域名列表
const ALLOWED_ZAI_HOSTS = [
  'open.bigmodel.cn',
  '*.bigmodel.cn',
];

// 默认ZAI API地址
const DEFAULT_ZAI_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/';

export class ZaiAdapter implements APIAdapter {
    private translator = new ZaiTranslator();

    /**
     * 执行 API 调用
     */
    async *call(
        input: TranslatorInput | BaseCallArgs,
        providerConfig: ProviderConfig
    ): AsyncIterable<UnifiedStreamEvent> {
        // 创建 OpenAI 客户端
        // 使用安全的URL验证
        const safeBaseURL = sanitizeBaseURL(providerConfig.baseURL, DEFAULT_ZAI_BASE_URL, ALLOWED_ZAI_HOSTS);
        const clientOptions: any = {
            apiKey: providerConfig.apiKey,
            baseURL: safeBaseURL,
        };

        const client = new OpenAI(clientOptions);

        // 转换参数为 Chat Completions 格式
        let params: any;
        
        if ('modelConfig' in input) {
            // TranslatorInput 类型
            params = this.translator.translate(input as TranslatorInput);
        } else {
            // BaseCallArgs 类型
            const baseArgs = input as BaseCallArgs;
            params = {
                model: baseArgs.model,
                messages: baseArgs.messages.map(m => {
                    const msg: any = { ...m };
                    // 确保 content 不为 null/undefined
                    if (msg.content === null || msg.content === undefined) {
                        msg.content = '';
                    }
                    // 移除可能导致问题的字段
                    if (msg.reasoning_content !== undefined) {
                        delete msg.reasoning_content;
                    }
                    return msg;
                }),
                stream: true,
                ...((baseArgs.extra as any)?.tools && { tools: (baseArgs.extra as any).tools }),
            };
        }

        logger.info('Zai API call', {
            model: params.model,
            hasTools: !!params.tools,
            toolsContent: params.tools ? JSON.stringify(params.tools) : undefined,
            fullParams: JSON.stringify(params, (key, value) => {
                // 隐藏敏感信息
                if (key === 'apiKey' || key === 'authorization') return '***';
                return value;
            })
        });
        // Note: params.thinking is used in the API call above

        try {
            const stream = await client.chat.completions.create(params) as any;
            logger.debug('Zai API stream started');

            let currentUsage: StreamUsage | undefined;

            let chunkCount = 0;
            for await (const chunk of stream as AsyncIterable<any>) {
                chunkCount++;
                if (chunkCount === 1) {
                    logger.debug('Zai API first chunk received', { chunk: JSON.stringify(chunk) });
                }

                // 处理 usage 信息
                if (chunk.usage) {
                    currentUsage = {
                        prompt_tokens: chunk.usage.prompt_tokens || 0,
                        completion_tokens: chunk.usage.completion_tokens || 0,
                        total_tokens: chunk.usage.total_tokens || 0,
                        prompt_tokens_details: chunk.usage.prompt_tokens_details
                            ? { cached_tokens: chunk.usage.prompt_tokens_details.cached_tokens }
                            : undefined,
                        completion_tokens_details: chunk.usage.completion_tokens_details
                            ? { reasoning_tokens: chunk.usage.completion_tokens_details.reasoning_tokens }
                            : undefined,
                    };
                }

                const choice = chunk.choices?.[0];
                if (!choice) {
                    logger.debug('Zai API chunk without choices', { chunk });
                    continue;
                }

                const delta = choice.delta;
                if (!delta) {
                    logger.debug('Zai API chunk without delta', { choice });
                    continue;
                }

                // 记录包含搜索信息的 chunk
                if (chunk.search_info) {
                    logger.info('Zai API search_info received', { search_info: chunk.search_info });
                }

                // 调试：记录所有 chunk 的 keys，帮助排查问题
                if (chunkCount <= 5) {
                    logger.debug('Zai API chunk debug', {
                        chunkCount,
                        chunkKeys: Object.keys(chunk),
                        hasSearchInfo: !!chunk.search_info,
                        hasChoices: !!chunk.choices,
                        choiceKeys: chunk.choices?.[0] ? Object.keys(chunk.choices[0]) : undefined,
                        deltaKeys: delta ? Object.keys(delta) : undefined
                    });
                }

                // 处理推理内容 (reasoning_content)
                if (delta.reasoning_content) {
                    yield {
                        type: 'thinking',
                        delta: delta.reasoning_content
                    };
                }

                // 处理普通内容
                if (delta.content) {
                    yield {
                        type: 'content',
                        delta: delta.content,
                        role: delta.role || 'assistant'
                    };
                }

                // 处理工具调用
                if (delta.tool_calls) {
                    for (const toolCall of delta.tool_calls) {
                        if (toolCall.function) {
                            yield {
                                type: 'tool_call',
                                id: toolCall.id,
                                nameDelta: toolCall.function.name,
                                argsDelta: toolCall.function.arguments,
                                index: toolCall.index
                            };
                        }
                    }
                }

                // 处理搜索结果信息 (联网搜索)
                if (chunk.search_info?.search_result) {
                    yield {
                        type: 'system',
                        delta: JSON.stringify({
                            search_results: chunk.search_info.search_result
                        })
                    };
                }

                // 处理完成原因
                if (choice.finish_reason && choice.finish_reason !== 'null') {
                    yield {
                        type: 'finish',
                        reason: choice.finish_reason,
                        usage: currentUsage
                    };
                }
            }
        } catch (error: any) {
            const errDetail: Record<string, unknown> = {
                message: error.message,
                status: error.status,
            };
            if (error.error) errDetail.apiError = error.error;
            if (error.code) errDetail.code = error.code;
            logger.error('Zai API call error', error, errDetail);

            yield {
                type: 'error',
                message: error.message || 'Unknown Zai API error',
                raw: error
            };
        }
    }

    /**
     * 健康检查
     */
    async check(config: ProviderConfig): Promise<CheckResult> {
        // 使用安全的URL验证
        const finalBaseURL = sanitizeBaseURL(config.baseURL, DEFAULT_ZAI_BASE_URL, ALLOWED_ZAI_HOSTS);
        const checkModel = config.checkModel || 'glm-4.7';
        const url = `${finalBaseURL}/chat/completions`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: checkModel,
                    messages: [{ role: 'user', content: 'hi' }],
                    max_tokens: 1
                })
            });

            if (response.ok || response.status === 400) {
                // 400 可能表示模型 ID 错误或参数问题，但至少连接通了
                return { success: true };
            }

            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error?.message || `HTTP error! status: ${response.status}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Connection failed'
            };
        }
    }

    /**
     * 列出可用模型
     */
    async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
        try {
            const client = new OpenAI({
                apiKey: config.apiKey,
                baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4/',
            });

            const response = await client.models.list();

            return response.data.map(model => ({
                id: model.id,
                name: model.id,
                created: model.created,
                description: model.id
            }));
        } catch (error: any) {
            logger.error('Failed to list Zai models', error);
            return [];
        }
    }
}
