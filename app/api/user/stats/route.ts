import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorizedResponse, createErrorResponse } from "@/lib/api-error";
import { differenceInCalendarDays } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;

  try {
    // 1. 获取用户信息计算使用天数
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    if (!user) {
      return createErrorResponse("User not found", 404, "NOT_FOUND");
    }

    const usageDays = Math.max(1, differenceInCalendarDays(new Date(), user.createdAt) + 1);

    // 2. 对话数
    const sessionCount = await db.session.count({
      where: { userId }
    });

    // 3. 消息数和 Token 总数
    const messageStats = await db.message.aggregate({
      where: { session: { userId } },
      _count: { id: true },
      _sum: { totalTokens: true }
    });

    // 4. 获取所有历史消息（用于日历选择器显示可用年月）
    const allMessages = await db.message.findMany({
      where: {
        session: { userId },
        totalTokens: { gt: 0 }
      },
      select: {
        createdAt: true,
        model: true,
        totalTokens: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // 5. 每日 Token 统计 (过去 30 天，用于图表展示)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    
    const dailyMessages = await db.message.findMany({
      where: {
        session: { userId },
        createdAt: { gte: thirtyDaysAgo },
        totalTokens: { gt: 0 }
      },
      select: {
        createdAt: true,
        model: true,
        totalTokens: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // 处理所有历史数据的年月信息（用于日历选择器）
    const allYearMonths: Record<string, Set<number>> = {};
    allMessages.forEach(msg => {
      const d = new Date(msg.createdAt);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      
      if (!allYearMonths[year]) {
        allYearMonths[year] = new Set();
      }
      allYearMonths[year].add(month);
    });

    // 处理每日 Token 数据（过去30天，用于图表）
    const dailyTokenMap: Record<string, Record<string, number>> = {};
    const dailyMessageMap: Record<string, number> = {};
    
    // 初始化过去 30 天的 map，确保每天都有数据（即使是 0）
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      dailyTokenMap[dateStr] = {};
      dailyMessageMap[dateStr] = 0;
    }

    dailyMessages.forEach(msg => {
      const d = new Date(msg.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      if (dailyTokenMap[dateStr]) {
        const model = msg.model || 'unknown';
        dailyTokenMap[dateStr][model] = (dailyTokenMap[dateStr][model] || 0) + msg.totalTokens;
        dailyMessageMap[dateStr] = (dailyMessageMap[dateStr] || 0) + 1;
      }
    });

    // 转换为前端需要的格式
    const dailyTokenData = Object.entries(dailyTokenMap)
      .map(([date, models]) => ({
        date,
        ...models
      }));

    const dailyMessageData = Object.entries(dailyMessageMap)
      .map(([date, count]) => ({
        date,
        count
      }));

    // 获取所有出现过的模型名称
    const allModels = Array.from(new Set(dailyMessages.map(m => m.model || 'unknown')));

    // 转换 allYearMonths 为可序列化的格式
    const availableYearMonths: Record<number, number[]> = {};
    Object.entries(allYearMonths).forEach(([year, months]) => {
      availableYearMonths[Number(year)] = Array.from(months).sort((a, b) => a - b);
    });

    return NextResponse.json({
      success: true,
      stats: {
        usageDays,
        sessionCount,
        messageCount: messageStats._count.id,
        totalTokens: messageStats._sum.totalTokens || 0,
        dailyTokenData,
        dailyMessageData,
        allModels,
        availableYearMonths  // 新增：所有历史数据的年月信息
      }
    });
  } catch (error: any) {
    return createErrorResponse("Failed to fetch user stats", 500, "FETCH_USER_STATS_FAILED", error);
  }
}
