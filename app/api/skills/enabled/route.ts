import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";

export const dynamic = 'force-dynamic';

// GET - 获取用户启用的所有 skills
export async function GET(_request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const skills = await db.skill.findMany({
      where: { 
        userId,
        isEnabled: true 
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ skills });
  } catch (error: any) {
    return createErrorResponse("加载启用的技能时出错", 500, "LOAD_ENABLED_SKILLS_ERROR", error);
  }
}
