import { ModelConfig } from '@/lib/types/model';

export const perplexityModelConfigs: ModelConfig[] = [
    {
        id: "sonar",
        displayName: "Sonar",
        avatar: "perplexity",
        releasedAt: "2025-01-27",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 1.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 5.00, condition: "low"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 8.00, condition: "medium"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 12.00, condition: "high"}] },
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
                id: "search_mode",
                type: "select",
                options: ["web", "academic", "sec"],
                default: "web",
                mapping: "search_mode"
            },
            {
                id: "search_context_size",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "search_context_size"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.2,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "sonar-pro",
        displayName: "Sonar Pro",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 204800,
        maxOutput: 8192,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 15.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 6.00, condition: "fast:low"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "fast:medium"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 14.00, condition: "fast:high"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 14.00, condition: "pro:low"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 18.00, condition: "pro:medium"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 22.00, condition: "pro:high"}] },
            ]
        },

        modalities: {
            input: ["text", "image"],
            output: ["text", "image", "video"],
        },

        features: ["structured_outputs"],
        builtinTools: ["web_search"],

        parameters: [
            {
                id: "search_type",
                type: "select",
                options: ["fast", "pro", "auto"],
                default: "fast",
                mapping: "search_type"
            },
            {
                id: "search_mode",
                type: "select",
                options: ["web", "academic", "sec"],
                default: "web",
                mapping: "search_mode"
            },
            {
                id: "search_context_size",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "search_context_size"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.2,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "sonar-reasoning-pro",
        displayName: "Sonar Reasoning Pro",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "chat",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 6.00, condition: "low"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 10.00, condition: "medium"}] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 14.00, condition: "high"}] },
            ]
        },

        modalities: {
            input: ["text"],
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
                id: "search_mode",
                type: "select",
                options: ["web", "academic", "sec"],
                default: "web",
                mapping: "search_mode"
            },
            {
                id: "search_context_size",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "search_context_size"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.2,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9,
                mapping: "top_p"
            }
        ]
    },
    {
        id: "sonar-deep-research",
        displayName: "Sonar Deep Research",
        avatar: "perplexity",
        releasedAt: "2025-03-07",
        modelType: "research",
        apiType: "openai:chat-completions",

        contextWindow: 131072,
        maxOutput: 131072,

        pricing: {
            currency: "USD",
            items: [
                { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 2.00 }] },
                { type: "text", name: "output", unit: "1M_tokens", tiers: [{ rate: 8.00 }] },
                { type: "thinking", name: "output", unit: "1M_tokens", tiers: [{ rate: 3.00 }] },
                { type: "tools", name: "web_search", unit: "1K_web_search", tiers: [{rate: 5.00}] },
            ]
        },

        modalities: {
            input: ["text"],
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
                id: "search_context_size",
                type: "select",
                options: ["low", "medium", "high"],
                default: "medium",
                mapping: "search_context_size"
            },
            {
                id: "search_mode",
                type: "select",
                options: ["web", "academic", "sec"],
                default: "web",
                mapping: "search_mode"
            },
            {
                id: "temperature",
                type: "number",
                min: 0, max: 2, step: 0.1,
                default: 0.2,
                mapping: "temperature"
            },
            {
                id: "top_p",
                type: "number",
                min: 0, max: 1, step: 0.05,
                default: 0.9,
                mapping: "top_p"
            }
        ]
    }
]
