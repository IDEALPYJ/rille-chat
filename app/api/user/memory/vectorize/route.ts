import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import {
  batchVectorizeMemories,
  vectorizeSingleMemory,
  VectorizationResult,
} from "@/lib/chat/memory/batch-vectorization";
import { getUserChatSettings } from "@/lib/chat/auth-helper";

/**
 * POST /api/user/memory/vectorize
 * 执行批量或单条向量化
 */
export async function POST(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { memoryIds, batch = false } = body;

    // 获取用户设置中的 embedding 模型
    const settings = await getUserChatSettings(userId);
    const embeddingModel = settings?.memory?.embeddingModel;

    if (!embeddingModel) {
      return createErrorResponse("Embedding model not configured", 400);
    }

    // 准备 providers 配置
    const allProviders = settings?.providers || {};

    let result: VectorizationResult;

    if (batch) {
      // 批量向量化所有未向量化的记忆
      result = await batchVectorizeMemories({
        userId,
        embeddingModel,
        providers: allProviders,
      });
    } else if (memoryIds && Array.isArray(memoryIds) && memoryIds.length > 0) {
      // 向量化指定的记忆
      result = {
        total: memoryIds.length,
        success: 0,
        failed: 0,
        failedIds: [],
      };

      for (const memoryId of memoryIds) {
        // 获取记忆内容
        const { db } = await import("@/lib/db");
        const memory = await db.memory.findUnique({
          where: { id: memoryId },
          select: { id: true, content: true },
        });

        if (!memory || memory.content === null) {
          result.failed++;
          result.failedIds.push(memoryId);
          continue;
        }

        const success = await vectorizeSingleMemory(
          memoryId,
          memory.content,
          embeddingModel,
          allProviders
        );

        if (success) {
          result.success++;
        } else {
          result.failed++;
          result.failedIds.push(memoryId);
        }
      }
    } else {
      return createErrorResponse(
        "Invalid request: provide memoryIds or set batch=true",
        400
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return createErrorResponse(
      "Failed to vectorize memories",
      500,
      undefined,
      error
    );
  }
}
