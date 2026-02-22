import { NextRequest, NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorizedResponse, badRequestResponse, createErrorResponse } from "@/lib/api-error";
import { validatePassword } from "@/lib/auth/password-validation";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse("请先登录");
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // 验证请求体
    if (!body || typeof body !== 'object') {
      return badRequestResponse("请求参数格式错误");
    }

    if (!currentPassword || typeof currentPassword !== 'string') {
      return badRequestResponse(
        "请输入当前密码",
        { translationKey: "userApi.currentPasswordRequired" }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return badRequestResponse(
        "请输入新密码",
        { translationKey: "userApi.newPasswordRequired" }
      );
    }

    // 检查新密码是否与当前密码相同
    if (currentPassword === newPassword) {
      return badRequestResponse(
        "新密码不能与当前密码相同",
        { translationKey: "userApi.passwordSameAsCurrent" }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      logger.error("User not found when updating password", null, { userId: session.user.id });
      return createErrorResponse(
        "用户不存在，请重新登录",
        404,
        "USER_NOT_FOUND"
      );
    }

    // 验证当前密码
    let isPasswordValid: boolean;
    try {
      isPasswordValid = await compare(currentPassword, user.password);
    } catch (error: unknown) {
      logger.error("Password comparison failed", error, { userId: session.user.id });
      return createErrorResponse(
        "密码验证失败，请稍后重试",
        500,
        "PASSWORD_COMPARE_FAILED",
        error
      );
    }

    if (!isPasswordValid) {
      return badRequestResponse(
        "当前密码错误，请重新输入",
        { translationKey: "userApi.currentPasswordIncorrect" }
      );
    }

    // 验证新密码强度
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return badRequestResponse(
        passwordValidation.errors.join('；'),
        { translationKey: "userApi.passwordWeak" }
      );
    }

    // 哈希新密码
    let hashedNewPassword: string;
    try {
      hashedNewPassword = await hash(newPassword, 10);
    } catch (error: unknown) {
      logger.error("Password hashing failed", error, { userId: session.user.id });
      return createErrorResponse(
        "密码加密失败，请稍后重试",
        500,
        "PASSWORD_HASH_FAILED",
        error
      );
    }

    // 更新密码
    try {
      await db.user.update({
        where: { id: session.user.id },
        data: { password: hashedNewPassword },
      });
    } catch (error: unknown) {
      logger.error("Password update failed", error, { userId: session.user.id });
      return createErrorResponse(
        "密码更新失败，请稍后重试",
        500,
        "PASSWORD_UPDATE_FAILED",
        error
      );
    }

    logger.info("Password updated successfully", { userId: session.user.id });

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
      translationKey: "userApi.passwordChangedSuccess",
    });
  } catch (error: unknown) {
    logger.error("Password update request failed", error, { userId: session.user?.id });
    return createErrorResponse(
      "密码修改失败，请稍后重试",
      500,
      "PASSWORD_UPDATE_FAILED",
      error
    );
  }
}
