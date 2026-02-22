import { ModelConfig } from '@/lib/types/model';

// temperature is adjustable only when reasoning is none or disabled
// top_p is adjustable only when reasoning is none or disabled

export const openaiModelConfigs: ModelConfig[] = [
    {
        id: "gpt-5.2",
        displayName: "GPT-5.2",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        knowledgeCutoff: "2025-08-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.75 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.175 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 14.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-5.2-chat-latest",
        displayName: "GPT-5.2 Chat",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        knowledgeCutoff: "2025-08-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.75 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.175 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 14.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-5.2-pro",
        displayName: "GPT-5.2 pro",
        avatar: "gpt",
        releasedAt: "2025-12-11",
        knowledgeCutoff: "2025-08-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 21.00 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 168.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search", "image_generation"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5.1",
        displayName: "GPT-5.1",
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
                { type: "text", name: "input", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.125 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-5.1-chat-latest",
        displayName: "GPT-5.1 Chat",
        avatar: "gpt",
        releasedAt: "2025-11-12",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.125 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5.1-codex",
        displayName: "GPT-5.1 Codex",
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
                { type: "text", name: "input", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.125 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5.1-codex-mini",
        displayName: "GPT-5.1 Codex mini",
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
                { type: "text", name: "input", tiers: [{ rate: 0.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.025 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5.1-codex-max",
        displayName: "GPT-5.1-Codex-max",
        avatar: "gpt",
        releasedAt: "2025-11-19",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.025 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5",
        displayName: "GPT-5",
        avatar: "gpt",
        releasedAt: "2025-08-07",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.125 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5-chat-latest",
        displayName: "GPT-5 Chat",
        avatar: "gpt",
        releasedAt: "2025-08-07",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.125 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-5-pro",
        displayName: "GPT-5 pro",
        avatar: "gpt",
        releasedAt: "2025-08-07",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 272000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 15 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 120.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation"],

        reasoning: {
            readonly: true,
            defaultEnabled: true
        },

        parameters: [
            {
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5-mini",
        displayName: "GPT-5 mini",
        avatar: "gpt",
        releasedAt: "2025-08-07",
        knowledgeCutoff: "2024-05-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.25 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.025 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5-nano",
        displayName: "GPT-5 nano",
        avatar: "gpt",
        releasedAt: "2025-08-07",
        knowledgeCutoff: "2024-05-31",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.05 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.005 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 0.40 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "gpt-5-codex",
        displayName: "GPT-5 Codex",
        avatar: "gpt",
        releasedAt: "2025-09-23",
        knowledgeCutoff: "2024-09-30",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 400000,
        maxOutput: 128000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.05 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.005 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 0.40 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
                id: "verbosity",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "text.verbosity"
            }
        ]
    },
    {
        id: "o4-mini",
        displayName: "o4 mini",
        avatar: "gpt",
        releasedAt: "2025-04-16",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.10 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.275 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 4.40 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "o3",
        displayName: "o3",
        avatar: "gpt",
        releasedAt: "2025-04-16",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "o3-mini",
        displayName: "o3 mini",
        avatar: "gpt",
        releasedAt: "2025-01-31",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 1.10 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.55 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 4.40 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "o3-pro",
        displayName: "o3 pro",
        avatar: "gpt",
        releasedAt: "2025-06-10",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 20.00 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 80.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "o1",
        displayName: "o1",
        avatar: "gpt",
        releasedAt: "2024-12-17",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 15.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 7.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 60.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "o1-pro",
        displayName: "o1 pro",
        avatar: "gpt",
        releasedAt: "2025-03-19",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 150.00 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 600.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

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
        }
    },
    {
        id: "gpt-4o",
        displayName: "GPT 4o",
        avatar: "gpt",
        releasedAt: "2024-05-13",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.5 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "chatgpt-4o-latest",
        displayName: "ChatGPT 4o",
        avatar: "gpt",
        releasedAt: "2024-08-14",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 5 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 15.00 }], unit: "1M_tokens" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["image_generation"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4o-mini",
        displayName: "GPT 4o mini",
        avatar: "gpt",
        releasedAt: "2024-07-18",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.15 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.075 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 0.60 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4o-search-preview",
        displayName: "GPT 4o Search Preview",
        avatar: "gpt",
        releasedAt: "2025-03-11",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
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
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4o-mini-search-preview",
        displayName: "GPT 4o mini Search Preview",
        avatar: "gpt",
        releasedAt: "2024-07-18",
        knowledgeCutoff: "2023-10-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 128000,
        maxOutput: 16384,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.15 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 0.60 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
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
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4.1",
        displayName: "GPT-4.1",
        avatar: "gpt",
        releasedAt: "2025-04-14",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4.1-mini",
        displayName: "GPT-4.1 mini",
        avatar: "gpt",
        releasedAt: "2025-04-14",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.40 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.10 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 1.60 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "gpt-4.1-nano",
        displayName: "GPT-4.1 nano",
        avatar: "gpt",
        releasedAt: "2025-04-14",
        knowledgeCutoff: "2024-06-01",
        modelType: "chat",
        apiType: "openai:responses",

        contextWindow: 1047576,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 0.10 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.025 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 0.40 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["function_call", "structured_outputs"],
        builtinTools: ["web_search", "image_generation", "code_interpreter"],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 1.0,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "o4-mini-deep-research",
        displayName: "o4 mini Deep Research",
        avatar: "gpt",
        releasedAt: "2025-10-10",
        knowledgeCutoff: "2024-06-01",
        modelType: "research",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning"],
        builtinTools: ["web_search", "code_interpreter"],

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
        }
    },
    {
        id: "o3-deep-research",
        displayName: "o3 Deep Research",
        avatar: "gpt",
        releasedAt: "2025-10-10",
        knowledgeCutoff: "2024-06-01",
        modelType: "research",
        apiType: "openai:responses",

        contextWindow: 200000,
        maxOutput: 100000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 2.50 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 40.00 }], unit: "1M_tokens" },
                { type: "tools", name: "web_search", tiers: [{ rate: 10.00 }], unit: "1K_web_search" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning"],
        builtinTools: ["web_search", "code_interpreter"],

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
        }
    },
    {
        id: "gpt-image-1.5",
        displayName: "GPT Image 1.5",
        avatar: "gpt",
        releasedAt: "2025-12-16",
        modelType: "image",
        apiType: "openai:image-generations",

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 5.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "image", name: "input", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
                { type: "image", name: "cacheRead", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "image", name: "output", tiers: [{ rate: 32.00 }], unit: "1M_tokens" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
            {
                id: "size",
                type: "select",
                options: ["1024x1024", "1024x1536", "1536x1024"],
                default: "1024x1024"
            }
        ]
    },
    {
        id: "chatgpt-image-latest",
        displayName: "ChatGPT Image",
        avatar: "gpt",
        releasedAt: "2025-12-16",
        modelType: "image",
        apiType: "openai:image-generations",

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 5.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "text", name: "output", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "image", name: "input", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
                { type: "image", name: "cacheRead", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "image", name: "output", tiers: [{ rate: 32.00 }], unit: "1M_tokens" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
            {
                id: "size",
                type: "select",
                options: ["1024x1024", "1024x1536", "1536x1024"],
                default: "1024x1024"
            }
        ]
    },
    {
        id: "gpt-image-1",
        displayName: "GPT Image 1",
        avatar: "gpt",
        releasedAt: "2025-04-23",
        modelType: "image",
        apiType: "openai:image-generations",

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 5.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 1.25 }], unit: "1M_tokens" },
                { type: "image", name: "input", tiers: [{ rate: 10.00 }], unit: "1M_tokens" },
                { type: "image", name: "cacheRead", tiers: [{ rate: 2.50 }], unit: "1M_tokens" },
                { type: "image", name: "output", tiers: [{ rate: 40.00 }], unit: "1M_tokens" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
            {
                id: "size",
                type: "select",
                options: ["1024x1024", "1024x1536", "1536x1024"],
                default: "1024x1024"
            }
        ]
    },
    {
        id: "gpt-image-1-mini",
        displayName: "GPT Image 1 mini",
        avatar: "gpt",
        releasedAt: "2025-10-06",
        modelType: "image",
        apiType: "openai:image-generations",

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", tiers: [{ rate: 2.00 }], unit: "1M_tokens" },
                { type: "text", name: "cacheRead", tiers: [{ rate: 0.20 }], unit: "1M_tokens" },
                { type: "image", name: "input", tiers: [{ rate: 2.50 }], unit: "1M_tokens" },
                { type: "image", name: "cacheRead", tiers: [{ rate: 0.25 }], unit: "1M_tokens" },
                { type: "image", name: "output", tiers: [{ rate: 8.00 }], unit: "1M_tokens" },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["image"],
        },

        features: ["image_generation", "image_edit"],

        parameters: [
            {
                id: "quality",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium"
            },
            {
                id: "size",
                type: "select",
                options: ["1024x1024", "1024x1536", "1536x1024"],
                default: "1024x1024"
            }
        ]
    }
];
