/**
 * DashScope (Bailian) 参数翻译器
 * 负责将模型层配置翻译为 OpenAI 兼容接口参数
 */

import {
    TranslatorInput,
    ParameterTranslator
} from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';

/**
 * 检查key是否是危险的prototype key
 * 防止原型污染攻击
 */
function isDangerousKey(key: string): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

export class BailianTranslator implements ParameterTranslator<TranslatorInput, any> {
    /**
     * 翻译为 OpenAI 兼容接口格式
     * 结构: { model, messages, ... }
     */
    translate(input: TranslatorInput): any {
        const { modelConfig, messages, userSettings, reasoning, enabledTools, instructions } = input;

        // OpenAI 兼容接口格式
        const params: any = {
            model: modelConfig.id,
            messages: this.translateMessages(messages, instructions),
            stream: true  // 启用流式输出
        };

        // 基础采样参数
        if (userSettings.temperature !== undefined) params.temperature = userSettings.temperature;
        if (userSettings.top_p !== undefined) params.top_p = userSettings.top_p;
        if (userSettings.max_tokens !== undefined) params.max_tokens = userSettings.max_tokens;
        if (userSettings.seed !== undefined) params.seed = userSettings.seed;

        // 动态映射模型特定参数
        if (modelConfig.parameters) {
            for (const p of modelConfig.parameters) {
                const value = userSettings[p.id as keyof typeof userSettings];
                if (value !== undefined) {
                    if (p.mapping) {
                        this.setDeepValue(params, p.mapping, value);
                    } else {
                        params[p.id] = value;
                    }
                }
            }
        }

        // extra_body 用于传递 DashScope 特有参数
        const extraBody: any = {};

        // 推理 (Reasoning) 特性支持
        if (reasoning?.enabled) {
            extraBody.enable_thinking = true;
            if (typeof reasoning.effort === 'number') {
                extraBody.thinking_budget = reasoning.effort;
            }
        }

        // 联网搜索支持 (内置功能)
        if (enabledTools?.includes('web_search')) {
            extraBody.enable_search = true;
            // 搜索选项 - 处理 search_strategy 的 instruction_map 映射
            let searchStrategy = (userSettings as any).search_strategy;
            if (searchStrategy !== undefined) {
                // 查找 search_strategy 参数定义，应用 instruction_map 映射
                const searchStrategyParam = modelConfig.parameters?.find(p => p.id === 'search_strategy');
                if (searchStrategyParam?.instruction_map) {
                    const mappedValue = searchStrategyParam.instruction_map[String(searchStrategy)];
                    if (mappedValue) {
                        searchStrategy = mappedValue;
                    }
                }
                extraBody.search_options = {
                    search_strategy: searchStrategy
                };
            }
        }

        // 代码解释器支持 - OpenAI 兼容接口不支持，需要提示用户
        if (enabledTools?.includes('code_interpreter')) {
            // 代码解释器功能在 OpenAI 兼容接口中不可用，请使用原生 API
        }

        // 如果有 extra_body 参数，添加到请求中
        if (Object.keys(extraBody).length > 0) {
            params.extra_body = extraBody;
        }

        // 工具调用 (Function Calling)
        if (input.extra?.tools) {
            params.tools = input.extra.tools;
            if (input.extra.tool_choice) {
                params.tool_choice = input.extra.tool_choice;
            }
            if (input.extra.parallel_tool_calls !== undefined) {
                params.parallel_tool_calls = input.extra.parallel_tool_calls;
            }
        }

        return params;
    }

    /**
     * 转换消息格式为 OpenAI 格式
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

            // 处理多模态数据 - OpenAI 格式
            if (Array.isArray(msg.content)) {
                content = msg.content.map(part => {
                    if (part.type === 'image_url' && part.image_url) {
                        return { type: 'image_url', image_url: { url: part.image_url.url } };
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

        // 检查路径中是否包含危险的key，防止原型污染
        for (const key of keys) {
            if (isDangerousKey(key)) {
                throw new Error(`Invalid path: dangerous key "${key}" is not allowed`);
            }
        }

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
