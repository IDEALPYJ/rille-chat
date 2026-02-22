import { db } from "@/lib/db";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-helper";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { detectSkills } from "@/lib/skills/skill-detector";

export const dynamic = 'force-dynamic';

// POST - 检测用户输入触发的 skills
const detectSchema = z.object({
  input: z.string().min(1),
  threshold: z.number().min(0).max(1).optional(),
  maxSkills: z.number().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = detectSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { input, threshold, maxSkills } = result.data;

    // 获取用户启用的所有 skills
    const skills = await db.skill.findMany({
      where: { 
        userId,
        isEnabled: true 
      },
    });

    // 检测触发的 skills
    const triggeredSkills = detectSkills(input, skills, { 
      threshold, 
      maxSkills 
    });

    return NextResponse.json({ 
      triggeredSkills,
      totalSkills: skills.length 
    });
  } catch (error: any) {
    return createErrorResponse("检测技能时出错", 500, "DETECT_SKILLS_ERROR", error);
  }
}
