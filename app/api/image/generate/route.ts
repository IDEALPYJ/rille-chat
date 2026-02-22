import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { ensureSession } from "@/lib/chat/db-helper";
import { getUserChatSettings } from "@/lib/chat/auth-helper";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { createImageGenerationService } from "@/lib/image/adapter-factory";
import { loadModelConfigsForProvider } from "@/lib/data/models";
import { BailianImageAdapter } from "@/lib/providers/bailian/image-adapter";
import type { ContentPart } from "@/lib/types";

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
  updateMessageId: z.string().optional().nullable(),
  // 尺寸参数
  size: z.string().optional(),
  // 通用高级参数
  quality: z.enum(['low', 'medium', 'high', 'auto', 'standard', 'hd']).optional(),
  watermark: z.boolean().optional(),
  seed: z.number().optional(),
  // 特定 provider 参数（透传给适配器处理）
  negative_prompt: z.string().optional(),
  prompt_extend: z.boolean().optional(),
  enable_interleave: z.boolean().optional(),
  max_images: z.number().optional(),
  background: z.enum(['transparent', 'opaque', 'auto']).optional(),
  output_format: z.enum(['png', 'jpeg', 'webp']).optional(),
  output_compression: z.number().min(0).max(100).optional(),
  input_fidelity: z.enum(['low', 'high']).optional(),
  mask: z.string().optional(),
  resolution: z.enum(['1k', '2k', '4k']).optional(),
  // 前端传递的参数名映射
  sequential_mode: z.enum(['auto', 'disabled']).optional(),
  optimize_mode: z.enum(['standard', 'fast']).optional(),
  custom_width: z.number().optional(),
  custom_height: z.number().optional(),
  grid_count: z.number().int().min(1).max(15).optional(),
  // 后端内部使用的参数名（也保留以支持直接调用）
  resolution_width: z.number().optional(),
  resolution_height: z.number().optional(),
  sequential_image_generation: z.enum(['auto', 'disabled']).optional(),
  optimize_prompt_options: z.enum(['standard', 'fast']).optional(),
  response_format: z.enum(['url', 'b64_json']).optional(),
});

// 下载图片到本地并返回本地路径
async function downloadAndSaveImage(
  remoteUrl: string,
  userId: string
): Promise<string> {
  try {
    // 下载远程图片
    const response = await fetch(remoteUrl, { timeout: 30000 } as any);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    
    // 生成文件名和路径
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${crypto.randomUUID()}.png`;
    
    // 修改为保存到 uploads/generated-images 目录，以便 Docker 卷持久化
    const relativeDir = `generated-images/${userId}/${date}`;
    const absoluteDir = path.join(process.cwd(), 'uploads', relativeDir);
    const absolutePath = path.join(absoluteDir, filename);
    
    // 创建目录并保存文件
    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, Buffer.from(buffer));
    
    // 返回 API 路径（通过 /api/files 访问）
    const localUrl = `/api/image/file?path=${encodeURIComponent(`${relativeDir}/${filename}`)}`;

    logger.info('Image saved locally', { remoteUrl, localUrl, userId, path: absolutePath });
    
    return localUrl;
  } catch (error: any) {
    logger.error('Failed to download and save image', { remoteUrl, error: error.message });
    // 如果下载失败，返回原始远程URL作为后备
    return remoteUrl;
  }
}

// 获取默认 baseURL
function getDefaultBaseURL(providerId: string): string | undefined {
  switch (providerId) {
    case 'openai':
      return undefined; // OpenAI 使用 SDK 默认值
    case 'volcengine':
      return 'https://ark.cn-beijing.volces.com/api/v3';
    case 'bailian':
      return 'https://dashscope.aliyuncs.com/api/v1';
    default:
      return undefined;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    const userId = session.user.id;
    const body = await req.json();
    
    const result = imageGenerationSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.message);
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
      updateMessageId,
      // 尺寸参数
      size,
      // 其他参数
      quality,
      watermark,
      seed,
      negative_prompt,
      prompt_extend,
      enable_interleave,
      max_images,
      background,
      output_format,
      output_compression,
      input_fidelity,
      mask,
      resolution,
      response_format,
      // 前端参数映射
      sequential_mode,
      optimize_mode,
      custom_width,
      custom_height,
      grid_count,
      // 后端内部参数名（优先使用前端映射的参数）
      resolution_width: backend_resolution_width,
      resolution_height: backend_resolution_height,
      sequential_image_generation: backend_sequential_image_generation,
      optimize_prompt_options: backend_optimize_prompt_options,
    } = result.data;

    // 参数映射：前端参数名 -> 后端参数名
    const resolution_width = custom_width ?? backend_resolution_width;
    const resolution_height = custom_height ?? backend_resolution_height;
    const sequential_image_generation = sequential_mode ?? backend_sequential_image_generation;
    const optimize_prompt_options = optimize_mode ?? backend_optimize_prompt_options;
    // grid_count 映射到 max_images
    const final_max_images = grid_count ?? max_images;

    logger.debug('API received image generation params', { enable_interleave, max_images: final_max_images, model: overrideModel });

    // 合并参考图（兼容旧版单张和新版多张）
    const allReferenceImages: string[] = [];
    if (referenceImage) {
      allReferenceImages.push(referenceImage);
    }
    if (referenceImages && referenceImages.length > 0) {
      allReferenceImages.push(...referenceImages);
    }

    logger.debug("Image generation request params", {
      referenceImagesCount: allReferenceImages.length,
      overrideModel,
      overrideProvider,
      quality,
    });

    // 3. 获取用户设置
    const settings = await getUserChatSettings(userId);

    // 4. 选择提供商和模型
    const providers = settings.providers || {};
    const enabledProviderId = Object.keys(providers).find(id => providers[id].enabled);

    let selectedProviderId: string | undefined = overrideProvider || enabledProviderId || "openai";

    let selectedProviderConfig = selectedProviderId ? providers[selectedProviderId] : undefined;

    if (!selectedProviderConfig || !selectedProviderConfig.enabled) {
      selectedProviderId = enabledProviderId || "openai";
      selectedProviderConfig = enabledProviderId ? providers[enabledProviderId] : undefined;
    }

    if (!selectedProviderId || !selectedProviderConfig) {
      return badRequestResponse("未找到可用的提供商配置");
    }

    let selectedModel = overrideModel;
    if (!selectedModel) {
      // 查找支持图像生成或编辑的模型
      const imageModels = selectedProviderConfig.models?.filter(m =>
        m.modelType === "image" ||
        m.features?.includes("image_generation") ||
        m.features?.includes("image_edit")
      ) || [];
      if (imageModels.length > 0) {
        selectedModel = imageModels[0].id;
      } else {
        // 默认使用 dall-e-3
        selectedModel = "dall-e-3";
      }
    }

    // 获取模型配置以读取 avatar
    const modelConfigs = await loadModelConfigsForProvider(selectedProviderId);
    const modelConfig = modelConfigs.find(m => m.id === selectedModel);
    const selectedModelAvatar = modelConfig?.avatar;

    const apiKey = selectedProviderConfig.apiKey;
    if (!apiKey) {
      return badRequestResponse("提供商API Key未配置");
    }

    // 5. 确保会话存在
    const currentSessionId = await ensureSession(userId, sessionId, prompt, null, true);

    // 6. 先创建用户消息（保存用户的提示词）
    const userMessage = await db.message.create({
      data: {
        sessionId: currentSessionId,
        role: 'user',
        content: prompt,
        status: 'completed',
      },
    });

    // 7. 调用图像生成 API
    let remoteImages: string[] = [];
    let interleavedContent: ContentPart[] | null = null;
    const isInterleavedMode = enable_interleave === true && selectedModel?.includes('wan2.6');

    try {
      // 如果是 wan2.6 图文混排模式，使用专门的适配器方法
      if (isInterleavedMode && selectedProviderId === 'bailian') {
        const bailianAdapter = new BailianImageAdapter({
          apiKey: apiKey,
          baseURL: selectedProviderConfig.baseURL || getDefaultBaseURL(selectedProviderId),
          timeout: 120000,
        });

        interleavedContent = await bailianAdapter.generateInterleaved({
          model: selectedModel,
          provider: selectedProviderId,
          prompt,
          count,
          referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
          enable_interleave: true,
          max_images: final_max_images,
          negative_prompt,
          prompt_extend,
          watermark,
          seed,
        });

        // 提取图片 URL
        remoteImages = interleavedContent
          .filter(part => part.type === 'image' && part.image)
          .map(part => part.image!);
      } else {
        // 创建图像生成服务
        const imageService = createImageGenerationService(
          selectedModel,
          {
            providerId: selectedProviderId,
            apiKey: apiKey,
            baseURL: selectedProviderConfig.baseURL || getDefaultBaseURL(selectedProviderId),
            timeout: 120000, // 2 分钟超时
          }
        );

        // 构建图像生成请求（参数直接透传给适配器处理）
        const imageRequest = {
          model: selectedModel,
          provider: selectedProviderId,
          prompt,
          count,
          size,
          aspectRatio,
          // 参考图片
          referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
          // 通用参数
          quality,
          watermark,
          seed,
          // 特定 provider 参数（透传）
          negative_prompt,
          prompt_extend,
          enable_interleave,
          max_images: final_max_images,
          background,
          output_format,
          output_compression,
          input_fidelity,
          mask,
          resolution,
          // 尺寸参数
          resolution_width,
          resolution_height,
          // 其他参数
          sequential_image_generation,
          optimize_prompt_options,
          response_format,
        };

        // 调用图像生成
        remoteImages = await imageService.generate(imageRequest);
      }
    } catch (error: any) {
      logger.error("Image generation failed", error);
      return createErrorResponse(
        error.message || "图像生成失败",
        500,
        "IMAGE_GENERATION_ERROR"
      );
    }

    // 7. 下载并保存图片到本地
    const localImageUrls: string[] = [];
    for (const remoteUrl of remoteImages) {
      const localUrl = await downloadAndSaveImage(remoteUrl, userId);
      localImageUrls.push(localUrl);
    }

    // 8. 创建消息内容
    // 使用前端期望的格式：{type: 'image_generation', images: [], aspectRatio: '', prompt: ''}
    const imageGenerationContent = {
      type: 'image_generation' as const,
      images: localImageUrls,
      aspectRatio: aspectRatio,
      prompt: prompt,
    };

    // 创建 contentParts 用于结构化显示
    // 注意：不添加用户提示词到 contentParts，因为用户消息已经包含了提示词
    // 只在有额外文本输出（如图文混排）时才添加文本内容
    const messageContentParts: ContentPart[] = interleavedContent || localImageUrls.map(url => ({
      type: 'image' as const,
      image: url,
    }));

    // 保存模型消息到数据库，关联到用户消息
    const message = await db.message.create({
      data: {
        sessionId: currentSessionId,
        role: 'assistant',
        content: JSON.stringify(imageGenerationContent),
        contentParts: messageContentParts as any,
        provider: selectedProviderId,
        model: selectedModel,
        modelAvatar: selectedModelAvatar,
        status: 'completed',
        parentId: userMessage.id, // 关联到用户消息
      },
    });

    // 9. 更新会话最后消息预览（消息数+2，因为创建了用户消息和模型消息）
    await db.session.update({
      where: { id: currentSessionId },
      data: {
        lastMessagePreview: `[图片] ${prompt.slice(0, 50)}...`,
        lastMessageAt: new Date(),
        lastMessageRole: 'assistant',
        messageCount: {
          increment: 2, // 用户消息 + 模型消息
        },
      },
    });

    // 10. 如果有 updateMessageId，更新原消息
    if (updateMessageId) {
      await db.message.update({
        where: { id: updateMessageId },
        data: {
          status: 'completed',
        },
      });
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      sessionId: currentSessionId,
      images: localImageUrls,
      content: imageGenerationContent,
    });

  } catch (error: any) {
    logger.error("Image generation API error", error);
    return createErrorResponse(
      error.message || "服务器内部错误",
      500,
      "INTERNAL_ERROR"
    );
  }
}
