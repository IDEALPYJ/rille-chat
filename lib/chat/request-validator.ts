import { z } from "zod";
import { MESSAGE_ROLES } from "@/lib/constants";
import { badRequestResponse } from "@/lib/api-error";
// ReasoningSettings type is used via zod schema inference

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string().optional(),
    role: z.enum([MESSAGE_ROLES.SYSTEM, MESSAGE_ROLES.USER, MESSAGE_ROLES.ASSISTANT, MESSAGE_ROLES.DATA]),
    content: z.string(),
    attachments: z.array(z.object({
      id: z.string(),
      name: z.string(),
      url: z.string(),
      type: z.string(),
      size: z.number(),
    })).optional(),
    // 语音消息字段
    isVoiceInput: z.boolean().optional(),
    audioUrl: z.string().optional(),
    audioDuration: z.number().optional(),
  })).min(1),
  sessionId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  provider: z.string().optional(),
  model: z.string().optional(),
  webSearch: z.boolean().optional(),
  vectorSearch: z.boolean().optional(),
  reasoning: z.union([
    z.boolean(),
    z.object({
      enabled: z.boolean(),
      effort: z.union([z.string(), z.number()]).optional(),
      summary: z.string().optional(),
    }),
  ]).optional(),
  responseMessageId: z.string().optional(),
  tempChat: z.boolean().optional(),
  advancedSettings: z.object({
    temperature: z.number().optional(),
    topP: z.number().optional(),
    topK: z.number().optional(),
    presencePenalty: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    seed: z.number().optional(),
    stopSequences: z.array(z.string()).optional(),
    reasoning: z.object({
      enabled: z.boolean(),
      effort: z.union([z.string(), z.number()]).optional(),
    }).optional(),
    // OpenRouter 等服务商特有的参数
    engine: z.string().optional(),
    verbosity: z.string().optional(),
    search_strategy: z.number().optional(),
    max_results: z.number().optional(),
    // Perplexity 特有参数
    search_type: z.enum(['fast', 'pro', 'auto']).optional(),
    search_mode: z.enum(['web', 'academic', 'sec']).optional(),
    search_context_size: z.enum(['low', 'medium', 'high']).optional(),
    // Zai 智谱AI 特有参数
    search_engine: z.string().optional(),
  }).optional(),
  
  // === 新增字段 ===
  // 联网搜索源配置
  webSearchSource: z.object({
    type: z.enum(['builtin', 'external']),
    provider: z.string().optional(),
    options: z.record(z.string(), z.any()).optional(),
  }).optional(),
  
  // 启用的工具列表
  enabledTools: z.array(z.string()).optional(),
  
  // 工具选项
  toolOptions: z.record(z.string(), z.any()).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * 验证并解析聊天请求
 */
export function validateChatRequest(body: unknown): { success: true; data: ChatRequest } | { success: false; error: Response } {
  const result = chatRequestSchema.safeParse(body);
  
  if (!result.success) {
    return {
      success: false,
      error: badRequestResponse(`Invalid request data: ${result.error.message}`)
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}

