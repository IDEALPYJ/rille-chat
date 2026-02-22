/**
 * Zai (智谱AI) 服务商能力定义
 * 定义原生 API 支持的参数、工具和特性
 */

import { ProviderCapabilities } from '../types';

export const ZaiCapabilities: ProviderCapabilities = {
    apiType: 'zai',

    parameters: {
        model: {
            type: 'string',
            required: true,
            description: 'The model to use'
        },

        // 采样参数
        temperature: {
            type: 'number',
            range: [0, 1],
            description: 'Sampling temperature (0-1)'
        },

        top_p: {
            type: 'number',
            range: [0, 1],
            description: 'Nucleus sampling probability'
        },

        max_tokens: {
            type: 'number',
            description: 'Maximum output tokens'
        },

        // Zai 特有参数
        thinking: {
            type: 'object',
            description: 'Thinking mode configuration',
            properties: {
                type: {
                    type: 'string',
                    enum: ['enabled', 'disabled'],
                    description: 'Enable or disable thinking mode'
                }
            }
        },

        // 联网搜索参数
        search_engine: {
            type: 'string',
            enum: ['search_std', 'search_pro', 'search_pro_sogou', 'search_pro_quark'],
            description: 'Search engine for web search'
        }
    },

    builtinTools: {
        web_search: {
            apiFormat: {
                type: 'web_search',
                web_search: {
                    enable: true,
                    search_result: true
                }
            },
            options: ['search_engine'],
            description: 'Enable models to search the web'
        }
    },

    features: [
        'reasoning',
        'function_call',
        'structured_outputs',
        'image_input',
        'image_generation',
        'streaming',
        'tool_calling'
    ]
};
