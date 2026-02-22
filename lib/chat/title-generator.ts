import OpenAI from "openai";
import { UserSettings } from "@/lib/types";
import { selectProviderAndModel } from "@/lib/chat/provider-helper";
import { logger } from "@/lib/logger";

export async function generateTitle(
  userMessage: string,
  assistantMessage: string,
  settings: UserSettings
): Promise<string | null> {
  try {
    if (!settings.autoRename) {
      return null;
    }

    let selection = null;
    if (settings.autoRenameModel && settings.autoRenameModel.trim() !== "") {
      const parts = settings.autoRenameModel.split(":");
      if (parts.length === 2) {
        const [providerId, modelId] = parts;
        
        // 验证 provider 是否存在并启用
        const providerConfig = settings.providers?.[providerId];
        if (providerConfig?.enabled) {
          // 验证模型是否存在于 provider 的模型列表中
          const modelExists = providerConfig.models?.some((m: any) => {
            const mId = typeof m === 'string' ? m : m.id;
            return mId === modelId;
          });
          
          if (modelExists) {
            selection = selectProviderAndModel(settings, providerId, modelId);
          } else {
            logger.warn("Title generation model not found in provider, using default", { 
              providerId, 
              modelId,
              autoRenameModel: settings.autoRenameModel 
            });
          }
        } else {
          logger.warn("Title generation provider not enabled, using default", { 
            providerId,
            autoRenameModel: settings.autoRenameModel 
          });
        }
      } else {
        logger.warn("Invalid autoRenameModel format, expected 'provider:model'", { 
          autoRenameModel: settings.autoRenameModel 
        });
      }
    }

    // Fallback to default model if no specific autoRenameModel is set or validation failed
    if (!selection) {
      selection = selectProviderAndModel(settings);
    }
    
    if (!selection) {
      logger.warn("Could not select provider/model for title generation", { model: settings.autoRenameModel });
      return null;
    }

    const { selectedProviderConfig, baseURL, selectedModel, selectedProviderId } = selection;
    
    logger.debug("Title generation using model", { 
      provider: selectedProviderId, 
      model: selectedModel 
    });

    const openai = new OpenAI({
      apiKey: selectedProviderConfig.apiKey,
      baseURL: baseURL,
    });

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise and descriptive titles for conversations. Please generate a title of 10-20 characters based on the user's input and the assistant's response. The title should be in the same language as the user's input. Do not include quotes or any other text, just the title."
        },
        {
          role: "user",
          content: `User: ${userMessage.slice(0, 500)}\nAssistant: ${assistantMessage.slice(0, 500)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 50,
    });

    const title = completion.choices[0]?.message?.content?.trim();
    return title ? title.replace(/^["']|["']$/g, '') : null;

  } catch (error) {
    logger.error("Error generating title", error);
    return null;
  }
}