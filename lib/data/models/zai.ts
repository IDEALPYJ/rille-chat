import { ModelConfig } from '@/lib/types/model';

export const zaiModelConfigs: ModelConfig[] = [
    {
        id: "glm-5",
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
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.7",
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
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 3.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 4.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.40, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.60, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.80, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 8.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 14.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 16.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.7-flashx",
        displayName: "GLM-4.7-FlashX",
        avatar: "glm",
        releasedAt: "2026-01-19",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 202752,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.7-flash",
        displayName: "GLM-4.7-Flash",
        avatar: "glm",
        releasedAt: "2026-01-19",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 202752,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
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
        apiType: "openai:chat-completions",

        contextWindow: 200000,
        maxOutput: 128000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 3.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 4.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.40, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.60, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.80, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 8.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 14.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 16.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.6v",
        displayName: "GLM-4.6V",
        avatar: "glm",
        releasedAt: "2025-12-08",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 24000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 1.00, condition: { input: [0, 32000] } },
                        { rate: 2.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.20, condition: { input: [0, 32000] } },
                        { rate: 0.40, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 3.00, condition: { input: [0, 32000] } },
                        { rate: 6.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.6v-flashx",
        displayName: "GLM-4.6V-FlashX",
        avatar: "glm",
        releasedAt: "2025-12-08",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 24000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.15, condition: { input: [0, 32000] } },
                        { rate: 0.30, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.03, condition: { input: [0, 32000] } },
                        { rate: 0.03, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 1.50, condition: { input: [0, 32000] } },
                        { rate: 3.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.6v-flash",
        displayName: "GLM-4.6V-Flash",
        avatar: "glm",
        releasedAt: "2025-12-08",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 24000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "thinking",
                type: "select",
                options: ["enabled", "disabled"],
                default: "enabled"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
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
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 96000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.80, condition: { input: [0, 32000] } },
                        { rate: 1.20, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.16, condition: { input: [0, 32000] } },
                        { rate: 0.24, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 6.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 8.00, condition: { input: [32000, 'infinity'] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-4.5-flash",
        displayName: "GLM-4.5-Flash",
        avatar: "glm",
        releasedAt: "2025-07-25",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 96000,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.00},
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "search_std"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 30.00, condition: "search_pro"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_sogou"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 50.00, condition: "search_pro_quark"}] }
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
            defaultEnabled: true
        },

        parameters: [
            {
                id: "search_engine",
                type: "select",
                options: ["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"],
                default: "search_std"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1.0, step: 0.01,
                default: 1.0
            },
            {
                id: "top_p",
                type: "number",
                min: 0.01, max: 1, step: 0.01,
                default: 0.95
            }
        ]
    },
    {
        id: "glm-image",
        displayName: "GLM-Image",
        avatar: "glm",
        releasedAt: "2026-01-14",
        modelType: "image",
        apiType: "zai:image-generations",

        pricing: {
            currency: "CNY",
            items: [
                { type: "image", name: "output", unit: "per_image", tiers: [{ rate: 0.10}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["hd"],
                default: "hd"
            },
            {
                id: "resolution_height",
                type: "number",
                min: 1024, max: 2048, step: 32,
                default: 1280
            },
            {
                id: "resolution_width",
                type: "number",
                min: 1024, max: 2048, step: 32,
                default: 1280
            },
            {
                id: "watermark",
                type: "boolean",
                default: true
            }
        ]
    },
    {
        id: "cogview-4",
        displayName: "CogView-4",
        avatar: "glm",
        releasedAt: "2025-03-04",
        modelType: "image",
        apiType: "zai:image-generations",

        pricing: {
            currency: "CNY",
            items: [
                { type: "image", name: "output", unit: "per_image", tiers: [{ rate: 0.60}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["standard", "hd"],
                default: "standard"
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 16,
                default: 1024
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 16,
                default: 1024
            },
            {
                id: "watermark",
                type: "boolean",
                default: true
            }
        ]
    },
    {
        id: "cogview-3-flash",
        displayName: "CogView-3-Flash",
        avatar: "glm",
        releasedAt: "2025-01-16",
        modelType: "image",
        apiType: "zai:image-generations",

        pricing: {
            currency: "CNY",
            items: [
                { type: "image", name: "output", unit: "per_image", tiers: [{ rate: 0.00}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["image"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["standard", "hd"],
                default: "standard"
            },
            {
                id: "resolution_height",
                type: "number",
                min: 512, max: 2048, step: 16,
                default: 1024
            },
            {
                id: "resolution_width",
                type: "number",
                min: 512, max: 2048, step: 16,
                default: 1024
            },
            {
                id: "watermark",
                type: "boolean",
                default: true
            }
        ]
    }
]