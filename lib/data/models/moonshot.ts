import { ModelConfig } from '@/lib/types/model';

// for kimi-2.5 web_search is not able when reasoning is enabled

export const moonshotModelConfigs: ModelConfig[] = [
    {
        id: "kimi-k2.5",
        displayName: "Kimi K2.5",
        avatar: "kimi",
        releasedAt: "2026-01-27",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.70 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 21.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        }
    },
    {
        id: "kimi-k2-0905-preview",
        displayName: "Kimi K2",
        avatar: "kimi",
        releasedAt: "2025-09-05",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.6
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
        id: "kimi-k2-turbo-preview",
        displayName: "Kimi K2 Turbo",
        avatar: "kimi",
        releasedAt: "2025-09-05",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 58.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.6
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
        id: "kimi-k2-thinking",
        displayName: "Kimi K2 Thinking",
        avatar: "kimi",
        releasedAt: "2025-11-06",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

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
        id: "kimi-k2-thinking-turbo",
        displayName: "Kimi K2 Thinking Turbo",
        avatar: "kimi",
        releasedAt: "2025-11-06",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 58.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

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
    }
]