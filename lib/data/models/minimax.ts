import { ModelConfig } from '@/lib/types/model';

export const minimaxModelConfigs: ModelConfig[] = [
    {
        id: "MiniMax-M2.5",
        displayName: "MiniMax M2.5",
        avatar: "minimax",
        releasedAt: "2026-02-12",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.10}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 2.625}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.40}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0.01, max: 1, step: 0.1,
                default: 1.0
            }
        ]
    },
    {
        id: "MiniMax-M2.5-lightning",
        displayName: "MiniMax M2.5 Lightning",
        avatar: "minimax",
        releasedAt: "2026-02-12",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.10}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 2.625}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 16.80}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0.01, max: 1, step: 0.1,
                default: 1.0
            }
        ]
    },
    {
        id: "MiniMax-M2.1",
        displayName: "MiniMax M2.1",
        avatar: "minimax",
        releasedAt: "2025-12-23",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.10}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 2.625}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.40}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0.01, max: 1, step: 0.1,
                default: 1.0
            }
        ]
    },
    {
        id: "MiniMax-M2.1-lightning",
        displayName: "MiniMax M2.1 Lightning",
        avatar: "minimax",
        releasedAt: "2025-12-23",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.10}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 2.625}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 16.80}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0.01, max: 1, step: 0.1,
                default: 1.0
            }
        ]
    },
    {
        id: "MiniMax-M2",
        displayName: "MiniMax M2",
        avatar: "minimax",
        releasedAt: "2025-10-27",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.10}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 2.625}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.40}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0.01, max: 1, step: 0.1,
                default: 1.0
            }
        ]
    }
]