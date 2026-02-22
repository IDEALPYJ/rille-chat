import { auth } from "@/auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { getAdapterForProvider } from "@/lib/chat/protocols";
import { getDefaultBaseURLForProvider, enrichProviderConfigWithDefaults } from "@/lib/chat/protocol-config";

export async function POST(req: Request) {
  const session = await auth();
  let userId = session?.user?.id;

  if (!userId) {
    const { db } = await import("@/lib/db");
    const devUser = await db.user.findFirst();
    userId = devUser?.id;
  }

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { provider, config } = await req.json();

    if (!config) {
      return badRequestResponse("Config is required");
    }

    let models: any[] = [];

    const mapModelInfo = (m: any) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      created: m.created,
      contextLength: m.context_length,
      pricing: m.pricing,
      architecture: m.architecture,
      top_provider: m.top_provider,
      supported_parameters: m.supported_parameters,
      enabled: true,
      features: {
        vision: m.architecture?.input_modalities?.includes("image"),
        text: m.architecture?.input_modalities?.includes("text"),
        toolCall: m.supported_parameters?.includes("tools"),
        deepThinking: m.supported_parameters?.includes("reasoning") || m.id.includes("reasoner") || m.id.includes("thinking"),
        webSearch: m.pricing?.web_search && m.pricing.web_search !== "0",
        imageGeneration: m.id.includes("dall-e") || m.id.includes("stable-diffusion") || m.architecture?.output_modalities?.includes("image"),
      }
    });

    // 使用协议适配器列出模型（baseURL 为空时使用默认接入点）
    try {
      const adapter = getAdapterForProvider(provider);
      const enrichedConfig = enrichProviderConfigWithDefaults(provider, config);
      const modelInfos = await adapter.listModels(enrichedConfig);
      // 将 ModelInfo 转换为 mapModelInfo 期望的格式
      models = modelInfos.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        created: m.created,
        context_length: m.contextLength,
        pricing: m.pricing ? {
          prompt: m.pricing.prompt,
          completion: m.pricing.completion,
        } : undefined,
        architecture: m.architecture,
        top_provider: m.contextLength ? {
          context_length: m.contextLength,
          max_completion_tokens: 0,
          is_moderated: false,
        } : undefined,
        supported_parameters: m.supported_parameters,
      })).map(mapModelInfo);
    } catch (_error: any) {
      // 如果协议适配器未实现或失败，回退到旧的逻辑（向后兼容）
      logger.warn("Protocol adapter failed, falling back to legacy logic", _error);
      
      if (provider === "openrouter") {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              "HTTP-Referer": "https://rille-chat.vercel.app",
              "X-Title": "Rille Chat",
            }
          });
          if (res.ok) {
            const data = await res.json();
            models = (data.data || []).map(mapModelInfo);
          }
        } catch (e) {
          logger.error("Failed to fetch OpenRouter models", e);
        }
      } else if (provider === "google") {
        let pageToken = "";
        const baseURL = config.baseURL || "https://generativelanguage.googleapis.com";
        const apiKey = config.apiKey;
        let base = baseURL;
        // Ensure base URL doesn't end with a slash for consistency
        if (base.endsWith("/")) base = base.slice(0, -1);
        
        do {
          const url = `${base}/v1beta/models?key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}&pageSize=1000`;
          const res = await fetch(url);
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error?.message || `Google API error: ${res.statusText}`);
          }
          const data = await res.json();
          if (data.models) {
            const fetchedModels = data.models
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => ({
                id: m.name.replace("models/", ""),
                name: m.displayName || m.name.replace("models/", ""),
                description: m.description,
              }))
              .map(mapModelInfo);
            models = [...models, ...fetchedModels];
          }
          pageToken = data.nextPageToken || "";
        } while (pageToken);
      } else {
        const apiKey = config.apiKey;
        const finalBaseURL = config.baseURL || getDefaultBaseURLForProvider(provider);

        const client = new OpenAI({
          apiKey,
          baseURL: finalBaseURL || undefined,
          timeout: 30000, // 30 seconds
        });

        const response = await client.models.list();
        // 将模型 ID 数组转换为完整的模型信息对象
        models = response.data.map((m: any) => ({
          id: m.id,
          name: m.id, // 默认使用 ID 作为名称，如果 API 返回了其他名称字段可以在这里添加
          created: m.created,
        })).map(mapModelInfo);
      }
    }

    return NextResponse.json({ success: true, models });
  } catch (_error: any) {
    return createErrorResponse("Failed to fetch models", 500, "FETCH_MODELS_FAILED", _error);
  }
}
