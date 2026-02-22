import { VoiceProviderConfig } from '@/lib/types/voice_model';

export const voiceProviders: VoiceProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    avatar: "openai",
    supportsTTS: true,
    supportsSTT: true,
  },
  {
    id: "aliyun",
    name: "阿里云",
    avatar: "aliyun",
    supportsTTS: true,
    supportsSTT: true,
  },
];
