/**
 * 为聊天模型选择器提供 Provider 和模型列表
 * 模型列表以静态配置（lib/data/models/*.ts）为唯一数据源，不再依赖用户 DB 中存储的 models
 */
import { NextResponse } from "next/server";
import { unauthorizedResponse } from "@/lib/api-error";
import { loadModelConfigsForProvider } from "@/lib/data/models";
import { modelProviders } from "@/lib/data/model-providers/model-providers";
import { getChatUser, getUserChatSettings } from "@/lib/chat/auth-helper";
import { PROVIDER_NAMES } from "@/components/chat/model-selector";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const settings = await getUserChatSettings(userId);
    const providersConfig = settings?.providers || {};

    const { searchParams } = new URL(req.url);
    const imageGenerationOnly = searchParams.get("imageGenerationOnly") === "true";

    const result: Array<{
      id: string;
      name: string;
      enabled: boolean;
      models: Array<{ id: string; displayName?: string; name?: string; enabled?: boolean; features?: any; purpose?: string; avatar?: string }>;
      model?: string;
    }> = [];

    for (const provider of modelProviders) {
      const config = providersConfig[provider.id] as { enabled?: boolean; model?: string; models?: any[] } | undefined;
      if (!config?.enabled) continue;

      const staticModels = await loadModelConfigsForProvider(provider.id);
      if (staticModels.length === 0) continue;

      // 获取用户保存的模型配置（用于获取 enabled 状态）
      const savedModels = config.models || [];

      const models = staticModels
        .map((m) => {
          // 查找用户是否已保存此模型的配置
          const savedModel = savedModels.find((sm: any) => sm.id === m.id);
          
          return {
            id: m.id,
            displayName: m.displayName,
            name: m.displayName || m.id,
            // 使用用户保存的 enabled 状态，如果没有保存过则默认为 false
            enabled: savedModel ? savedModel.enabled : false,
            features: m.features,
            modelType: m.modelType,
            avatar: m.avatar,
          };
        })
        .filter((m) => {
          // 只返回启用的模型
          if (!m.enabled) return false;
          
          if (imageGenerationOnly) {
            return m.modelType === "image" ||
                   m.features?.includes("image_generation") ||
                   m.features?.includes("image_edit");
          }
          return m.modelType === "chat" || m.modelType === "research";
        });

      if (models.length === 0) continue;

      // 优先使用用户设置的自定义名称，如果没有则使用默认名称
      const customName = (config as any).name;
      const defaultName = PROVIDER_NAMES[provider.id] || provider.id;
      
      result.push({
        id: provider.id,
        name: customName || defaultName,
        enabled: true,
        models,
        model: config.model,
      });
    }

    const response = NextResponse.json({ providers: result });
    // 禁用缓存，确保名称更改能立即生效
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  } catch (error) {
    console.error("providers-for-select error:", error);
    return NextResponse.json({ providers: [] });
  }
}
