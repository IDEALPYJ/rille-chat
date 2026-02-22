/**
 * DashScope (Bailian) API 适配器
 * 统一使用 OpenAI 兼容接口
 */

import { ProviderConfig } from '@/lib/types';
import { APIAdapter, TranslatorInput } from '../types';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';
import { CheckResult, ModelInfo, BaseCallArgs } from '@/lib/chat/protocols/base-protocol';
import { logger } from '@/lib/logger';
import { BailianTranslator } from './translator';

export class BailianAdapter implements APIAdapter {
    private translator = new BailianTranslator();

    /**
     * 执行 API 调用
     * 统一使用 OpenAI 兼容接口
     * 支持两种参数格式：TranslatorInput 或 BaseCallArgs
     */
    async *call(
        input: TranslatorInput | BaseCallArgs,
        providerConfig: ProviderConfig
    ): AsyncIterable<UnifiedStreamEvent> {
        yield* this.callOpenAICompatible(input, providerConfig);
    }

    /**
     * 使用 OpenAI 兼容接口
     */
    private async *callOpenAICompatible(
        input: TranslatorInput | BaseCallArgs,
        providerConfig: ProviderConfig
    ): AsyncIterable<UnifiedStreamEvent> {
        const { apiKey, baseURL } = providerConfig;
        // 使用 OpenAI 兼容接口的 baseURL
        const finalBaseURL = baseURL?.replace('/api/v1', '/compatible-mode/v1') || "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const url = `${finalBaseURL}/chat/completions`;

        // 构建请求体
        let body: any;
        
        // 判断输入类型并构建请求体
        if ('modelConfig' in input) {
            // TranslatorInput 类型
            body = this.translator.translate(input as TranslatorInput);
        } else {
            // BaseCallArgs 类型 - 只传递必要的参数
            // 模型参数由前端配置处理
            const baseArgs = input as BaseCallArgs;
            body = {
                model: baseArgs.model,
                messages: baseArgs.messages.map(m => {
                    const msg: any = {
                        role: m.role,
                        content: m.content,
                    };
                    // 添加 reasoning_content 字段（如果是 assistant 消息且有推理内容）
                    // Moonshot API 在启用 thinking 模式时，要求 assistant 消息必须包含 reasoning_content 字段
                    if (m.role === 'assistant' && m.reasoning_content !== undefined) {
                        msg.reasoning_content = m.reasoning_content;
                    }
                    // 添加 tool_calls 字段（如果是 assistant 消息且有工具调用）
                    if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
                        msg.tool_calls = m.tool_calls.map(tc => ({
                            id: tc.id,
                            type: tc.type,
                            function: {
                                name: tc.function.name,
                                arguments: tc.function.arguments,
                            },
                        }));
                    }
                    // 添加 tool_call_id 字段（如果是 tool 消息）
                    if (m.role === 'tool' && m.tool_call_id) {
                        msg.tool_call_id = m.tool_call_id;
                    }
                    return msg;
                }),
                stream: true,
                ...((baseArgs.extra as any)?.tools && { tools: (baseArgs.extra as any).tools }),
            };
        }

        logger.info('Bailian OpenAI Compatible API call', {
            model: body.model,
            url,
            hasTools: !!body.tools,
            toolsCount: body.tools?.length || 0,
            messagesCount: body.messages?.length || 0
        });

        // 调试：打印请求体
        logger.debug('Bailian API request body', { body: JSON.stringify(body, null, 2) });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                    if (trimmedLine.startsWith('data:')) {
                        const dataStr = trimmedLine.slice(5).trim();

                        try {
                            const data = JSON.parse(dataStr);

                            // 调试：打印收到的数据
                            logger.debug('Bailian API response chunk', { 
                                hasError: !!data.error,
                                hasUsage: !!data.usage,
                                choicesLength: data.choices?.length || 0,
                                hasDeltaContent: !!data.choices?.[0]?.delta?.content,
                                hasDeltaReasoning: !!data.choices?.[0]?.delta?.reasoning_content,
                                finishReason: data.choices?.[0]?.finish_reason
                            });

                            // 处理错误
                            if (data.error) {
                                logger.error('Bailian API error', { error: data.error });
                                yield {
                                    type: 'error',
                                    message: data.error.message || 'OpenAI Compatible API error',
                                    raw: data
                                };
                                continue;
                            }

                            // 处理 usage（可能在 choices 为空时返回）
                            if (data.usage) {
                                logger.debug('Bailian API usage received', { usage: data.usage });
                                yield {
                                    type: 'finish',
                                    reason: 'stop',
                                    usage: {
                                        prompt_tokens: data.usage.prompt_tokens || 0,
                                        completion_tokens: data.usage.completion_tokens || 0,
                                        total_tokens: data.usage.total_tokens || 0,
                                        completion_tokens_details: data.usage.completion_tokens_details ? {
                                            reasoning_tokens: data.usage.completion_tokens_details.reasoning_tokens
                                        } : undefined
                                    }
                                };
                                continue;
                            }

                            // 处理内容
                            const choice = data.choices?.[0];
                            if (choice) {
                                const delta = choice.delta;

                                // 处理思考过程 (reasoning_content)
                                if (delta?.reasoning_content) {
                                    yield {
                                        type: 'thinking',
                                        delta: delta.reasoning_content
                                    };
                                }

                                // 处理普通内容 (content)
                                if (delta?.content) {
                                    yield {
                                        type: 'content',
                                        delta: delta.content,
                                        role: delta.role || 'assistant'
                                    };
                                }

                                // 处理工具调用 (tool_calls)
                                if (delta?.tool_calls) {
                                    for (const toolCall of delta.tool_calls) {
                                        const toolCallId = toolCall.id || `call_${toolCall.index ?? 0}`;
                                        
                                        yield {
                                            type: 'tool_call',
                                            id: toolCallId,
                                            nameDelta: toolCall.function?.name,
                                            argsDelta: toolCall.function?.arguments,
                                            index: toolCall.index ?? 0
                                        };
                                    }
                                }

                                // 处理完成原因
                                if (choice.finish_reason) {
                                    logger.debug('Bailian API finish reason received', { reason: choice.finish_reason });
                                    yield {
                                        type: 'finish',
                                        reason: choice.finish_reason,
                                        usage: undefined // usage 将在后续 chunk 中单独返回
                                    };
                                }
                            }
                        } catch (e) {
                            logger.error('Failed to parse OpenAI Compatible SSE data', { line: trimmedLine, error: e });
                        }
                    }
                }
            }
        } catch (error: any) {
            logger.error('Bailian OpenAI Compatible API call error', error);
            yield {
                type: 'error',
                message: error.message || 'Unknown Bailian OpenAI Compatible API error',
                raw: error
            };
        }
    }

    /**
     * 健康检查
     */
    async check(config: any): Promise<CheckResult> {
        const { apiKey, baseURL, checkModel } = config;
        
        const finalBaseURL = baseURL?.replace('/api/v1', '/compatible-mode/v1') || "https://dashscope.aliyuncs.com/compatible-mode/v1";
        const url = `${finalBaseURL}/chat/completions`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: checkModel || 'qwen-plus',
                    messages: [{ role: 'user', content: 'hi' }],
                    max_tokens: 1
                })
            });

            if (response.ok || response.status === 400) {
                return { success: true };
            }

            return {
                success: false,
                error: `HTTP error! status: ${response.status}`
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Connection failed'
            };
        }
    }

    /**
     * 列出模型
     */
    async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
        return [];
    }
}
