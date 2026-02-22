import { NextRequest } from "next/server";
import { getChatUser, getUserChatSettings } from "@/lib/chat/auth-helper";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import {
  createVoiceProvider,
  VoiceProviderType,
} from "@/lib/voice/providers";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const userId = await getChatUser();
    if (!userId) {
      return unauthorizedResponse();
    }

    const settings = await getUserChatSettings(userId);

    // 2. 解析 FormData
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return badRequestResponse("No audio file provided");
    }

    // 3. 获取语音输入配置
    const voiceConfig = settings.voice;
    if (voiceConfig?.input?.mode !== "ai") {
      return badRequestResponse("AI speech recognition not enabled");
    }

    if (!voiceConfig.input.provider) {
      return badRequestResponse("STT provider not configured");
    }

    const providerId = voiceConfig.input.provider as VoiceProviderType;
    const providerConfig = voiceConfig.input.providers?.[providerId];

    if (!providerConfig) {
      return badRequestResponse(`STT provider '${providerId}' not configured`);
    }

    // 4. 获取模型和 API 配置
    const modelId = providerConfig.model;
    if (!modelId) {
      return badRequestResponse("STT model not configured");
    }

    const apiKey = providerConfig.apiKey;
    if (!apiKey) {
      return badRequestResponse(`API key not configured for ${providerId}`);
    }

    // 5. 创建语音服务提供者
    const provider = await createVoiceProvider(providerId, {
      apiKey: apiKey,
      baseURL: providerConfig.baseURL,
      model: modelId,
    });

    // 6. 调用 STT API
    const response = await provider.transcribe({
      audio: audioFile,
      language: language || undefined,
    });

    // 7. 返回转写结果
    return Response.json({
      text: response.text,
      language: response.language,
    });

  } catch (error: any) {
    logger.error("STT API Error:", error);
    
    // 检查是否是 API 错误
    if (error.status) {
      return createErrorResponse(
        error.message || "STT API Error",
        error.status,
        "STT_API_ERROR",
        error
      );
    }

    return createErrorResponse(
      error.message || "STT API Error",
      500,
      "STT_API_ERROR",
      error
    );
  }
}
