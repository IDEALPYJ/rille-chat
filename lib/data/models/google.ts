import { ModelConfig } from '@/lib/types/model';

export const googleModelConfigs: ModelConfig[] = [
    {
        id: "gemini-3-1-pro-preview",
        displayName: "Gemini 3.1 Pro",
        avatar: "gemini",
        releasedAt: "2026-02-19",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00, condition: { input: [0, 204800] } }, { rate: 4.00, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.20, condition: { input: [0, 204800] } }, { rate: 0.40, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00, condition: { input: [0, 204800] } }, { rate: 18.00, condition: { input: [204800, "infinity"] } }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 14.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "high"],
                    default: "high",
                    mapping: "thinkingConfig.thinkingLevel",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "gemini-3-pro-preview",
        displayName: "Gemini 3 Pro",
        avatar: "gemini",
        releasedAt: "2025-11-18",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00, condition: { input: [0, 204800] } }, { rate: 4.00, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.20, condition: { input: [0, 204800] } }, { rate: 0.40, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00, condition: { input: [0, 204800] } }, { rate: 18.00, condition: { input: [204800, "infinity"] } }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 14.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["low", "high"],
                    default: "high",
                    mapping: "thinkingConfig.thinkingLevel",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "gemini-3-flash-preview",
        displayName: "Gemini 3 Flash",
        avatar: "gemini",
        releasedAt: "2025-12-17",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.50 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.05 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 14.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["effort"],
                effort: {
                    options: ["minimal", "low", "medium", "high"],
                    default: "high",
                    mapping: "thinkingConfig.thinkingLevel",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "gemini-2.5-pro",
        displayName: "Gemini 2.5 Pro",
        avatar: "gemini",
        releasedAt: "2025-06-17",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.25, condition: { input: [0, 204800] } }, { rate: 2.50, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.125, condition: { input: [0, 204800] } }, { rate: 0.25, condition: { input: [204800, "infinity"] } }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 10.00, condition: { input: [0, 204800] } }, { rate: 15.00, condition: { input: [204800, "infinity"] } }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 35.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "google_maps", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 128, max: 32768, step: 1,
                    default: -1,
                    mapping: "thinkingConfig.thinkingBudget",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        avatar: "gemini",
        releasedAt: "2025-06-17",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.03 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 35.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "google_maps", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0, max: 24576, step: 1,
                    default: 0,
                    mapping: "thinkingConfig.thinkingBudget",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "gemini-2.5-flash-lite",
        displayName: "Gemini 2.5 Flash Lite",
        avatar: "gemini",
        releasedAt: "2025-07-22",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.10 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.01 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 0.40 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 35.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: ["reasoning", "function_call", "structured_outputs"],
        builtinTools: ["google_search", "url_context", "google_maps", "code_execution"],

        reasoning: {
            readonly: false,
            defaultEnabled: true,
            intensity: {
                supportedModes: ["budget"],
                budget: {
                    min: 0, max: 24576, step: 1,
                    default: 0,
                    mapping: "thinkingConfig.thinkingBudget",
                    baseParams: { thinkingConfig: { includeThoughts: true } }
                }
            }
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
        id: "deep-research-pro-preview-12-2025",
        displayName: "Deep Research Pro",
        avatar: "gemini",
        releasedAt: "2025-12-12",
        knowledgeCutoff: "2025-01",
        modelType: "research",
        apiType: "google:gemini-generate",

        contextWindow: 1048576,
        maxOutput: 65536,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "cacheRead", unit: "1M_tokens", tiers: [{ rate: 0.20 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 35.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image", "video", "audio"],
            output: ["text"],
        },

        features: [],

        parameters: [
        ]
    },
    {
        id: "gemini-3-pro-image-preview",
        displayName: "Nano Banana Pro",
        avatar: "gemini",
        releasedAt: "2025-11-20",
        knowledgeCutoff: "2025-01",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 65536,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 12.00 }] },
                { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "image", name: "output", unit: "1M_tokens", tiers: [{ rate: 120.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{ rate: 35.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["reasoning", "structured_outputs"],
        builtinTools: ["google_search"],

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
            }
        ]
    },
    {
        id: "gemini-2.5-flash-image",
        displayName: "Nano Banana",
        avatar: "gemini",
        releasedAt: "2025-10-07",
        knowledgeCutoff: "2025-06",
        modelType: "chat",
        apiType: "google:gemini-generate",

        contextWindow: 65536,
        maxOutput: 32768,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 2.50 }] },
                { type: "image", name: "input", unit: "1M_tokens", tiers: [{ rate: 0.30 }] },
                { type: "image", name: "output", unit: "1M_tokens", tiers: [{ rate: 30.00 }] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image"],
        },

        features: ["structured_outputs"],
        builtinTools: [],

        parameters: [
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 1.0
            }
        ]
    }
]