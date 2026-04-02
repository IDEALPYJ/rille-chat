/**
 * AI 调用辅助函数
 * 用于主题提取和洞察生成
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";

export interface CallAIOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  providers: Record<string, any>;
}

export interface CallAIResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 解析模型配置字符串
 */
function parseModelConfig(modelConfig: string): { provider: string; model: string } | null {
  if (!modelConfig || !modelConfig.includes(":")) {
    return null;
  }
  
  const [provider, ...modelParts] = modelConfig.split(":");
  const model = modelParts.join(":");
  
  if (!provider || !model) {
    return null;
  }
  
  return { provider, model };
}

/**
 * 获取 Provider 配置
 */
function getProviderConfig(providerId: string, providers: Record<string, any>): any | null {
  const config = providers[providerId];
  if (!config || !config.enabled) {
    return null;
  }
  return config;
}

/**
 * 调用 AI 模型
 */
export async function callAI(options: CallAIOptions): Promise<CallAIResult> {
  const { model, messages, temperature = 0.3, providers } = options;
  
  const parsed = parseModelConfig(model);
  if (!parsed) {
    throw new Error(`Invalid model config: ${model}`);
  }
  
  const { provider: providerId, model: modelId } = parsed;
  const providerConfig = getProviderConfig(providerId, providers);
  
  if (!providerConfig) {
    throw new Error(`Provider not found or not enabled: ${providerId}`);
  }
  
  let baseURL = providerConfig.baseURL;
  if (baseURL && !baseURL.endsWith("/")) {
    baseURL += "/";
  }
  
  const openai = new OpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: baseURL,
  });
  
  const completion = await openai.chat.completions.create({
    model: modelId,
    messages: messages as any,
    temperature,
  });
  
  const content = completion.choices[0]?.message?.content || "";
  
  return {
    content,
    usage: completion.usage ? {
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      total_tokens: completion.usage.total_tokens,
    } : undefined,
  };
}
