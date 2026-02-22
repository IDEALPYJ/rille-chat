import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { badRequestResponse, conflictResponse, createErrorResponse } from "@/lib/api-error";
import { rateLimit, rateLimiters } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/auth/password-validation";
import { logger } from "@/lib/logger";

// 定义注册数据的验证规则
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  password: z.string().min(8, "密码至少8个字符"),
});

export async function POST(req: NextRequest) {
  // Rate limiting for registration (strict to prevent abuse)
  const rateLimitResponse = await rateLimit(req, rateLimiters.strict);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  try {
    const body = await req.json();
    
    // 1. 验证数据格式
    let username: string;
    let password: string;
    try {
      const parsed = registerSchema.parse(body);
      username = parsed.username;
      password = parsed.password;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(e => {
          if (e.path[0] === 'username') {
            return `用户名：${e.message}`;
          }
          if (e.path[0] === 'password') {
            return `密码：${e.message}`;
          }
          return e.message;
        });
        return badRequestResponse(
          `输入验证失败：${errors.join('；')}`,
          { translationKey: "auth.validationError" }
        );
      }
      throw error;
    }

    // 2. 验证用户名格式（额外检查）
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return badRequestResponse(
        "用户名至少需要3个字符",
        { translationKey: "auth.usernameTooShort" }
      );
    }
    if (trimmedUsername.length > 50) {
      return badRequestResponse(
        "用户名不能超过50个字符",
        { translationKey: "auth.usernameTooLong" }
      );
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(trimmedUsername)) {
      return badRequestResponse(
        "用户名只能包含字母、数字、下划线和中文",
        { translationKey: "auth.usernameInvalidChars" }
      );
    }

    // 3. 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return badRequestResponse(
        passwordValidation.errors.join('；'),
        { translationKey: "auth.passwordWeak" }
      );
    }

    // 4. 检查用户是否已存在
    const existingUser = await db.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existingUser) {
      return conflictResponse(
        "该用户名已被使用，请选择其他用户名",
        { translationKey: "auth.usernameTaken" }
      );
    }

    // 5. 密码加密
    let hashedPassword: string;
    try {
      hashedPassword = await hash(password, 10);
    } catch (error: unknown) {
      logger.error("Password hashing failed", error, { username: trimmedUsername });
      return createErrorResponse(
        "密码加密失败，请稍后重试",
        500,
        "PASSWORD_HASH_FAILED",
        error
      );
    }

    // 6. 创建用户
    let user;
    try {
      user = await db.user.create({
        data: {
          username: trimmedUsername,
          password: hashedPassword,
        },
      });
    } catch (error: unknown) {
      // 处理数据库错误
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string; meta?: { target?: string[] } };
        if (dbError.code === 'P2002') {
          // 唯一约束冲突（虽然已经检查过，但并发情况下仍可能发生）
          return conflictResponse(
            "该用户名已被使用，请选择其他用户名",
            { translationKey: "auth.usernameTaken" }
          );
        }
      }
      logger.error("User creation failed", error, { username: trimmedUsername });
      return createErrorResponse(
        "创建用户失败，请稍后重试",
        500,
        "USER_CREATION_FAILED",
        error
      );
    }

    // 为了安全，不返回密码
    const { password: _, ...userWithoutPassword } = user;

    logger.info("User registered successfully", { userId: user.id, username: trimmedUsername });

    return NextResponse.json(
      { 
        user: userWithoutPassword, 
        message: "注册成功",
        translationKey: "auth.registerSuccess"
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    logger.error("Registration failed", error, {});
    return createErrorResponse(
      "注册失败，请稍后重试",
      500,
      "REGISTER_FAILED",
      error
    );
  }
}