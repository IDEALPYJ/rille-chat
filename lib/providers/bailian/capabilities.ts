/**
 * DashScope (Bailian) 服务商能力定义
 * 定义原生 API 支持的参数、工具和特性
 */

import { ProviderCapabilities } from '../types';

export const BailianCapabilities: ProviderCapabilities = {
    apiType: 'bailian', // 自定义类型

    parameters: {
        model: {
            type: 'string',
            required: true,
            description: 'The model to use'
        },

        // 采样参数
        temperature: {
            type: 'number',
            range: [0, 2],
            description: 'Sampling temperature'
        },

        top_p: {
            type: 'number',
            range: [0, 1],
            description: 'Nucleus sampling probability'
        },

        top_k: {
            type: 'number',
            description: 'Sample candidate set size'
        },

        repetition_penalty: {
            type: 'number',
            description: 'Penalty for repeating tokens'
        },

        presence_penalty: {
            type: 'number',
            range: [-2, 2],
            description: 'Penalty for content repetition'
        },

        max_tokens: {
            type: 'number',
            description: 'Maximum output tokens'
        },

        seed: {
            type: 'number',
            description: 'Random seed'
        },

        // 阿里云百炼特有参数
        enable_thinking: {
            type: 'boolean',
            description: 'Enable deep thinking mode'
        },

        thinking_budget: {
            type: 'number',
            description: 'Maximum length of the thinking process'
        },

        enable_search: {
            type: 'boolean',
            description: 'Enable web search reference'
        },

        search_strategy: {
            type: 'string',
            enum: ['turbo', 'max', 'agent', 'agent_max'],
            description: 'Strategy for web search'
        },

        incremental_output: {
            type: 'boolean',
            description: 'Enable incremental output in streaming'
        },

        result_format: {
            type: 'string',
            enum: ['text', 'message'],
            description: 'Output format'
        }
    },

    builtinTools: {
        web_search: {
            apiFormat: { type: 'web_search' }, // 虽然原生 API 用 enable_search，但统一接口用 builtinTools
            options: ['search_strategy'],
            description: 'Enable models to search the web'
        },
        code_interpreter: {
            apiFormat: { type: 'code_interpreter' },
            options: [],
            description: 'Allow models to run code'
        }
    },

    features: [
        'reasoning',
        'function_call',
        'structured_outputs',
        'image_input',
        'streaming',
        'tool_calling',
        'parallel_tool_calls'
    ]
};
