import { ModelConfig } from '@/lib/types/model';

export const mistralModelConfigs: ModelConfig[] = [
    {
        id: "mistral-large-latest",
        displayName: "Mistral Large 3",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 1.50 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.5
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
        id: "mistral-medium-latest",
        displayName: "Mistral Medium 3.1",
        avatar: "mistral",
        releasedAt: "2025-08-12",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.40 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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
        id: "mistral-small-latest",
        displayName: "Mistral Small 3.2",
        avatar: "mistral",
        releasedAt: "2025-06-20",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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
        id: "magistral-medium-latest",
        displayName: "Magistral Medium 1.2",
        avatar: "mistral",
        releasedAt: "2025-09-18",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 5.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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
        id: "magistral-small-latest",
        displayName: "Magistral Small 1.2",
        avatar: "mistral",
        releasedAt: "2025-09-18",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 1.50 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
            }
        ]
    },
    {
        id: "ministral-14b-latest",
        displayName: "Ministral 3 14B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.20 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.20 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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
        id: "ministral-8b-latest",
        displayName: "Ministral 3 8B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.15 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.15 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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
        id: "ministral-3b-latest",
        displayName: "Ministral 3 3B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 0.7, step: 0.1,
                default: 0.7
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