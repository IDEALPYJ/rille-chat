import { ModelConfig } from '@/lib/types/model';

// temperature is adjustable only when reasoning is none or disabled
// top_p is adjustable only when reasoning is none or disabled

export const openrouterModelConfigs: ModelConfig[] = [
    {
        id: "openai/gpt-5.2",
        displayName: "GPT-5.2",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.75}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 14.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.175}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["none", "low", "medium", "high", "xhigh"],
                    default: "none"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
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
                default: 1.0
            }
        ],
    },
    {
        id: "openai/gpt-5.2-chat",
        displayName: "GPT-5.2 Chat",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.75}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 14.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.175}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
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
        ],
    },
    {
        id: "openai/gpt-5.2-pro",
        displayName: "GPT-5.2 Pro",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 21.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 168.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["medium", "high", "xhigh"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5.1",
        displayName: "GPT-5.1",
        avatar: "gpt",
        releasedAt: "2025-11-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["none", "low", "medium", "high"],
                    default: "none"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5.1-chat",
        displayName: "GPT-5.1 Chat",
        avatar: "gpt",
        releasedAt: "2025-11-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5.1-codex",
        displayName: "GPT-5.1-Codex",
        avatar: "gpt",
        releasedAt: "2025-11-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5.1-codex-mini",
        displayName: "GPT-5.1-Codex-Mini",
        avatar: "gpt",
        releasedAt: "2025-11-12",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",
        
        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{rate: 0.25}], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{rate: 0.025}], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{rate: 2.00}], unit: "1M_tokens" },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
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
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5.1-codex-max",
        displayName: "GPT-5.1-Codex-Max",
        avatar: "gpt",
        releasedAt: "2025-12-05",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high", "xhigh"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5",
        displayName: "GPT-5",
        avatar: "gpt",
        releasedAt: "2025-08-08",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
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
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5-chat",
        displayName: "GPT-5 Chat",
        avatar: "gpt",
        releasedAt: "2025-08-08",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
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
        id: "openai/gpt-5-pro",
        displayName: "GPT-5 Pro",
        avatar: "gpt",
        releasedAt: "2025-10-07",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 120.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5-mini",
        displayName: "GPT-5 Mini",
        avatar: "gpt",
        releasedAt: "2025-08-08",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.025}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
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
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5-nano",
        displayName: "GPT-5 Nano",
        avatar: "gpt",
        releasedAt: "2025-08-08",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.05}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.005}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
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
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5-codex",
        displayName: "GPT-5 Codex",
        avatar: "gpt",
        releasedAt: "2025-09-24",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/o4-mini",
        displayName: "o4 Mini",
        avatar: "gpt",
        releasedAt: "2025-04-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.10}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 4.40}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.275}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/o3",
        displayName: "o3",
        avatar: "gpt",
        releasedAt: "2025-04-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/o3-pro",
        displayName: "o3 Pro",
        avatar: "gpt",
        releasedAt: "2025-06-11",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 20.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 80.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/o3-mini",
        displayName: "o3 Mini",
        avatar: "gpt",
        releasedAt: "2025-02-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.10}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 4.40}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.55}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/gpt-4.1",
        displayName: "GPT-4.1",
        avatar: "gpt",
        releasedAt: "2025-04-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/gpt-4.1-mini",
        displayName: "GPT-4.1 Mini",
        avatar: "gpt",
        releasedAt: "2025-04-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.60}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/gpt-4.1-nano",
        displayName: "GPT-4.1 Nano",
        avatar: "gpt",
        releasedAt: "2025-04-15",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.025}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/o1",
        displayName: "o1",
        avatar: "gpt",
        releasedAt: "2024-12-18",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 60.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 7.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/o1-pro",
        displayName: "o1-pro",
        avatar: "gpt",
        releasedAt: "2025-03-20",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 150.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 600.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            }
        ]
    },
    {
        id: "openai/gpt-4o-search-preview",
        displayName: "GPT-4o Search Preview",
        avatar: "gpt",
        releasedAt: "2025-03-13",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 35.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "openai/gpt-4o-mini-search-preview",
        displayName: "GPT-4o-mini Search Preview",
        avatar: "gpt",
        releasedAt: "2025-03-13",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.15}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.60}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 27.50, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "openai/gpt-4o",
        displayName: "GPT-4o",
        avatar: "gpt",
        releasedAt: "2024-05-13",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/gpt-4o-mini",
        displayName: "GPT-4o-mini",
        avatar: "gpt",
        releasedAt: "2024-07-18",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.15}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.60}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.075}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/chatgpt-4o-latest",
        displayName: "ChatGPT-4o",
        avatar: "gpt",
        releasedAt: "2024-08-14",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 5.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "openai/gpt-oss-120b",
        displayName: "GPT-OSS 120B",
        avatar: "gpt",
        releasedAt: "2025-08-05",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.039}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.19}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["image_generation"],
        builtinTools: ["web_search"],

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
            }]
    },
    {
        id: "anthropic/claude-opus-4.6",
        displayName: "Claude Opus 4.6",
        avatar: "claude",
        releasedAt: "2026-02-05",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1000000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 3.00, condition: { input: [0, 200000] } },
                    { rate: 6.00, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.30, condition: { input: [0, 200000] } },
                    { rate: 0.60, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "cacheWrite", unit: "1M_tokens",
                    tiers: [{ rate: 3.75, condition: { input: [0, 200000] } },
                    { rate: 7.50, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 15.00, condition: { input: [0, 200000] } },
                    { rate: 22.50, condition: { input: [200000, "infinity"] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["adaptive", "budget"],
                adaptive: {
                    options: [
                        { value: "adaptive", label: "Adaptive" }
                    ],
                    default: "adaptive",
                    mapping: "reasoning.enabled",
                    baseParams: { enabled: true }
                },
                budget: {
                    min: 1024,
                    max: 32000,
                    step: 1,
                    default: 8000,
                    mapping: "reasoning.max_tokens"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high", "max"],
                default: "high",
                mapping: "verbosity"
            }
        ]
    },
    {
        id: "anthropic/claude-sonnet-4.6",
        displayName: "Claude Sonnet 4.6",
        avatar: "claude",
        releasedAt: "2026-02-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1000000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                {
                    type: "text", name: "input", unit: "1M_tokens",
                    tiers: [{ rate: 5.00, condition: { input: [0, 200000] } },
                    { rate: 10.00, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "cacheRead", unit: "1M_tokens",
                    tiers: [{ rate: 0.50, condition: { input: [0, 200000] } },
                    { rate: 1.00, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "cacheWrite", unit: "1M_tokens",
                    tiers: [{ rate: 6.25, condition: { input: [0, 200000] } },
                    { rate: 12.50, condition: { input: [200000, "infinity"] } }
                    ]
                },
                {
                    type: "text", name: "output", unit: "1M_tokens",
                    tiers: [{ rate: 25.00, condition: { input: [0, 200000] } },
                    { rate: 37.50, condition: { input: [200000, "infinity"] } }
                    ]
                },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["adaptive", "budget"],
                adaptive: {
                    options: [
                        { value: "adaptive", label: "Adaptive" }
                    ],
                    default: "adaptive",
                    mapping: "reasoning.enabled",
                    baseParams: { enabled: true }
                },
                budget: {
                    min: 1024,
                    max: 64000,
                    step: 1,
                    default: 8000,
                    mapping: "reasoning.max_tokens"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high", "max"],
                default: "high",
                mapping: "verbosity"
            }
        ]
    },
    {
        id: "anthropic/claude-opus-4.5",
        displayName: "Claude Opus 4.5",
        avatar: "claude",
        releasedAt: "2025-11-25",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 5.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 25.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 6.25}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort", "budget"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "high"
                },
                budget: {
                    min: 1024,
                    max: 64000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0
            }
        ]
    },
    {
        id: "anthropic/claude-sonnet-4.5",
        displayName: "Claude Sonnet 4.5",
        avatar: "claude",
        releasedAt: "2025-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1000000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 3.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort", "budget"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "high"
                },
                budget: {
                    min: 1024,
                    max: 64000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1
            }
        ]
    },
    {
        id: "anthropic/claude-haiku-4.5",
        displayName: "Claude Haiku 4.5",
        avatar: "claude",
        releasedAt: "2025-10-16",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 5.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 64000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1
            }
        ]
    },
    {
        id: "anthropic/claude-opus-4.1",
        displayName: "Claude Opus 4.1",
        avatar: "claude",
        releasedAt: "2025-08-06",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 32000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 75.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 1.50}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 18.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "anthropic/claude-opus-4",
        displayName: "Claude Opus 4",
        avatar: "claude",
        releasedAt: "2025-05-23",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 32000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 75.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 1.50}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 18.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "anthropic/claude-sonnet-4",
        displayName: "Claude Sonnet 4",
        avatar: "claude",
        releasedAt: "2025-05-23",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1000000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 3.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "anthropic"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 64000,
                    step: 1,
                    default: 1024
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }]
    },
    {
        id: "google/gemini-3-pro-preview",
        displayName: "Gemini 3 Pro Preview",
        avatar: "gemini",
        releasedAt: "2025-11-18",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 12.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 0.375}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 14.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "high"],
                    default: "high"
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
                default: 1.0
            }
        ]
    },
    {
        id: "google/gemini-3-flash-preview",
        displayName: "Gemini 3 Flash Preview",
        avatar: "gemini",
        releasedAt: "2025-12-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1048576,
        maxOutput: 65535,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "audio", name: "input", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.05}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 14.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "high"
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
                default: 1.0
            }]
    },
    {
        id: "google/gemini-2.5-pro",
        displayName: "Gemini 2.5 Pro",
        avatar: "gemini",
        releasedAt: "2025-06-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.125}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 0.375}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 35.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 32768,
                    step: 1,
                    default: 1024
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
                default: 1.0
            }]
    },
    {
        id: "google/gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        avatar: "gemini",
        releasedAt: "2025-06-17",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1048576,
        maxOutput: 65535,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "audio", name: "input", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.03}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 0.08}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 35.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 24576,
                    step: 1,
                    default: 1024
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
                default: 1.0
            }]
    },
    {
        id: "google/gemini-2.5-flash-lite",
        displayName: "Gemini 2.5 Flash Lite",
        avatar: "gemini",
        releasedAt: "2025-07-23",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1048576,
        maxOutput: 65535,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.01}] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{rate: 0.08}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 35.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 1024,
                    max: 24576,
                    step: 1,
                    default: 1024
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
                default: 1.0
            }]
    },
    {
        id: "x-ai/grok-4.1-fast",
        displayName: "Grok 4.1 Fast",
        avatar: "grok",
        releasedAt: "2025-11-20",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 2000000,
        maxOutput: 30000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.05}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 25.00, condition: "xai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["none", "minimal", "low", "medium", "high", "xhigh"],
                    default: "high"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 0.95
            }
        ]
    },
    {
        id: "x-ai/grok-4",
        displayName: "Grok 4",
        avatar: "grok",
        releasedAt: "2025-07-10",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 256000,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 25.00, condition: "xai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["none", "minimal", "low", "medium", "high", "xhigh"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "x-ai/grok-4-fast",
        displayName: "Grok 4 Fast",
        avatar: "grok",
        releasedAt: "2025-09-19",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 2000000,
        maxOutput: 30000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.05}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 25.00, condition: "xai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["none", "minimal", "low", "medium", "high", "xhigh"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "perplexity/sonar",
        displayName: "Sonar",
        avatar: "perplexity",
        releasedAt: "2025-01-28",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 127072,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["image_generation"],
        builtinTools: ["web_search"],

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
        id: "perplexity/sonar-pro",
        displayName: "Sonar Pro",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 8000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["image_generation"],
        builtinTools: ["web_search"],

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
        id: "perplexity/sonar-reasoning-pro",
        displayName: "Sonar Reasoning Pro",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning"],
        builtinTools: ["web_search"],

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
        id: "perplexity/sonar-deep-research",
        displayName: "Sonar Deep Research",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.00}] },
                { type: "thinking", name: "output", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning"],
        builtinTools: ["web_search"],

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
        id: "perplexity/sonar-pro-search",
        displayName: "Sonar Pro Search",
        avatar: "perplexity",
        releasedAt: "2025-10-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 8000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 3.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 15.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs"],
        builtinTools: ["web_search"],

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
        id: "mistralai/mistral-large-2512",
        displayName: "Mistral Large 3",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.0645
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
        id: "mistralai/mistral-medium-3.1",
        displayName: "Mistral Medium 3.1",
        avatar: "mistral",
        releasedAt: "2025-08-13",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.3
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
        id: "mistralai/mistral-small-3.2-24b-instruct",
        displayName: "Mistral Small 3.2",
        avatar: "mistral",
        releasedAt: "2025-06-21",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.06}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.18}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.3
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
        id: "mistralai/ministral-14b-2512",
        displayName: "Ministral 3 14B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.3
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
        id: "mistralai/ministral-8b-2512",
        displayName: "Ministral 3 8B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.15}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.15}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.3
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
        id: "mistralai/ministral-3b-2512",
        displayName: "Ministral 3 3B",
        avatar: "mistral",
        releasedAt: "2025-12-02",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.10}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.3
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
        id: "deepseek/deepseek-v3.2",
        displayName: "DeepSeek V3.2",
        avatar: "deepseek",
        releasedAt: "2025-12-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 163840,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.25}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.38}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
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
        id: "qwen/qwen3-max",
        displayName: "Qwen3 Max",
        avatar: "qwen",
        releasedAt: "2025-09-24",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 256000,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 6.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.24}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["function_calling"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1
            }
        ]
    },
    {
        id: "qwen/qwen-plus-2025-07-28",
        displayName: "Qwen Plus",
        avatar: "qwen",
        releasedAt: "2025-09-09",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1000000,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.20}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "qwen/qwen3-235b-a22b-2507",
        displayName: "Qwen3 235B Instruct",
        avatar: "qwen",
        releasedAt: "2025-07-22",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.071}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.463}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "qwen/qwen3-235b-a22b-thinking-2507",
        displayName: "Qwen3 235B Thinking",
        avatar: "qwen",
        releasedAt: "2025-07-22",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.071}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.463}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "qwen/qwen3-next-80b-a3b-instruct",
        displayName: "Qwen3 Next 80B Instruct",
        avatar: "qwen",
        releasedAt: "2025-09-12",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.09}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.10}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "qwen/qwen3-next-80b-a3b-thinking",
        displayName: "Qwen3 Next 80B Thinking",
        avatar: "qwen",
        releasedAt: "2025-09-12",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.15}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.20}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "qwen/qwen-vl-plus",
        displayName: "Qwen VL Plus",
        avatar: "qwen",
        releasedAt: "2025-02-05",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 7500,
        maxOutput: 1500,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.21}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.63}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["image_generation"],
        builtinTools: ["web_search"],

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
        id: "moonshotai/kimi-k2.5",
        displayName: "Kimi K2.5",
        avatar: "kimi",
        releasedAt: "2026-01-27",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.45}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
                default: 1.0
            }
        ]
    },
    {
        id: "moonshotai/kimi-k2-0905",
        displayName: "Kimi K2",
        avatar: "kimi",
        releasedAt: "2025-09-05",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 262144,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.39}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.90}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "moonshotai/kimi-k2-thinking",
        displayName: "Kimi K2 Thinking",
        avatar: "kimi",
        releasedAt: "2025-11-06",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 262144,
        maxOutput: 65535,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.75}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

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
        id: "z-ai/glm-5",
        displayName: "GLM-5",
        avatar: "glm",
        releasedAt: "2026-02-12",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 202752,
        maxOutput: 202752,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 3.20}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
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
            defaultEnabled: true
        },

        parameters: [
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
        id: "z-ai/glm-4.7",
        displayName: "GLM 4.7",
        avatar: "glm",
        releasedAt: "2025-12-22",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 202752,
        maxOutput: 65535,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.40}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
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
        id: "z-ai/glm-4.6",
        displayName: "GLM 4.6",
        avatar: "glm",
        releasedAt: "2025-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 202752,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.35}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
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
                default: 1.0
            }
        ]
    },
    {
        id: "z-ai/glm-4.6v",
        displayName: "GLM 4.6V",
        avatar: "glm",
        releasedAt: "2025-12-08",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.90}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image", "video"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.8
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
        id: "z-ai/glm-4.5-air",
        displayName: "GLM 4.5 Air",
        avatar: "glm",
        releasedAt: "2025-07-26",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.05}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 0.22}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.75
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
        id: "minimax/minimax-m2",
        displayName: "MiniMax M2",
        avatar: "minimax",
        releasedAt: "2025-10-24",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 196608,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.20}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.03}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
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
        id: "minimax/minimax-m2.1",
        displayName: "MiniMax M2.1",
        avatar: "minimax",
        releasedAt: "2025-12-23",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 196608,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.27}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.12}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9
            }
        ]
    },
    {
        id: "minimax/minimax-m2.5",
        displayName: "MiniMax M2.5",
        avatar: "minimax",
        releasedAt: "2026-02-12",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 204800,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 1.20}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9
            }
        ]
    },
    {
        id: "openai/o3-deep-research",
        displayName: "o3 Deep Research",
        avatar: "gpt",
        releasedAt: "2025-10-11",
        modelType: "research",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 40.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.0, condition: "openrouter"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "openai/o4-mini-deep-research",
        displayName: "o4 Mini Deep Research",
        avatar: "gpt",
        releasedAt: "2025-10-11",
        modelType: "research",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 8.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.50}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "medium", "high"],
                    default: "medium"
                }
            }
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "openai/gpt-5-image",
        displayName: "GPT-5 Image",
        avatar: "gpt",
        releasedAt: "2025-10-14",
        modelType: "image",
        apiType: "openai:chat-completions",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 10.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 1.25}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
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
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "openai/gpt-5-image-mini",
        displayName: "GPT-5 Image Mini",
        avatar: "gpt",
        releasedAt: "2025-10-16",
        modelType: "image",
        apiType: "openai:chat-completions",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{rate: 0.25}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "openai"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["reasoning", "structured_outputs", "function_calling"],
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
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
            },
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            }
        ]
    },
    {
        id: "google/gemini-3-pro-image-preview",
        displayName: "Nano Banana Pro",
        avatar: "gemini",
        releasedAt: "2025-11-20",
        modelType: "image",
        apiType: "openai:chat-completions",

        contextWindow: 65536,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 2.00}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 12.00}] },
                { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "image", name: "output", unit: "1M_tokens", tiers: [{ rate: 120.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 35.00, condition: "google"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["reasoning", "structured_outputs"],
        builtinTools: ["web_search"],

        reasoning: {
            readonly: false,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "engine",
                type: "select",
                options: ["native", "exa"],
                default: "native"
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
                default: 1.0
            }
        ]
    },
    {
        id: "google/gemini-2.5-flash-image",
        displayName: "Nano Banana",
        avatar: "gemini",
        releasedAt: "2025-10-08",
        modelType: "image",
        apiType: "openai:chat-completions",

        contextWindow: 32768,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{rate: 0.30}] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{rate: 2.50}] },
                { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
                { type: "image", name: "output", unit: "1M_tokens", tiers: [{ rate: 30.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 4.00, condition: "openrouter"}] }
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

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
];
