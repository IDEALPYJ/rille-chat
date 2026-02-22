import { ModelConfig } from '@/lib/types/model';

// temperature is adjustable only when reasoning is disabled

export const anthropicModelConfigs: ModelConfig[] = [
    {
        id: "claude-opus-4-6",
        displayName: "Claude Opus 4.6",
        avatar: "claude",
        releasedAt: "2026-02-05",
        knowledgeCutoff: "2025-05",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
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
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "tool_search_tool", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["adaptive"],
                adaptive: {
                    options: ["low", "medium", "high", "max"],
                    default: "high",
                    mapping: "thinking.type",
                    baseParams: { thinking: { type: "adaptive" } }
                }
            }
        },

        parameters: [
            {
                id: "inference_geo",
                type: "select",
                options: ["global", "us"],
                default: "global",
                mapping: "inference_geo"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
                visibleWhen: {
                    reasoning_mode: "disabled"
                }
            },
            {
                id: "compaction",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            },
            {
                id: "compaction_trigger",
                type: "number",
                min: 50000, max: 200000, step: 1000,
                default: 150000,
                visibleWhen: {
                    compaction: "enabled"
                }
            },
            {
                id: "context_1m",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            }
        ]
    },
    {
        id: "claude-sonnet-4-6",
        displayName: "Claude Sonnet 4.6",
        avatar: "claude",
        releasedAt: "2026-02-17",
        knowledgeCutoff: "2025-08",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
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
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "tool_search_tool", "code_interpreter"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["adaptive"],
                adaptive: {
                    options: ["low", "medium", "high", "max"],
                    default: "high",
                    mapping: "thinking.type",
                    baseParams: { thinking: { type: "adaptive" } }
                }
            }
        },

        parameters: [
            {
                id: "inference_geo",
                type: "select",
                options: ["global", "us"],
                default: "global",
                mapping: "inference_geo"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
                visibleWhen: {
                    reasoning_mode: "disabled"
                }
            },
            {
                id: "compaction",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            },
            {
                id: "compaction_trigger",
                type: "number",
                min: 50000, max: 200000, step: 1000,
                default: 150000,
                visibleWhen: {
                    compaction: "enabled"
                }
            },
            {
                id: "context_1m",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            }
        ]
    },
    {
        id: "claude-opus-4-5",
        displayName: "Claude Opus 4.5",
        avatar: "claude",
        releasedAt: "2025-11-24",
        knowledgeCutoff: "2025-05",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 5.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{ rate: 6.25 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 25.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "tool_search_tool", "code_interpreter"],

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
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
                visibleWhen: {
                    reasoning_mode: "disabled"
                }
            }
        ]
    },
    {
        id: "claude-sonnet-4-5",
        displayName: "Claude Sonnet 4.5",
        avatar: "claude",
        releasedAt: "2025-09-29",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 64000,

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
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "tool_search_tool", "code_interpreter"],

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
                id: "context_1m",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
            }
        ]
    },
    {
        id: "claude-haiku-4-5",
        displayName: "Claude Haiku 4.5",
        avatar: "claude",
        releasedAt: "2025-10-15",
        knowledgeCutoff: "2025-02",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{ rate: 1.25 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 5.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "code_interpreter"],

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
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
            }
        ]
    },
    {
        id: "claude-opus-4-1",
        displayName: "Claude Opus 4.1",
        avatar: "claude",
        releasedAt: "2025-08-05",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 32000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 15.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.50 }] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{ rate: 18.75 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 75.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["web_search", "web_fetch", "code_interpreter"],

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
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
            }
        ]
    },
    {
        id: "claude-opus-4-0",
        displayName: "Claude Opus 4",
        avatar: "claude",
        releasedAt: "2025-05-22",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 32000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 15.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 1.50 }] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{ rate: 18.75 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 75.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call"],
        builtinTools: ["web_search", "web_fetch", "code_interpreter"],

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
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
            }
        ]
    },
    {
        id: "claude-sonnet-4-0",
        displayName: "Claude Sonnet 4",
        avatar: "claude",
        releasedAt: "2025-05-22",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "anthropic:messages",

        contextWindow: 200000,
        maxOutput: 64000,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
                { type: "text", name: "cacheWrite", unit: "1M_tokens", tiers: [{ rate: 3.75 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 15.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 10.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "context_1m"],
        builtinTools: ["web_search", "web_fetch", "code_interpreter"],

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
                id: "context_1m",
                type: "select",
                options: ["enabled", "disabled"],
                default: "disabled"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 1, step: 0.1,
                default: 1.0,
            }
        ]
    }
]