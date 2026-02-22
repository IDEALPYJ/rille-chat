import OpenAI from "openai";
import { z } from "zod";
import { NextRequest } from "next/server";
import { getChatUser, getUserChatSettings } from "@/lib/chat/auth-helper";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { selectProviderAndModel } from "@/lib/chat/provider-helper";

export const maxDuration = 10;

const completionRequestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Auth & Settings
    const userId = await getChatUser();
    if (!userId) {
      return unauthorizedResponse();
    }

    const settings = await getUserChatSettings(userId);

    // 检查是否启用了输入补全
    if (!settings.inputCompletion?.enabled) {
      return badRequestResponse("输入提示补全未启用");
    }

    // 2. Parse & Validate Request
    const body = await req.json();
    const result = completionRequestSchema.safeParse(body);

    if (!result.success) {
      return badRequestResponse(`Invalid request data: ${result.error.message}`);
    }

    const { text } = result.data;

    // 3. 选择模型
    let selection = null;
    if (settings.inputCompletion?.model && settings.inputCompletion.model.trim() !== "") {
      const parts = settings.inputCompletion.model.split(":");
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
            logger.warn("Completion model not found in provider, using default", { 
              providerId, 
              modelId,
              completionModel: settings.inputCompletion.model 
            });
          }
        } else {
          logger.warn("Completion provider not enabled, using default", { 
            providerId,
            completionModel: settings.inputCompletion.model 
          });
        }
      } else {
        logger.warn("Invalid completionModel format, expected 'provider:model'", { 
          completionModel: settings.inputCompletion.model 
        });
      }
    }

    // Fallback to default model if no specific model is set or validation failed
    if (!selection) {
      selection = selectProviderAndModel(settings);
    }
    
    if (!selection) {
      return badRequestResponse("No AI provider enabled or selected provider is not configured.");
    }

    const { selectedProviderConfig, baseURL, selectedModel } = selection;

    // 4. Initialize Client
    const openai = new OpenAI({
      apiKey: selectedProviderConfig.apiKey,
      baseURL: baseURL,
    });

    // 5. 调用补全API
    // 使用专门的补全提示词，让模型理解这是文本补全任务，而不是对话
    // 让AI模型自己判断是否需要补全，如果不需要就返回空字符串
    const completionPrompt = `Complete the text. Output ONLY the continuation (1-20 words). No greetings, no questions. Return empty if input is complete.

Input: ${text}
Completion:`;

    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "user",
          content: completionPrompt
        }
      ],
      max_tokens: 50, // 限制补全长度
      temperature: 0.5, // 降低温度以获得更准确的补全
      stream: false,
    });

    let completion = response.choices[0]?.message?.content || "";
    
    // 清理补全内容
    completion = completion.trim();
    
    // 如果AI返回空字符串或很短的文本，说明不需要补全
    if (!completion || completion.length < 2) {
      completion = "";
    }

    return new Response(JSON.stringify({ completion }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    logger.error("Input completion API error:", error, {
      errorMessage: error.message,
    });
    
    let errorMessage = "输入补全失败";
    if (error instanceof OpenAI.APIError) {
      errorMessage = `API 错误 (${error.status}): ${error.message}`;
      if (error.code) errorMessage += ` (代码: ${error.code})`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return createErrorResponse(errorMessage, 500);
  }
}

