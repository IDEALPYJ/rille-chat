import { ModelConfig } from '@/lib/types/model';

export const bailianModelConfigs: ModelConfig[] = [
    {
        id: "qwen3-max",
        displayName: "Qwen3 Max",
        avatar: "qwen",
        releasedAt: "2025-09-24",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 3.20, condition: { input: [0, 32000] } },
                    { rate: 6.40, condition: { input: [32000, 128000] } },
                    {
                        rate: 9.60, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.64, condition: { input: [0, 32000] } },
                    { rate: 1.28, condition: { input: [32000, 128000] } },
                    {
                        rate: 1.92, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 12.80, condition: { input: [0, 32000] } },
                    { rate: 25.60, condition: { input: [32000, 128000] } },
                    {
                        rate: 38.40, condition: { input: [128000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "agent" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 2, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max",
                    "2": "agent"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.7,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.8
            }
        ]
    },
    {
        id: "qwen3-max-preview",
        displayName: "Qwen3 Max Preview",
        avatar: "qwen",
        releasedAt: "2025-09-05",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 6.00, condition: { input: [0, 32000] } },
                    { rate: 10.00, condition: { input: [32000, 128000] } },
                    {
                        rate: 15.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 1.20, condition: { input: [0, 32000] } },
                    { rate: 2.00, condition: { input: [32000, 128000] } },
                    {
                        rate: 3.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 24.00, condition: { input: [0, 32000] } },
                    { rate: 40.00, condition: { input: [32000, 128000] } },
                    {
                        rate: 60.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen-plus",
        displayName: "Qwen Plus",
        avatar: "qwen",
        releasedAt: "2025-09-24",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 1000000,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 128000] } },
                    { rate: 2.40, condition: { input: [128000, 256000] } },
                    {
                        rate: 4.80, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.16, condition: { input: [0, 128000] } },
                    { rate: 0.48, condition: { input: [128000, 256000] } },
                    {
                        rate: 0.96, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 2.00, condition: { input: [0, 128000] } },
                    { rate: 20.00, condition: { input: [128000, 256000] } },
                    {
                        rate: 48.00, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "thinking", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 128000] } },
                    { rate: 2.40, condition: { input: [128000, 256000] } },
                    {
                        rate: 4.80, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "thinking", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.16, condition: { input: [0, 128000] } },
                    { rate: 0.48, condition: { input: [128000, 256000] } },
                    {
                        rate: 0.96, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "thinking", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 8.00, condition: { input: [0, 128000] } },
                    { rate: 24.00, condition: { input: [128000, 256000] } },
                    {
                        rate: 64.00, condition: { input: [256000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen-plus-latest",
        displayName: "Qwen Plus Latest",
        avatar: "qwen",
        releasedAt: "2025-09-24",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 1000000,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 128000] } },
                    { rate: 2.40, condition: { input: [128000, 256000] } },
                    {
                        rate: 4.80, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 2.00, condition: { input: [0, 128000] } },
                    { rate: 20.00, condition: { input: [128000, 256000] } },
                    {
                        rate: 48.00, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "thinking", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 128000] } },
                    { rate: 2.40, condition: { input: [128000, 256000] } },
                    {
                        rate: 4.80, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "thinking", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 8.00, condition: { input: [0, 128000] } },
                    { rate: 24.00, condition: { input: [128000, 256000] } },
                    {
                        rate: 64.00, condition: { input: [256000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen-flash",
        displayName: "Qwen Flash",
        avatar: "qwen",
        releasedAt: "2025-07-28",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 1000000,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.15, condition: { input: [0, 128000] } },
                    { rate: 0.60, condition: { input: [128000, 256000] } },
                    {
                        rate: 1.20, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.03, condition: { input: [0, 128000] } },
                    { rate: 0.12, condition: { input: [128000, 256000] } },
                    {
                        rate: 0.24, condition: { input: [256000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 1.50, condition: { input: [0, 128000] } },
                    { rate: 6.00, condition: { input: [128000, 256000] } },
                    {
                        rate: 12.00, condition: { input: [256000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen3-vl-plus",
        displayName: "Qwen3 VL Plus",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 1.00, condition: { input: [0, 32000] } },
                    { rate: 1.50, condition: { input: [32000, 128000] } },
                    {
                        rate: 3.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.20, condition: { input: [0, 32000] } },
                    { rate: 0.30, condition: { input: [32000, 128000] } },
                    {
                        rate: 0.60, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 10.00, condition: { input: [0, 32000] } },
                    { rate: 15.00, condition: { input: [32000, 128000] } },
                    {
                        rate: 30.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.8,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen3-vl-flash",
        displayName: "Qwen3 VL Flash",
        avatar: "qwen",
        releasedAt: "2025-10-15",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.15, condition: { input: [0, 32000] } },
                    { rate: 0.30, condition: { input: [32000, 128000] } },
                    {
                        rate: 0.60, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.03, condition: { input: [0, 32000] } },
                    { rate: 0.06, condition: { input: [32000, 128000] } },
                    {
                        rate: 0.12, condition: { input: [128000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 1.50, condition: { input: [0, 32000] } },
                    { rate: 3.00, condition: { input: [32000, 128000] } },
                    {
                        rate: 6.00, condition: { input: [128000, "infinity"] }
                    }]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.8,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen-long",
        displayName: "Qwen Long",
        avatar: "qwen",
        releasedAt: "2025-01-25",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 1000000,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 2.00 }] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.8
            }
        ]
    },
    {
        id: "qwq-plus",
        displayName: "QwQ Plus",
        avatar: "qwen",
        releasedAt: "2025-03-05",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 8192,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.60 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 32768,
                    step: 1,
                    default: 32768
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.6,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qvq-max",
        displayName: "QVQ Max",
        avatar: "qwen",
        releasedAt: "2025-03-25",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 8192,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 32.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 16384,
                    step: 1,
                    default: 16384
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.5,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.5
            }
        ]
    },
    {
        id: "qvq-plus",
        displayName: "QVQ Plus",
        avatar: "qwen",
        releasedAt: "2025-05-15",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 8192,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 5.00 }] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 16384,
                    step: 1,
                    default: 16384
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.5,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.5
            }
        ]
    },
    {
        id: "qwen3-next-80b-a3b-instruct",
        displayName: "Qwen3 Next 80B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-11",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.7,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.8
            }
        ]
    },
    {
        id: "qwen3-next-80b-a3b-thinking",
        displayName: "Qwen3 Next 80B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-11",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.6,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen3-235b-a22b-instruct",
        displayName: "Qwen3 235B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.7,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.8
            }
        ]
    },
    {
        id: "qwen3-235b-a22b-thinking",
        displayName: "Qwen3 235B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 20.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.6,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "qwen3-vl-235b-a22b-instruct",
        displayName: "Qwen3 VL 235B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.7,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.8
            }
        ]
    },
    {
        id: "qwen3-vl-235b-a22b-thinking",
        displayName: "Qwen3 VL 235B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-23",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 20.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 81920,
                    step: 1,
                    default: 81920
                }
            }
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.9, step: 0.1,
                default: 0.6,
            },
            {
                id: "top_p",
                type: "number",
                min: 0.05, max: 1, step: 0.05,
                default: 0.95
            }
        ]
    },
    {
        id: "deepseek-v3.2",
        displayName: "DeepSeek V3.2",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 65536,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.40 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: false
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
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
                default: 0.95
            }
        ]
    },
    {
        id: "deepseek-v3.2-exp",
        displayName: "DeepSeek V3.2 Exp",
        avatar: "deepseek",
        releasedAt: "2025-09-29",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 65536,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: false
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
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
                default: 0.95
            }
        ]
    },
    {
        id: "deepseek-v3.1",
        displayName: "DeepSeek V3.1",
        avatar: "deepseek",
        releasedAt: "2025-08-21",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 65536,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: false
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
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
                default: 0.95
            }
        ]
    },
    {
        id: "deepseek-r1-0528",
        displayName: "DeepSeek R1",
        avatar: "deepseek",
        releasedAt: "2025-05-28",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        reasoning: {
            readonly: true,
            defaultEnabled: true
        }
    },
    {
        id: "deepseek-v3",
        displayName: "DeepSeek V3",
        avatar: "deepseek",
        releasedAt: "2025-03-25",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.7
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.6
            }
        ]
    },
    {
        id: "kimi-k2.5",
        displayName: "Kimi K2.5",
        avatar: "kimi",
        releasedAt: "2026-01-27",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 21.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        }
    },
    {
        id: "Moonshot-Kimi-K2-Instruct",
        displayName: "Kimi K2 Instruct",
        avatar: "kimi",
        releasedAt: "2025-09-05",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 8192,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 3.00, condition: "turbo" }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 4.00, condition: "max" }] },
            ]
        },

        parameters: [
            {
                id: "search_strategy",
                type: "number",
                min: 0, max: 1, step: 1,
                default: 0,
                instruction_map: {
                    "0": "turbo",
                    "1": "max"
                }
            },
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
                default: 0.6
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
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 4.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 16.00 }] },
            ]
        },

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
            }
        ]
    },
    {
        id: "glm-4.7",
        displayName: "GLM-4.7",
        avatar: "glm",
        releasedAt: "2025-12-22",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 202752,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 3.00, condition: { input: [0, 32000] } },
                    {
                        rate: 4.00, condition: { input: [32000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 14.00, condition: { input: [0, 32000] } },
                    {
                        rate: 16.00, condition: { input: [32000, "infinity"] }
                    }]
                }
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 32768,
                    step: 1,
                    default: 32768
                }
            }
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
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.6",
        displayName: "GLM-4.6",
        avatar: "glm",
        releasedAt: "2025-09-30",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 202752,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 3.00, condition: { input: [0, 32000] } },
                    {
                        rate: 4.00, condition: { input: [32000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 14.00, condition: { input: [0, 32000] } },
                    {
                        rate: 16.00, condition: { input: [32000, "infinity"] }
                    }]
                }
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 32768,
                    step: 1,
                    default: 32768
                }
            }
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
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.5",
        displayName: "GLM-4.5",
        avatar: "glm",
        releasedAt: "2025-07-25",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 3.00, condition: { input: [0, 32000] } },
                    {
                        rate: 4.00, condition: { input: [32000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 14.00, condition: { input: [0, 32000] } },
                    {
                        rate: 16.00, condition: { input: [32000, "infinity"] }
                    }]
                }
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 32768,
                    step: 1,
                    default: 32768
                }
            }
        },

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
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.5-air",
        displayName: "GLM-4.5-Air",
        avatar: "glm",
        releasedAt: "2025-07-25",
        modelType: "chat",
        apiType: "aliyun:qwen-chat",

        contextWindow: 131072,
        maxOutput: 16384,

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 32000] } },
                    {
                        rate: 1.20, condition: { input: [32000, "infinity"] }
                    }]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 6.00, condition: { input: [0, 32000] } },
                    {
                        rate: 8.00, condition: { input: [32000, "infinity"] }
                    }]
                }
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: false,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0,
                    max: 32768,
                    step: 1,
                    default: 32768
                }
            }
        },

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
                default: 0.95
            }
        ]
    },
    {
        id: "qwen-image-max",
        displayName: "Qwen Image Max",
        avatar: "qwen",
        releasedAt: "2025-12-30",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.50 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "size",
                type: "select",
                options: ["1664*928", "1472*1104", "1328*1328", "1104*1472", "928*1664"],
                default: "1664*928"
            }
        ]
    },
    {
        id: "qwen-image-plus",
        displayName: "Qwen Image Plus",
        avatar: "qwen",
        releasedAt: "2026-01-09",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.20 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "size",
                type: "select",
                options: ["1664*928", "1472*1104", "1328*1328", "1104*1472", "928*1664"],
                default: "1664*928"
            }
        ]
    },
    {
        id: "qwen-image",
        displayName: "Qwen Image",
        avatar: "qwen",
        releasedAt: "2025-08-04",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.25 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "size",
                type: "select",
                options: ["1664*928", "1472*1104", "1328*1328", "1104*1472", "928*1664"],
                default: "1664*928"
            }
        ]
    },
    {
        id: "qwen-image-edit-max",
        displayName: "Qwen Image Edit Max",
        avatar: "qwen",
        releasedAt: "2026-01-16",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.50 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["image"],
        },

        features: ["image_edit"],

        parameters: [
            {
                id: "n",
                type: "number",
                min: 1, max: 6, step: 1,
                default: 1
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            }
        ]
    },
    {
        id: "qwen-image-edit-plus",
        displayName: "Qwen Image Edit Plus",
        avatar: "qwen",
        releasedAt: "2026-10-30",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.20 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["image"],
        },

        features: ["image_edit"],

        parameters: [
            {
                id: "n",
                type: "number",
                min: 1, max: 6, step: 1,
                default: 1
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            }
        ]
    },
    {
        id: "qwen-image-edit",
        displayName: "Qwen Image Edit",
        avatar: "qwen",
        releasedAt: "2025-08-04",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.80 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["image"],
        },

        features: ["image_edit"],

        parameters: [
            {
                id: "n",
                type: "number",
                min: 1, max: 6, step: 1,
                default: 1
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            }
        ]
    },
    {
        id: "z-image-turbo",
        displayName: "Z-Image Turbo",
        avatar: "qwen",
        releasedAt: "2025-11-27",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.20, condition: "prompt_extend == true" },
                        { rate: 0.10, condition: "prompt_extend == false" },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text", "image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "prompt_extend",
                type: "select",
                options: ["true", "false"],
                default: "false",
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1536
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 1,
                default: 1024
            }
        ]
    },
    {
        id: "wan2.6-image",
        displayName: "Wan2.6 Image",
        avatar: "qwen",
        releasedAt: "2026-01-05",
        modelType: "image",
        apiType: "aliyun:wanx-generation",

        pricing: {
            currency: "CNY",
            items: [
                {
                    type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.20 },
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["image_generation", "image_edit", "interleave"],

        parameters: [
            {
                id: "resolution_height",
                type: "number",
                min: 384, max: 2560, step: 1,
                default: 1280
            },
            {
                id: "resolution_width",
                type: "number",
                min: 384, max: 2560, step: 1,
                default: 1280
            },
            {
                id: "enable_interleave",
                type: "select",
                options: ["true", "false"],
                default: "true",
            },
            {
                id: "n",
                type: "number",
                min: 1, max: 4, step: 1,
                default: 4,
                visibleWhen: {
                    enable_interleave: "false",
                }
            },
            {
                id: "max_images",
                type: "number",
                min: 1, max: 5, step: 1,
                default: 5,
                visibleWhen: {
                    enable_interleave: "true",
                }
            },
            {
                id: "prompt_extend",
                type: "select",
                options: ["true", "false"],
                default: "true",
                visibleWhen: {
                    enable_interleave: "false",
                }
            }
        ]
    }
]