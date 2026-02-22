/**
 * Zai (智谱AI) 参数翻译器
 * 负责将模型层配置翻译为 Zai OpenAI 兼容 API 参数
 */

import {
    TranslatorInput,
    ParameterTranslator
} from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';
import { logger } from '@/lib/logger';

export class ZaiTranslator implements ParameterTranslator<TranslatorInput, any> {
    /**
     * 翻译为 Zai OpenAI 兼容格式
     */
    translate(input: TranslatorInput): any {
        const { modelConfig, messages, userSettings, reasoning, enabledTools, instructions } = input;

        const params: any = {
            model: modelConfig.id,
            messages: this.translateMessages(messages, instructions),
            stream: true,
        };

        // 基础采样参数 - 只添加模型支持的参数
        const paramIds = new Set((modelConfig?.parameters ?? []).map((p: { id: string }) => p.id));
        if (paramIds.has('temperature') && userSettings.temperature !== undefined) {
            params.temperature = userSettings.temperature;
        }
        if (paramIds.has('top_p') && userSettings.top_p !== undefined) {
            params.top_p = userSettings.top_p;
        }
        if (userSettings.max_tokens !== undefined) {
            params.max_tokens = userSettings.max_tokens;
        }

        // 动态映射模型特定参数
        if (modelConfig.parameters) {
            for (const p of modelConfig.parameters) {
                const value = userSettings[p.id as keyof typeof userSettings];
                logger.debug(`[ZaiTranslator] Processing parameter: ${p.id}, value:`, { value });
                if (value !== undefined) {
                    // 跳过 search_engine，它只在 web_search 工具中设置
                    if (p.id === 'search_engine') {
                        logger.debug('[ZaiTranslator] Skipping search_engine in parameter mapping');
                        continue;
                    }
                    // 如果有 mapping 路径，按路径设置
                    if (p.mapping) {
                        this.setDeepValue(params, p.mapping, value);
                    } else {
                        params[p.id] = value;
                    }
                }
            }
        }

        // 推理 (Thinking) 特性支持 - Zai 使用 extra_body.thinking
        // 注意：对于默认开启思考的模型，必须显式设置 disabled 才能关闭
        if (reasoning?.enabled) {
            params.thinking = {
                type: 'enabled'
            };
        } else {
            params.thinking = {
                type: 'disabled'
            };
        }

        // 联网搜索支持 (内置工具)
        // ZAI API 的 web_search 工具参数 - 使用嵌套 web_search 对象
        // 注意：根据官方文档，enable 和 search_result 必须是字符串 "True" 而不是布尔值 true
        if (enabledTools?.includes('web_search')) {
            // 优先从 extra 获取 search_engine，其次从 userSettings 获取，默认使用 search_std
            const searchEngine = input.extra?.search_engine
                || (userSettings as any).search_engine
                || 'search_std';

            // 调试日志：追踪 search_engine 参数来源
            logger.debug('[ZaiTranslator] web_search search_engine:', {
                fromExtra: input.extra?.search_engine,
                fromUserSettings: (userSettings as unknown as { search_engine?: string }).search_engine,
                finalValue: searchEngine,
                userSettingsKeys: Object.keys(userSettings || {}),
                extraKeys: Object.keys(input.extra || {})
            });

            params.tools = [
                {
                    type: 'web_search',
                    web_search: {
                        enable: "True",
                        search_engine: searchEngine,
                        search_result: "True",
                        search_prompt: "请根据用户的问题进行网络搜索，获取最新信息来回答。搜索关键词：{search_result}"
                    }
                }
            ];

            // 设置 tool_choice 为 auto，让模型自动决定是否使用工具
            params.tool_choice = 'auto';
        }

        // 工具调用 (Function Calling)
        if (input.extra?.tools) {
            // 合并已有的 tools (如 web_search) 和 function tools
            const existingTools = params.tools || [];
            const functionTools = input.extra.tools.filter((t: any) => t.type === 'function');
            params.tools = [...existingTools, ...functionTools];

            if (input.extra.tool_choice) {
                params.tool_choice = input.extra.tool_choice;
            }
            if (input.extra.parallel_tool_calls !== undefined) {
                params.parallel_tool_calls = input.extra.parallel_tool_calls;
            }
        }

        // 结构化输出
        if (input.extra?.json_schema) {
            params.response_format = {
                type: 'json_schema',
                json_schema: input.extra.json_schema
            };
        } else if (input.extra?.json_mode) {
            params.response_format = { type: 'json_object' };
        }

        return params;
    }

    /**
     * 转换消息格式
     */
    private translateMessages(messages: UnifiedMessage[], instructions?: string): any[] {
        const result: any[] = [];

        // 系统指令
        if (instructions) {
            result.push({ role: 'system', content: instructions });
        }

        for (const msg of messages) {
            if (msg.role === 'system' && instructions) continue; // 避免重复

            let content = msg.content;

            // 处理多模态数据 (图像理解)
            if (Array.isArray(msg.content)) {
                content = msg.content.map(part => {
                    if (part.type === 'image_url' && part.image_url) {
                        return {
                            type: 'image_url',
                            image_url: { url: part.image_url.url }
                        };
                    }
                    if (part.type === 'text') {
                        return { type: 'text', text: part.text };
                    }
                    return part;
                });
            }

            const item: any = {
                role: msg.role,
                content: content
            };

            if (msg.reasoning_content) {
                item.reasoning_content = msg.reasoning_content;
            }

            if (msg.tool_calls) {
                item.tool_calls = msg.tool_calls;
            }
            if (msg.tool_call_id) {
                item.tool_call_id = msg.tool_call_id;
            }
            if (msg.name) {
                item.name = msg.name;
            }

            result.push(item);
        }

        return result;
    }

    /**
     * 设置嵌套属性值
     */
    private setDeepValue(obj: any, path: string, value: any): void {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }
}
