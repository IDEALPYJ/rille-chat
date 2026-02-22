import { ModelConfig } from '@/lib/types/model';

export const volcengineModelConfigs: ModelConfig[] = [
    {
        id: "doubao-seed-2-0-pro-260215",
        displayName: "Doubao Seed 2.0 Pro",
        avatar: "doubao",
        releasedAt: "2026-02-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 131072,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 3.20, condition: { input: [0, 32000] } },
                        { rate: 4.80, condition: { input: [32000, 128000] } },
                        { rate: 9.60, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.64, condition: { input: [0, 32000] } },
                        { rate: 0.96, condition: { input: [32000, 128000] } },
                        { rate: 1.92, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 16.00, condition: { input: [0, 32000] } },
                        { rate: 24.00, condition: { input: [32000, 128000] } },
                        { rate: 48.00, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-2-0-lite-260215",
        displayName: "Doubao Seed 2.0 Lite",
        avatar: "doubao",
        releasedAt: "2026-02-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.60, condition: { input: [0, 32000] } },
                        { rate: 0.90, condition: { input: [32000, 128000] } },
                        { rate: 1.80, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.12, condition: { input: [0, 32000] } },
                        { rate: 0.18, condition: { input: [32000, 128000] } },
                        { rate: 0.36, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 3.60, condition: { input: [0, 32000] } },
                        { rate: 5.40, condition: { input: [32000, 128000] } },
                        { rate: 10.80, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-2-0-mini-260215",
        displayName: "Doubao Seed 2.0 Mini",
        avatar: "doubao",
        releasedAt: "2026-02-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.20, condition: { input: [0, 32000] } },
                        { rate: 0.40, condition: { input: [32000, 128000] } },
                        { rate: 0.80, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.04, condition: { input: [0, 32000] } },
                        { rate: 0.08, condition: { input: [32000, 128000] } },
                        { rate: 0.16, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000] } },
                        { rate: 4.00, condition: { input: [32000, 128000] } },
                        { rate: 8.00, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-1-8-251228",
        displayName: "Doubao Seed 1.8",
        avatar: "doubao",
        releasedAt: "2025-12-28",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.80, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.80, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 1.20, condition: { input: [32000, 128000] } },
                        { rate: 2.40, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.16, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.16, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.16, condition: { input: [32000, 128000] } },
                        { rate: 0.16, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 8.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 16.00, condition: { input: [32000, 128000] } },
                        { rate: 24.00, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-1-6-251015",
        displayName: "Doubao Seed 1.6",
        avatar: "doubao",
        releasedAt: "2025-10-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.80, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.80, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 1.20, condition: { input: [32000, 128000] } },
                        { rate: 2.40, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.16, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.16, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.16, condition: { input: [32000, 128000] } },
                        { rate: 0.16, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 2.00, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 8.00, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 16.00, condition: { input: [32000, 128000] } },
                        { rate: 24.00, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-1-6-lite-251015",
        displayName: "Doubao Seed 1.6 Lite",
        avatar: "doubao",
        releasedAt: "2025-10-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.30, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.30, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.60, condition: { input: [32000, 128000] } },
                        { rate: 1.20, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.06, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 0.06, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 0.06, condition: { input: [32000, 128000] } },
                        { rate: 0.06, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [
                        { rate: 0.60, condition: { input: [0, 32000], output: [0, 200] } },
                        { rate: 2.40, condition: { input: [0, 32000], output: [200, 'infinity'] } },
                        { rate: 4.00, condition: { input: [32000, 128000] } },
                        { rate: 12.00, condition: { input: [128000, 'infinity'] } },
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-1-6-vision-250815",
        displayName: "Doubao Seed 1.6 Vision",
        avatar: "doubao",
        releasedAt: "2025-08-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.80, condition: { input: [0, 32000] } },
                            { rate: 1.20, condition: { input: [32000, 128000] } },
                            { rate: 2.40, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.16, condition: { input: [0, 32000] } }, 
                            { rate: 0.16, condition: { input: [32000, 128000] } },
                            { rate: 0.16, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 8.00, condition: { input: [0, 32000] } }, 
                            { rate: 16.00, condition: { input: [32000, 128000] } },
                            { rate: 24.00, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-1-6-flash-250828",
        displayName: "Doubao Seed 1.6 Flash",
        avatar: "doubao",
        releasedAt: "2025-08-28",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 32768,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 0.15, condition: { input: [0, 32000] } },
                            { rate: 0.30, condition: { input: [32000, 128000] } },
                            { rate: 0.60, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.03, condition: { input: [0, 32000] } }, 
                            { rate: 0.03, condition: { input: [32000, 128000] } },
                            { rate: 0.03, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 1.50, condition: { input: [0, 32000] } }, 
                            { rate: 3.00, condition: { input: [32000, 128000] } },
                            { rate: 6.00, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "doubao-seed-code-preview-251028",
        displayName: "Doubao Seed Code Preview",
        avatar: "doubao",
        releasedAt: "2025-10-28",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 65536,

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 1.20, condition: { input: [0, 32000] } },
                            { rate: 1.40, condition: { input: [32000, 128000] } },
                            { rate: 2.80, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.24, condition: { input: [0, 32000] } }, 
                            { rate: 0.24, condition: { input: [32000, 128000] } },
                            { rate: 0.24, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 8.00, condition: { input: [0, 32000] } }, 
                            { rate: 12.00, condition: { input: [32000, 128000] } },
                            { rate: 16.00, condition: { input: [128000, "infinity"] } }
                        ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
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
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2.0, step: 0.1,
                default: 1.0,
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.7
            }
        ]
    },
    {
        id: "deepseek-v3-2-251201",
        displayName: "DeepSeek V3.2",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "openai:responses",
    
        contextWindow: 131072,
        maxOutput: 32768,
    
        modalities: {
            input: ["text"],
            output: ["text"],
        },
    
        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 2.00, condition: { input: [0, 32000] } },
                            { rate: 4.00, condition: { input: [32000, "infinity"] } }
                        ]
                },
                { type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.40, condition: { input: [0, 32000] } }, 
                            { rate: 0.40, condition: { input: [32000, "infinity"] } }
                        ]
                },
                { type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 3.00, condition: { input: [0, 32000] } }, 
                            { rate: 6.00, condition: { input: [32000, "infinity"] } }
                        ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
            ]
        },
        
        reasoning: {
            readonly: false,
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
                default: 0.95
            }
        ]
    },
    {
        id: "deepseek-v3-1-terminus",
        displayName: "DeepSeek V3.1",
        avatar: "deepseek",
        releasedAt: "2025-08-21",
        modelType: "chat",
        apiType: "openai:responses",
    
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
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 4.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.80}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 12.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
            ]
        },
        
        reasoning: {
            readonly: false,
            defaultEnabled: true
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
        id: "deepseek-r1-250528",
        displayName: "DeepSeek R1",
        avatar: "deepseek",
        releasedAt: "2025-05-28",
        modelType: "chat",
        apiType: "openai:responses",
    
        contextWindow: 131072,
        maxOutput: 32768,
    
        modalities: {
            input: ["text"],
            output: ["text"],
        },
    
        features: ["reasoning", "function_call"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 4.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.80}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 16.00}] },
            ]
        },

        reasoning: {
            readonly: false,
            defaultEnabled: true
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
        id: "kimi-k2-thinking-251104",
        displayName: "Kimi K2 Thinking",
        avatar: "kimi",
        releasedAt: "2025-11-06",
        modelType: "chat",
        apiType: "openai:responses",
    
        contextWindow: 262144,
        maxOutput: 32768,
    
        modalities: {
            input: ["text"],
            output: ["text"],
        },
    
        features: ["reasoning", "function_call"],
        builtinTools: ["web_search"],

        pricing: {
            currency: "CNY",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 4.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.80}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 16.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00}] },
            ]
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
        id: "doubao-seedream-4-5-251128",
        displayName: "Doubao Seedream 4.5",
        avatar: "doubao",
        releasedAt: "2025-11-28",
        modelType: "image",
        apiType: "volcengine:image-generations",

        pricing: {
            currency: "CNY",
            items: [
                { type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.25},
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "size_set",
                type: "select",
                options: ["resolution", "width*height"],
                default: "resolution",
            },
            {
                id: "resolution",
                type: "select",
                options: ["2K", "4K"],
                default: "2K",
                visibleWhen: {
                    size_set: "resolution",
                }
            },
            {
                id: "resolution_height",
                type: "number",
                min: 480, max: 16384, step: 1,
                default: 2048,
                visibleWhen: {
                    size_set: "width*height",
                }
            },
            {
                id: "resolution_width",
                type: "number",
                min: 480, max: 16384, step: 1,
                default: 2048,
                visibleWhen: {
                    size_set: "width*height",
                }
            },
            {
                id: "sequential_image_generation",
                type: "select",
                options: ["auto", "disabled"],
                default: "disabled",
            },
            {
                id: "max_images",
                type: "number",
                min: 1, max: 15, step: 1,
                default: 15,
                visibleWhen: {
                    sequential_image_generation: "auto",
                }
            }
        ]
    },
    {
        id: "doubao-seedream-4-0-250828",
        displayName: "Doubao Seedream 4.0",
        avatar: "doubao",
        releasedAt: "2025-08-28",
        modelType: "image",
        apiType: "volcengine:image-generations",

        pricing: {
            currency: "CNY",
            items: [
                { type: "image", name: "output", unit: "per_image",
                    tiers: [
                        { rate: 0.20},
                    ]
                },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "size_set",
                type: "select",
                options: ["resolution", "width*height"],
                default: "resolution",
            },
            {
                id: "resolution",
                type: "select",
                options: ["1K", "2K", "4K"],
                default: "2K",
                visibleWhen: {
                    size_set: "resolution",
                }
            },
            {
                id: "resolution_height",
                type: "number",
                min: 240, max: 16384, step: 1,
                default: 2048,
                visibleWhen: {
                    size_set: "width*height",
                }
            },
            {
                id: "resolution_width",
                type: "number",
                min: 240, max: 16384, step: 1,
                default: 2048,
                visibleWhen: {
                    size_set: "width*height",
                }
            },
            {
                id: "sequential_image_generation",
                type: "select",
                options: ["auto", "disabled"],
                default: "disabled",
            },
            {
                id: "max_images",
                type: "number",
                min: 1, max: 15, step: 1,
                default: 15,
                visibleWhen: {
                    sequential_image_generation: "auto",
                }
            },
            {
                id: "optimize_prompt_options",
                type: "select",
                options: ["standard", "fast"],
                default: "standard"
            }
        ]
    }
]