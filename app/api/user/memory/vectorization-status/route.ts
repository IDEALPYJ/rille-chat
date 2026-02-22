import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import {
  getVectorizationStats,
  getUnvectorizedCount,
} from "@/lib/chat/memory/batch-vectorization";

/**
 * GET /api/user/memory/vectorization-status
 * 获取向量化状态统计
 */
export async function GET(_req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const stats = await getVectorizationStats(userId);
    const unvectorizedCount = await getUnvectorizedCount(userId);

    return NextResponse.json({
      stats,
      unvectorizedCount,
    });
  } catch (error) {
    return createErrorResponse(
      "Failed to fetch vectorization status",
      500,
      undefined,
      error
    );
  }
}
