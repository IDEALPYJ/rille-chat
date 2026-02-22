/**
 * Embedding模型连通性测试API
 * 发送一个很短的字符串，接收返回的向量
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";
import { createEmbeddingService } from "@/lib/embedding/embedding-service";
import { EmbeddingConfig } from "@/lib/embedding/types";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { provider, apiKey, model, baseURL } = body;

    if (!apiKey) {
      return badRequestResponse("API Key is required");
    }

    if (!model) {
      return badRequestResponse("Model is required");
    }

    // 创建embedding配置
    const config: EmbeddingConfig = {
      provider,
      model,
      apiKey,
      baseURL,
    };

    // 创建embedding服务
    const service = createEmbeddingService(config);

    // 发送一个很短的测试字符串
    const testText = "test";
    const embedding = await service.getEmbedding(testText);

    // 验证返回的向量
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding response: empty or invalid vector");
    }

    logger.info("Embedding connectivity test successful", {
      provider,
      model,
      vectorDimensions: embedding.length,
    });

    return NextResponse.json({
      success: true,
      vectorDimensions: embedding.length,
    });
  } catch (error: any) {
    logger.error("Embedding connectivity test failed", {
      error: error.message,
      stack: error.stack,
    });

    let errorMessage = error.message;
    if (error.response) {
      try {
        const errorData = await error.response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      }
    }

    return createErrorResponse(
      `Embedding连通性测试失败: ${errorMessage}`,
      500,
      "EMBEDDING_CHECK_FAILED",
      error
    );
  }
}

