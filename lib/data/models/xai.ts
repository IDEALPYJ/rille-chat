import { ModelConfig } from '@/lib/types/model';

export const xaiModelConfigs: ModelConfig[] = [
    {
        id: "grok-4.20",
        displayName: "Grok 4.20",
        avatar: "grok",
        releasedAt: "2026-03-09",
        knowledgeCutoff: "2024-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 2000000,
        maxOutput: 2000000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 200000] } },
                        { rate: 4.00, condition: { input: [200000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.20, condition: { input: [0, 200000] } },
                        { rate: 0.40, condition: { input: [200000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 6.00, condition: { input: [0, 200000] } },
                        { rate: 12.00, condition: { input: [200000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 25.00}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "x_search", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
            }
        ]
    },
    {
        id: "grok-4-1-fast",
        displayName: "Grok 4.1 Fast",
        avatar: "grok",
        releasedAt: "2025-11-19",
        knowledgeCutoff: "2024-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 2000000,
        maxOutput: 30000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.20, condition: { input: [0, 128000] } },
                        { rate: 0.40, condition: { input: [128000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.05, condition: { input: [0, 128000] } },
                        { rate: 0.05, condition: { input: [128000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.50, condition: { input: [0, 128000] } },
                        { rate: 1.00, condition: { input: [128000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 25.00}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "x_search", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
            }
        ]
    }
]