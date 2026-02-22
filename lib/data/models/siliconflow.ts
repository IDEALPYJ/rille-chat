import { ModelConfig } from '@/lib/types/model';

export const siliconflowModelConfigs: ModelConfig[] = [
    {
        id: "Pro/zai-org/GLM-5",
        displayName: "GLM-5",
        avatar: "glm",
        releasedAt: "2026-02-12",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 202752,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 4.00, condition: { input: [0, 32000] } },
                        { rate: 6.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 1.00, condition: { input: [0, 32000] } },
                        { rate: 1.50, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 18.00, condition: { input: [0, 32000] } },
                        { rate: 22.00, condition: { input: [32000, 'infinity'] } }
                    ]
                }
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
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096,
                    mapping: "thinking_budget"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Pro/zai-org/GLM-4.7",
        displayName: "GLM-4.7",
        avatar: "glm",
        releasedAt: "2025-12-22",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 202752,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 3.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 4.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.40, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.60, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.80, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 8.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 14.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 16.00, condition: { input: [32000, 'infinity'] } }
                    ]
                }
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
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096,
                    mapping: "thinking_budget"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "zai-org/GLM-4.6V",
        displayName: "GLM-4.6V",
        avatar: "glm",
        releasedAt: "2025-12-08",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "zai-org/GLM-4.6",
        displayName: "GLM-4.6",
        avatar: "glm",
        releasedAt: "2025-09-30",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 204800,
        maxOutput: 204800,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 3.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 14.00 }] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "zai-org/GLM-4.5-Air",
        displayName: "GLM-4.5-Air",
        avatar: "glm",
        releasedAt: "2025-07-25",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 6.00 }] }
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
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "deepseek-ai/DeepSeek-V3.2",
        displayName: "DeepSeek V3.2",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 163840,
        maxOutput: 163840,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] }
            ]
        },

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "deepseek-ai/DeepSeek-V3.1-Terminus",
        displayName: "DeepSeek V3.1",
        avatar: "deepseek",
        releasedAt: "2025-09-22",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 163840,
        maxOutput: 163840,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00 }] }
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "deepseek-ai/DeepSeek-R1",
        displayName: "DeepSeek R1",
        avatar: "deepseek",
        releasedAt: "2025-05-28",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 163840,
        maxOutput: 163840,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] }
            ]
        },

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "deepseek-ai/DeepSeek-V3",
        displayName: "DeepSeek V3",
        avatar: "deepseek",
        releasedAt: "2025-03-25",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 163840,
        maxOutput: 163840,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] }
            ]
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Pro/moonshotai/Kimi-K2.5",
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
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 21.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        }
    },
    {
        id: "moonshotai/Kimi-K2-Thinking",
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
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] }
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
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "moonshotai/Kimi-K2-Instruct-0905",
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
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] }
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
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Pro/MiniMaxAI/MiniMax-M2.1",
        displayName: "MiniMax M2.1",
        avatar: "minimax",
        releasedAt: "2025-12-23",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 196608,
        maxOutput: 196608,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.10 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.40 }] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "MiniMaxAI/MiniMax-M2",
        displayName: "MiniMax M2",
        avatar: "minimax",
        releasedAt: "2025-10-27",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.10 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.40 }] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096,
                    mapping: "thinking_budget"
                }
            }
        },

        parameters: [
            {
                id: "thinking_budget",
                type: "number",
                min: 1024, max: 32768, step: 1,
                default: 4096
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Qwen/Qwen3-VL-235B-A22B-Instruct",
        displayName: "Qwen3 VL 235B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Qwen/Qwen3-VL-235B-A22B-Thinking",
        displayName: "Qwen3 VL 235B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Qwen/Qwen3-235B-A22B-Instruct-2507",
        displayName: "Qwen3 235B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    },
    {
        id: "Qwen/Qwen3-235B-A22B-Thinking-2507",
        displayName: "Qwen3 235B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 4096
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.7
            }
        ]
    }
]