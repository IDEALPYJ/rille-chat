import { ModelConfig } from '@/lib/types/model';

export const deepseekModelConfigs: ModelConfig[] = [
    {
        id: "deepseek-chat",
        displayName: "DeepSeek V3.2",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 8192,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 3.00}] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0
            }
        ]
    },
    {
        id: "deepseek-reasoner",
        displayName: "DeepSeek V3.2 Reasoner",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 3.00}] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                visibleWhen: {
                    thinking: "disabled"
                }
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                visibleWhen: {
                    thinking: "disabled"
                }
            }
        ]
    }
]