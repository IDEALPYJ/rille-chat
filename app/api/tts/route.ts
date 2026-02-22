import { NextRequest } from "next/server";
import { z } from "zod";
import { getChatUser, getUserChatSettings } from "@/lib/chat/auth-helper";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import {
  createVoiceProvider,
  VoiceProviderType,
  getDefaultVoiceForModelId,
} from "@/lib/voice/providers";

export const maxDuration = 30;

const ttsRequestSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.string().optional(),
  speed: z.number().min(0.25).max(4.0).optional().default(1.0)
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const userId = await getChatUser();
    if (!userId) {
      return unauthorizedResponse();
    }

    const settings = await getUserChatSettings(userId);

    // 2. Parse & Validate Request
    const body = await req.json();
    const result = ttsRequestSchema.safeParse(body);

    if (!result.success) {
      return badRequestResponse(`Invalid request data: ${result.error.message}`);
    }

    const { text, voice, speed } = result.data;

    // 3. 获取语音输出配置
    const voiceConfig = settings.voice;
    if (!voiceConfig?.output?.provider) {
      return badRequestResponse("TTS provider not configured");
    }

    const providerId = voiceConfig.output.provider as VoiceProviderType;
    const providerConfig = voiceConfig.output.providers?.[providerId];

    if (!providerConfig) {
      return badRequestResponse(`TTS provider '${providerId}' not configured`);
    }

    // 4. 获取模型和 API 配置
    const modelId = providerConfig.model;
    if (!modelId) {
      return badRequestResponse("TTS model not configured");
    }

    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
      return badRequestResponse(`API key not configured for ${providerId}`);
    }

    // 5. 获取默认音色
    const defaultVoice = await getDefaultVoiceForModelId(modelId);

    // 6. 创建语音服务提供者
    const provider = await createVoiceProvider(providerId, {
      apiKey: apiKey,
      baseURL: providerConfig.baseURL,
      model: modelId,
      voice: providerConfig.voice || voice || defaultVoice,
    });

    // 7. 调用 TTS API (流式)
    const selectedVoice = providerConfig.voice || voice || defaultVoice;

    // 创建 ReadableStream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await provider.synthesizeStream({
            text,
            voice: selectedVoice,
            speed,
          }, (chunk, done) => {
            if (chunk.byteLength > 0) {
              controller.enqueue(new Uint8Array(chunk));
            }
            if (done) {
              controller.close();
            }
          });
        } catch (error) {
          logger.error("TTS Stream Error:", error);
          controller.error(error);
        }
      },
    });

    // 7. 返回流式响应
    // 确定 Content-Type (阿里云默认为 PCM，OpenAI 默认为 MP3)
    let contentType = 'audio/mpeg'; // Default to MP3
    if (providerId === 'aliyun') {
      contentType = 'audio/pcm';
    } else if (providerId === 'openai') {
      // OpenAI format defaults to mp3 in our provider implementation
      contentType = 'audio/mpeg';
    }

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        // "Content-Length": ... // Streamed response does not have known length
        "Transfer-Encoding": "chunked",
        // 对于 PCM 格式，添加采样率信息
        ...(contentType === 'audio/pcm' ? {
          "X-Audio-Sample-Rate": "24000",
          "X-Audio-Channels": "1",
          "X-Audio-Bits-Per-Sample": "16",
        } : {}),
      },
    });

  } catch (error: any) {
    logger.error("TTS API Error:", error);
    
    // 检查是否是 API 错误
    if (error.status) {
      return createErrorResponse(
        error.message || "TTS API Error",
        error.status,
        "TTS_API_ERROR",
        error
      );
    }

    return createErrorResponse(
      error.message || "TTS API Error",
      500,
      "TTS_API_ERROR",
      error
    );
  }
}
