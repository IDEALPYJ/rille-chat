import { NextRequest, NextResponse } from "next/server";
import { getChatUser } from "@/lib/chat/auth-helper";
import { db } from "@/lib/db";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const _projectId = searchParams.get("projectId") || undefined;
    
    // Fetch user's memories
    // If projectId is provided, fetch project-specific memories + global memories?
    // Or just fetch all user memories and let frontend filter?
    // Let's fetch all for the management UI, maybe with pagination if needed.
    // For now, just fetch all.
    
    const memories = await db.memory.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ memories });
  } catch (error) {
    return createErrorResponse("Failed to fetch memories", 500, undefined, error);
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return createErrorResponse("Memory ID is required", 400);
    }

    // Verify ownership
    const memory = await db.memory.findUnique({
      where: { id },
    });

    if (!memory || memory.userId !== userId) {
      return createErrorResponse("Memory not found or unauthorized", 404);
    }

    await db.memory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse("Failed to delete memory", 500, undefined, error);
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getChatUser();
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const { id, content } = await req.json();
    if (!id || !content) {
      return createErrorResponse("Memory ID and content are required", 400);
    }

    const memory = await db.memory.findUnique({
      where: { id },
    });

    if (!memory || memory.userId !== userId) {
      return createErrorResponse("Memory not found or unauthorized", 404);
    }

    await db.memory.update({
      where: { id },
      data: {
        content,
        tokens: Math.ceil(content.length / 4),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse("Failed to update memory", 500, undefined, error);
  }
}