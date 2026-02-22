import { VoiceModelConfig } from '@/lib/types/voice_model';

export const aliyunVoiceModelConfigs: VoiceModelConfig[] = [
  // TTS Models
  {
    id: "qwen3-tts-flash-realtime",
    displayName: "Qwen3 TTS Flash Realtime",
    provider: "aliyun",
    releasedAt: "2024-12-01",
    apiType: "aliyun:tts-realtime",
    modelType: "tts",
    modalities: {
      input: ["text"],
      output: ["audio"],
    },
    features: ["streaming", "realtime", "multilingual", "emotion", "speed"],
    voices: [
      { id: "Cherry", name: "Cherry", description: "年轻女声，活泼可爱", gender: "female", language: ["zh", "en"] },
      { id: "Serena", name: "Serena", description: "温柔女声，成熟稳重", gender: "female", language: ["zh", "en"] },
      { id: "Ethan", name: "Ethan", description: "年轻男声，阳光开朗", gender: "male", language: ["zh", "en"] },
      { id: "Luna", name: "Luna", description: "知性女声，专业正式", gender: "female", language: ["zh", "en"] },
    ],
    defaultVoice: "Cherry",
    supportedFormats: ["pcm", "wav", "mp3"],
    defaultFormat: "pcm",
    sampleRate: 24000,
    supportedSampleRates: [16000, 24000, 48000],
    pricing: {
      currency: "CNY",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 50.00 }] },
      ],
    },
    baseURL: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    maxInputLength: 4096,
    speedRange: { min: 0.5, max: 2.0, default: 1.0, step: 0.1 },
  },
  // STT Models
  {
    id: "qwen3-asr-flash-realtime",
    displayName: "Qwen3 ASR Flash Realtime",
    provider: "aliyun",
    releasedAt: "2024-12-01",
    apiType: "aliyun:stt-realtime",
    modelType: "stt",
    modalities: {
      input: ["audio"],
      output: ["text"],
    },
    features: ["streaming", "realtime", "multilingual"],
    supportedFormats: ["pcm", "wav"],
    defaultFormat: "pcm",
    sampleRate: 16000,
    supportedSampleRates: [16000],
    pricing: {
      currency: "CNY",
      items: [
        { type: "audio", name: "input", unit: "per_minute", tiers: [{ rate: 0.05 }] },
      ],
    },
    baseURL: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
    maxInputLength: 10485760, // 10MB
  },
];