import { VoiceModelConfig } from '@/lib/types/voice_model';

export const openaiVoiceModelConfigs: VoiceModelConfig[] = [
  // TTS Models
  {
    id: "tts-1",
    displayName: "TTS-1",
    provider: "openai",
    releasedAt: "2024-01-01",
    apiType: "openai:tts",
    modelType: "tts",
    modalities: {
      input: ["text"],
      output: ["audio"],
    },
    features: ["streaming", "multilingual", "speed"],
    voices: [
      { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral" },
      { id: "echo", name: "Echo", description: "Male voice", gender: "male" },
      { id: "fable", name: "Fable", description: "Male voice, narrative", gender: "male" },
      { id: "onyx", name: "Onyx", description: "Male voice, deep", gender: "male" },
      { id: "nova", name: "Nova", description: "Female voice", gender: "female" },
      { id: "shimmer", name: "Shimmer", description: "Female voice, bright", gender: "female" },
    ],
    defaultVoice: "alloy",
    supportedFormats: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
    defaultFormat: "mp3",
    sampleRate: 24000,
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 15.00 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputLength: 4096,
    speedRange: { min: 0.25, max: 4.0, default: 1.0, step: 0.1 },
  },
  {
    id: "tts-1-hd",
    displayName: "TTS-1 HD",
    provider: "openai",
    releasedAt: "2024-01-01",
    apiType: "openai:tts",
    modelType: "tts",
    modalities: {
      input: ["text"],
      output: ["audio"],
    },
    features: ["streaming", "multilingual", "speed", "high-quality"],
    voices: [
      { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral" },
      { id: "echo", name: "Echo", description: "Male voice", gender: "male" },
      { id: "fable", name: "Fable", description: "Male voice, narrative", gender: "male" },
      { id: "onyx", name: "Onyx", description: "Male voice, deep", gender: "male" },
      { id: "nova", name: "Nova", description: "Female voice", gender: "female" },
      { id: "shimmer", name: "Shimmer", description: "Female voice, bright", gender: "female" },
    ],
    defaultVoice: "alloy",
    supportedFormats: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
    defaultFormat: "mp3",
    sampleRate: 24000,
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 30.00 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputLength: 4096,
    speedRange: { min: 0.25, max: 4.0, default: 1.0, step: 0.1 },
  },
  {
    id: "gpt-4o-mini-tts",
    displayName: "GPT-4o Mini TTS",
    provider: "openai",
    releasedAt: "2024-12-01",
    apiType: "openai:tts",
    modelType: "tts",
    modalities: {
      input: ["text"],
      output: ["audio"],
    },
    features: ["streaming", "multilingual", "speed", "emotion"],
    voices: [
      { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral" },
      { id: "echo", name: "Echo", description: "Male voice", gender: "male" },
      { id: "fable", name: "Fable", description: "Male voice, narrative", gender: "male" },
      { id: "onyx", name: "Onyx", description: "Male voice, deep", gender: "male" },
      { id: "nova", name: "Nova", description: "Female voice", gender: "female" },
      { id: "shimmer", name: "Shimmer", description: "Female voice, bright", gender: "female" },
    ],
    defaultVoice: "alloy",
    supportedFormats: ["mp3", "opus", "aac", "flac", "wav", "pcm"],
    defaultFormat: "mp3",
    sampleRate: 24000,
    pricing: {
      currency: "USD",
      items: [
        { type: "text", name: "input", unit: "1M_tokens", tiers: [{ rate: 10.00 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputLength: 4096,
    speedRange: { min: 0.25, max: 4.0, default: 1.0, step: 0.1 },
  },
  // STT Models
  {
    id: "whisper-1",
    displayName: "Whisper-1",
    provider: "openai",
    releasedAt: "2023-03-01",
    apiType: "openai:stt",
    modelType: "stt",
    modalities: {
      input: ["audio"],
      output: ["text"],
    },
    features: ["multilingual", "streaming"],
    supportedFormats: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],
    defaultFormat: "mp3",
    sampleRate: 16000,
    supportedSampleRates: [8000, 16000, 24000, 44100, 48000],
    pricing: {
      currency: "USD",
      items: [
        { type: "audio", name: "input", unit: "per_minute", tiers: [{ rate: 0.006 }] },
      ],
    },
    baseURL: "https://api.openai.com/v1",
    maxInputLength: 26214400, // 25MB
  },
];
