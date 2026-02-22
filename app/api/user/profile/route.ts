import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unauthorizedResponse, badRequestResponse, createErrorResponse } from "@/lib/api-error";

/**
 * 获取当前用户信息
 */
export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        username: true,
        image: true,
        role: true,
      }
    });

    if (!user) {
      return createErrorResponse("User not found", 404, "NOT_FOUND");
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        image: user.image,
        role: user.role,
      }
    });
  } catch (error: unknown) {
    return createErrorResponse("Failed to fetch profile", 500, "FETCH_PROFILE_FAILED", error);
  }
}

/**
 * 更新用户信息 (用户名, 头像)
 */
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { name, image } = body;

    // 验证请求体
    if (!body || typeof body !== 'object') {
      return badRequestResponse("Invalid request body");
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (name !== undefined) {
      // 验证 name 是字符串
      if (typeof name !== 'string') {
        return badRequestResponse("Username must be a string");
      }
      
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return badRequestResponse("Username must be at least 2 characters");
      }
      
      // 检查用户名是否已存在
      const existingUser = await db.user.findFirst({
        where: {
          username: trimmedName,
          NOT: { id: session.user.id }
        }
      });
      
      if (existingUser) {
        return badRequestResponse("Username already taken");
      }
      
      updateData.username = trimmedName;
    }
    
    if (image !== undefined) {
      // 验证 image 是字符串或 null
      if (image !== null && typeof image !== 'string') {
        return badRequestResponse("Image must be a string or null");
      }
      updateData.image = image;
    }

    if (Object.keys(updateData).length === 0) {
      return badRequestResponse("No fields to update");
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        image: updatedUser.image,
      }
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const errorCode = error.code;
      if (errorCode === 'P2002') {
        return badRequestResponse("Username already taken");
      }
      if (errorCode === 'P2025') {
        return createErrorResponse("User not found", 404, "USER_NOT_FOUND", error);
      }
    }
    return createErrorResponse("Profile update failed", 500, "PROFILE_UPDATE_FAILED", error);
  }
}
