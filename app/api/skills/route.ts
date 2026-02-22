import { db } from "@/lib/db";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-helper";
import { badRequestResponse, createErrorResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-error";

export const dynamic = 'force-dynamic';

// GET - 获取用户的所有 skills
export async function GET(_request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const skills = await db.skill.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ skills });
  } catch (error: any) {
    return createErrorResponse("加载技能时出错", 500, "LOAD_SKILLS_ERROR", error);
  }
}

// POST - 创建 skill
const createSkillSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(128),
  description: z.string().min(1).max(1024),
  icon: z.string().optional(),
  instructions: z.string().min(1),
  resources: z.array(z.object({
    name: z.string(),
    content: z.string(),
    type: z.enum(['markdown', 'json', 'text'])
  })).optional(),
  scripts: z.array(z.object({
    name: z.string(),
    content: z.string(),
    language: z.enum(['python', 'javascript', 'bash'])
  })).optional(),
  version: z.string().default("1.0.0"),
  author: z.string().optional(),
  tags: z.array(z.string()).default([]),
  triggerKeywords: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createSkillSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const skill = await db.skill.create({
      data: {
        ...result.data,
        userId,
      },
    });

    return NextResponse.json({ skill });
  } catch (error: any) {
    return createErrorResponse("创建技能时出错", 500, "CREATE_SKILL_ERROR", error);
  }
}

// PATCH - 更新 skill
const updateSkillSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(128).optional(),
  description: z.string().min(1).max(1024).optional(),
  icon: z.string().optional(),
  instructions: z.string().optional(),
  resources: z.array(z.object({
    name: z.string(),
    content: z.string(),
    type: z.enum(['markdown', 'json', 'text'])
  })).optional(),
  scripts: z.array(z.object({
    name: z.string(),
    content: z.string(),
    language: z.enum(['python', 'javascript', 'bash'])
  })).optional(),
  version: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  triggerKeywords: z.array(z.string()).optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = updateSkillSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { id, ...updateData } = result.data;

    const skill = await db.skill.findFirst({
      where: { id, userId }
    });

    if (!skill) {
      return notFoundResponse("技能未找到或无权操作");
    }

    const updatedSkill = await db.skill.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ skill: updatedSkill });
  } catch (error: any) {
    return createErrorResponse("更新技能时出错", 500, "UPDATE_SKILL_ERROR", error);
  }
}

// DELETE - 删除 skill
export async function DELETE(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return badRequestResponse("缺少 id 参数");
    }

    const skill = await db.skill.findFirst({
      where: { id, userId }
    });

    if (!skill) {
      return notFoundResponse("技能未找到或无权操作");
    }

    await db.skill.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse("删除技能时出错", 500, "DELETE_SKILL_ERROR", error);
  }
}
