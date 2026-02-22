import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { ensureSession } from "@/lib/chat/db-helper";
import { getUserChatSettings } from "@/lib/chat/auth-helper";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { BailianImageAdapter } from "@/lib/providers/bailian/image-adapter";
import { loadModelConfigsForProvider } from "@/lib/data/models";
import type { ContentPart } from "@/lib/types";
import { BAILIAN_PROVIDER_INFO } from "@/lib/providers/bailian/types";

export const dynamic = 'force-dynamic';

const imageGenerationSchema = z.object({
  prompt: z.string().min(1, "提示词不能为空"),
  count: z.number().int().min(1).max(10).default(1),
  aspectRatio: z.string().default("1:1"),
  referenceImage: z.string().optional().nullable(),
  referenceImages: z.array(z.string()).optional().default([]),
  sessionId: z.string().optional().nullable(),
  provider: z.string().optional(),
  model: z.string().optional(),
  // 特定 provider 参数
  negative_prompt: z.string().optional(),
  prompt_extend: z.boolean().optional(),
  watermark: z.boolean().optional(),
  seed: z.number().optional(),
  enable_interleave: z.boolean().optional(),
  max_images: z.number().optional(),
});

/**
 * 下载图片并保存到本地
 */
async function downloadAndSaveImage(url: string, userId: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('md5').update(Buffer.from(buffer)).digest('hex');
    const ext = 'jpg';
    const fileName = `${hash}.${ext}`;

    // 按用户ID分目录存储
    const userDir = path.join(process.cwd(), 'public', 'uploads', 'images', userId);
    await fs.mkdir(userDir, { recursive: true });

    const filePath = path.join(userDir, fileName);
    await fs.writeFile(filePath, Buffer.from(buffer));

    return `/uploads/images/${userId}/${fileName}`;
  } catch (error) {
    logger.error('Failed to download image:', error);
    return url;
  }
}

/**
 * 获取默认 BaseURL
 */
function getDefaultBaseURL(providerId: string): string {
  switch (providerId) {
    case 'bailian':
      return BAILIAN_PROVIDER_INFO.defaultBaseURL;
    default:
      return '';
  }
}

/**
 * 流式图像生成 API
 * 使用 Server-Sent Events (SSE) 返回流式响应
 */
export async function POST(req: NextRequest) {
  // 1. 认证
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    // 2. 解析请求
    const body = await req.json();
    const result = imageGenerationSchema.safeParse(body);

    if (!result.success) {
      return badRequestResponse(`Invalid request data: ${result.error.message}`);
    }

    const {
      prompt,
      count,
      aspectRatio,
      referenceImage,
      referenceImages,
      sessionId,
      provider: overrideProvider,
      model: overrideModel,
      negative_prompt,
      prompt_extend,
      watermark,
      seed,
      enable_interleave,
      max_images,
    } = result.data;

    // 3. 获取用户设置
    const settings = await getUserChatSettings(userId);
    const providers = settings.providers || {};

    // 4. 选择提供商和模型
    let selectedProviderId = overrideProvider;
    let selectedProviderConfig = selectedProviderId ? providers[selectedProviderId] : undefined;

    if (!selectedProviderConfig || !selectedProviderConfig.enabled) {
      const enabledProviderId = Object.keys(providers).find(
        (id) => providers[id].enabled && providers[id].apiKey
      );
      selectedProviderId = enabledProviderId || "bailian";
      selectedProviderConfig = enabledProviderId ? providers[enabledProviderId] : undefined;
    }

    if (!selectedProviderId || !selectedProviderConfig) {
      return badRequestResponse("未找到可用的提供商配置");
    }

    let selectedModel = overrideModel;
    if (!selectedModel) {
      const imageModels = selectedProviderConfig.models?.filter(m =>
        m.modelType === "image" ||
        m.features?.includes("image_generation")
      ) || [];
      if (imageModels.length > 0) {
        selectedModel = imageModels[0].id;
      } else {
        selectedModel = "wan2.6-image";
      }
    }

    // 检查是否支持图文混排
    const isInterleavedMode = enable_interleave === true && selectedModel?.includes('wan2.6');
    if (!isInterleavedMode) {
      return badRequestResponse("流式生成仅支持 wan2.6 模型的图文混排模式");
    }

    // 获取模型配置
    const modelConfigs = await loadModelConfigsForProvider(selectedProviderId);
    const modelConfig = modelConfigs.find(m => m.id === selectedModel);
    const selectedModelAvatar = modelConfig?.avatar;

    const apiKey = selectedProviderConfig.apiKey;
    if (!apiKey) {
      return badRequestResponse("提供商API Key未配置");
    }

    // 合并参考图
    const allReferenceImages: string[] = [];
    if (referenceImage) {
      allReferenceImages.push(referenceImage);
    }
    if (referenceImages && referenceImages.length > 0) {
      allReferenceImages.push(...referenceImages);
    }

    // 5. 确保会话存在
    const currentSessionId = await ensureSession(userId, sessionId, prompt, null, true);

    // 6. 创建流式响应
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // 发送初始消息ID
        const messageId = crypto.randomUUID();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', messageId })}\n\n`));

        try {
          // 创建适配器
          const bailianAdapter = new BailianImageAdapter({
            apiKey: apiKey,
            baseURL: selectedProviderConfig.baseURL || getDefaultBaseURL(selectedProviderId),
            timeout: 180000, // 3 分钟超时
          });

          // 构建请求
          const imageRequest = {
            model: selectedModel,
            provider: selectedProviderId,
            prompt,
            count,
            referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
            enable_interleave: true,
            max_images: max_images || count,
            negative_prompt,
            prompt_extend,
            watermark,
            seed,
          };

          // 发送用户消息
          const userMessage = await db.message.create({
            data: {
              role: 'user',
              content: prompt,
              sessionId: currentSessionId,
              model: selectedModel,
              provider: selectedProviderId,
              modelAvatar: selectedModelAvatar,
              parentId: null,
            },
          });

          // 创建助手消息（初始为空）
          const assistantMessage = await db.message.create({
            data: {
              role: 'assistant',
              content: JSON.stringify({
                type: 'interleaved',
                contentParts: [],
                aspectRatio: aspectRatio,
              }),
              sessionId: currentSessionId,
              model: selectedModel,
              provider: selectedProviderId,
              modelAvatar: selectedModelAvatar,
              parentId: userMessage.id,
              status: 'streaming',
            },
          });

          // 发送消息创建事件
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'message_created', 
            userMessageId: userMessage.id,
            assistantMessageId: assistantMessage.id 
          })}\n\n`));

          // 用于跟踪已发送的内容
          const sentParts: ContentPart[] = [];
          const sentImageUrls = new Set<string>();

          // 执行流式生成
          const contentParts = await bailianAdapter.generateInterleavedStreaming(
            imageRequest,
            (updatedParts) => {
              // 检查新内容并发送事件
              for (let i = sentParts.length; i < updatedParts.length; i++) {
                const part = updatedParts[i];
                
                if (part.type === 'image' && part.image && !sentImageUrls.has(part.image)) {
                  // 发送图片事件
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                    type: 'image', 
                    url: part.image,
                    assistantMessageId: assistantMessage.id 
                  })}\n\n`));
                  sentParts.push(part);
                  sentImageUrls.add(part.image);
                } else if (part.type === 'text' && part.text) {
                  // 检查是否是新的文本或文本更新
                  const lastSentPart = sentParts[sentParts.length - 1];
                  if (lastSentPart && lastSentPart.type === 'text') {
                    // 文本更新，发送增量
                    const newText = part.text.substring(lastSentPart.text?.length || 0);
                    if (newText) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        type: 'text', 
                        text: newText,
                        fullText: part.text,
                        assistantMessageId: assistantMessage.id 
                      })}\n\n`));
                      lastSentPart.text = part.text;
                    }
                  } else {
                    // 新的文本片段
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                      type: 'text', 
                      text: part.text,
                      fullText: part.text,
                      assistantMessageId: assistantMessage.id 
                    })}\n\n`));
                    sentParts.push({ ...part });
                  }
                }
              }
            }
          );

          // 下载图片并更新 URL
          const localContentParts: ContentPart[] = [];
          for (const part of contentParts) {
            if (part.type === 'image' && part.image) {
              const localUrl = await downloadAndSaveImage(part.image, userId);
              localContentParts.push({ ...part, image: localUrl });
            } else if (part.type === 'text') {
              localContentParts.push(part);
            }
          }

          // 更新数据库中的消息
          await db.message.update({
            where: { id: assistantMessage.id },
            data: {
              content: JSON.stringify({
                type: 'interleaved',
                contentParts: localContentParts,
                aspectRatio: aspectRatio,
              }),
              status: 'completed',
            },
          });

          // 更新会话时间
          await db.session.update({
            where: { id: currentSessionId },
            data: { updatedAt: new Date() },
          });

          // 发送完成事件
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            contentParts: localContentParts,
            sessionId: currentSessionId,
            assistantMessageId: assistantMessage.id 
          })}\n\n`));

        } catch (_error: any) {
          logger.error("Stream generation error:", _error);
          
          // 发送错误事件
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            message: _error.message || '生成失败' 
          })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (_error: any) {
    logger.error("Stream API error:", _error);
    return createErrorResponse(_error.message || 'Internal server error', 500);
  }
}
