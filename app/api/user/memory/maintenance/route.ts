import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/user/memory/maintenance
 * 执行记忆维护任务（归档过期、清理低质量、合并重复）
 */
export async function POST(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { 
      archiveUnusedDays = 90, 
      minLength = 10,
      mergeThreshold: _mergeThreshold = 0.92 
    } = body;

    const result = {
      archived: 0,
      merged: 0,
      cleaned: 0,
      reasons: {} as Record<string, number>,
    };

    // 1. 归档过期记忆
    const archived = await db.$executeRaw`
      UPDATE "Memory"
      SET "status" = 'archived', "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "status" = 'active'
        AND "importance" <= 2
        AND "frequency" <= 1
        AND "last_accessed" < NOW() - INTERVAL '${archiveUnusedDays} days'
    `;
    result.archived = archived;
    if (archived > 0) result.reasons['stale'] = archived;

    // 2. 清理过短的记忆
    const cleaned = await db.$executeRaw`
      UPDATE "Memory"
      SET "status" = 'archived', "updatedAt" = NOW()
      WHERE "userId" = ${userId}
        AND "status" IN ('active', 'candidate')
        AND LENGTH(content) < ${minLength}
    `;
    result.cleaned = cleaned;
    if (cleaned > 0) result.reasons['low_quality'] = cleaned;

    // 3. 合并重复记忆（简化版，只处理完全相同的）
    const duplicates = await db.$queryRaw<
      Array<{ content: string; count: number; ids: string[] }>
    >`
      SELECT content, COUNT(*) as count, array_agg(id) as ids
      FROM "Memory"
      WHERE "userId" = ${userId}
        AND "status" = 'active'
      GROUP BY content
      HAVING COUNT(*) > 1
      LIMIT 10
    `;

    let merged = 0;
    for (const dup of duplicates) {
      const ids = dup.ids;
      if (ids.length > 1) {
        // 保留第一个，归档其余
        const [keepId, ...archiveIds] = ids;
        await db.$executeRaw`
          UPDATE "Memory"
          SET "frequency" = "frequency" + ${archiveIds.length},
              "updatedAt" = NOW()
          WHERE id = ${keepId}
        `;
        await db.$executeRaw`
          UPDATE "Memory"
          SET "status" = 'archived', "updatedAt" = NOW()
          WHERE id IN (${archiveIds.join(',')})
        `;
        merged += archiveIds.length;
      }
    }
    result.merged = merged;
    if (merged > 0) result.reasons['duplicate'] = merged;

    logger.info("Memory maintenance completed", { userId, ...result });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error("Memory maintenance failed", { error, userId });
    return createErrorResponse("Maintenance failed", 500, undefined, error);
  }
}

/**
 * GET /api/user/memory/stats
 * 获取记忆统计信息
 */
export async function GET(_req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    // 统计各状态的记忆数量
    const statusStats = await db.$queryRaw<
      Array<{ status: string; count: number }>
    >`
      SELECT status, COUNT(*) as count
      FROM "Memory"
      WHERE "userId" = ${userId}
      GROUP BY status
    `;

    // 统计各分类的记忆数量
    const rootStats = await db.$queryRaw<
      Array<{ root: string; count: number }>
    >`
      SELECT COALESCE(root, 'Unknown') as root, COUNT(*) as count
      FROM "Memory"
      WHERE "userId" = ${userId}
        AND "status" IN ('active', 'candidate')
      GROUP BY root
    `;

    // 统计向量化情况
    const vectorStats = await db.$queryRaw<
      Array<{ hasVector: boolean; count: number }>
    >`
      SELECT "embedding_vector" IS NOT NULL as hasVector, COUNT(*) as count
      FROM "Memory"
      WHERE "userId" = ${userId}
        AND "status" IN ('active', 'candidate')
      GROUP BY "embedding_vector" IS NOT NULL
    `;

    // 统计缓存情况
    const cacheStats = await db.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*) as count
      FROM "EmbeddingCache"
    `;

    return NextResponse.json({
      stats: {
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s.status]: Number(s.count) }), {}),
        byRoot: rootStats.reduce((acc, s) => ({ ...acc, [s.root]: Number(s.count) }), {}),
        vectorized: vectorStats.find(v => v.hasVector)?.count || 0,
        unvectorized: vectorStats.find(v => !v.hasVector)?.count || 0,
        cacheEntries: Number(cacheStats[0]?.count || 0),
      },
    });
  } catch (error) {
    logger.error("Failed to get memory stats", { error, userId });
    return createErrorResponse("Failed to get stats", 500, undefined, error);
  }
}
