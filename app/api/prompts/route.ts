import { db } from "@/lib/db";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-helper";
import { badRequestResponse, createErrorResponse, notFoundResponse, unauthorizedResponse } from "@/lib/api-error";

export const dynamic = 'force-dynamic';

export async function GET(_request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const prompts = await db.prompt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ prompts });
  } catch (error: any) {
    return createErrorResponse("加载提示词时出错", 500, "LOAD_PROMPTS_ERROR", error);
  }
}

const createPromptSchema = z.object({
  title: z.string().min(1, "缺少标题"),
  content: z.string().min(1, "缺少内容"),
  icon: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createPromptSchema.safeParse(body);
    if (!result.success) {
      return badRequestResponse(result.error.issues[0].message);
    }

    const { title, content, icon } = result.data;

    const prompt = await db.prompt.create({
      data: {
        title,
        content,
        icon,
        userId,
      },
    });

    return NextResponse.json({ prompt });
  } catch (error: any) {
    return createErrorResponse("创建提示词时出错", 500, "CREATE_PROMPT_ERROR", error);
  }
}

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

    const prompt = await db.prompt.findFirst({
      where: { id, userId }
    });

    if (!prompt) {
      return notFoundResponse("提示词未找到或无权操作");
    }

    await db.prompt.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse("删除提示词时出错", 500, "DELETE_PROMPT_ERROR", error);
  }
}

const updatePromptSchema = z.object({
  id: z.string().min(1, "缺少 id 参数"),
  title: z.string().optional(),
  content: z.string().optional(),
  icon: z.string().optional(),
});

export async function PATCH(request: Request) {
    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        return unauthorizedResponse();
      }
  
      const body = await request.json();
      const result = updatePromptSchema.safeParse(body);
      if (!result.success) {
        return badRequestResponse(result.error.issues[0].message);
      }

      const { id, title, content, icon } = result.data;
  
      const prompt = await db.prompt.findFirst({
        where: { id, userId }
      });
  
      if (!prompt) {
        return notFoundResponse("提示词未找到或无权操作");
      }
  
      const updatedPrompt = await db.prompt.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          content: content !== undefined ? content : undefined,
          icon: icon !== undefined ? icon : undefined,
        },
      });
  
      return NextResponse.json({ prompt: updatedPrompt });
    } catch (error: any) {
      return createErrorResponse("更新提示词时出错", 500, "UPDATE_PROMPT_ERROR", error);
    }
  }