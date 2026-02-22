import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorizedResponse, badRequestResponse, createErrorResponse } from "@/lib/api-error";

/**
 * 获取项目的文件列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return unauthorizedResponse();
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return badRequestResponse("projectId is required");
    }

    // 验证项目所有权
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return unauthorizedResponse();
    }

    // 获取项目文件
    const files = await db.file.findMany({
      where: {
        projectId: projectId,
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        url: true,
        type: true,
        size: true,
        status: true,
        tokens: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ files });
  } catch (error: any) {
    return createErrorResponse("Failed to fetch project files", 500, "FETCH_FILES_ERROR", error);
  }
}

