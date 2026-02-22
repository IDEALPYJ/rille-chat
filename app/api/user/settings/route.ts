import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

import { decrypt, encrypt } from "@/lib/encrypt";
import { NextResponse } from "next/server";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const settings = await db.userSetting.findUnique({
      where: { userId },
    });

    if (settings) {
      try {
        // Ensure config is a string before decrypting
        // Prisma Json type can be string, number, boolean, object, array or null
        const configStr = typeof settings.config === 'string'
          ? settings.config
          : JSON.stringify(settings.config);

        // If it's an empty object string (default) or null/undefined, return empty
        if (!configStr || configStr === '{}' || configStr === 'null') {
           return NextResponse.json({});
        }

        const decryptedConfig = decrypt(configStr);
        const parsedConfig = JSON.parse(decryptedConfig);
        return NextResponse.json(parsedConfig);
      } catch (e) {
        // If decryption fails, it's likely due to a key change or invalid format.
        // Log the error with more details
        const error = e instanceof Error ? e : new Error(String(e));
        logger.error("Settings decryption failed, returning empty config", error, {
          userId,
          errorMessage: error.message,
          errorName: error.name,
        });
        return NextResponse.json({});
      }
    }
    return NextResponse.json({});
  } catch (error) {
    // Enhanced error logging for database connection issues
    const dbError = error instanceof Error ? error : new Error(String(error));
    const errorCode = 'code' in dbError ? String(dbError.code) : undefined;
    logger.error("Failed to fetch settings from database", dbError, {
      userId,
      errorCode,
      errorMessage: dbError.message,
    });
    return createErrorResponse("Failed to fetch settings", 500, "FETCH_SETTINGS_FAILED", error);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const config = await req.json();
    
    // Simple validation for settings object
    if (typeof config !== 'object' || config === null) {
      return createErrorResponse("Invalid settings format", 400, "INVALID_SETTINGS");
    }

    // Validate database connection and attempt to save
    try {
      // First, verify that the user exists in the database
      // This prevents foreign key constraint errors
      const userExists = await db.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        logger.error("User not found in database when saving settings", null, {
          userId,
          sessionUserId: session?.user?.id,
          sessionUsername: session?.user?.username,
        });
        return createErrorResponse(
          "用户记录不存在，请重新登录",
          404,
          "USER_NOT_FOUND",
          { userId },
          { translationKey: "userApi.userNotFound" }
        );
      }

      // Encrypt the config - this will throw if ENCRYPTION_KEY is missing or invalid
      let encryptedConfig: string;
      try {
        encryptedConfig = encrypt(JSON.stringify(config));
      } catch (encryptError) {
        const error = encryptError instanceof Error ? encryptError : new Error(String(encryptError));
        logger.error("Encryption failed when saving settings", error, {
          userId,
          errorMessage: error.message,
        });
        return createErrorResponse(
          `加密失败: ${error.message || 'ENCRYPTION_KEY 未配置或无效'}`,
          500,
          "ENCRYPTION_FAILED",
          error,
          { 
            translationKey: "userApi.encryptionFailed",
            translationParams: { error: error.message || "ENCRYPTION_KEY 未配置或无效" }
          }
        );
      }
      
      // Prisma JSON field accepts: string, number, boolean, null, object, or array
      // We pass the encrypted string directly, and Prisma will handle it
      await db.userSetting.upsert({
        where: { userId },
        update: {
          config: encryptedConfig as unknown as Prisma.InputJsonValue,
        },
        create: {
          userId,
          config: encryptedConfig as unknown as Prisma.InputJsonValue,
        },
      });

      logger.info(`Settings saved successfully for user ${userId}`);
      return NextResponse.json({ success: true });
    } catch (dbError) {
      // Enhanced database error logging
      const error = dbError instanceof Error ? dbError : new Error(String(dbError));
      const errorCode = 'code' in error ? String(error.code) : undefined;
      const errorName = error.name;
      const errorStack = error.stack;
      
      logger.error("Database operation failed when saving settings", error, {
        userId,
        errorCode,
        errorMessage: error.message,
        errorName,
        errorStack,
      });
      
      // Check for specific database errors
      if (errorCode === 'P2002') {
        return createErrorResponse("Settings already exist for this user", 409, "SETTINGS_CONFLICT", error);
      }
      if (errorCode === 'P2003') {
        // Foreign key constraint failed - user doesn't exist
        return createErrorResponse(
          "用户记录不存在，请重新登录",
          404,
          "USER_NOT_FOUND",
          error,
          { translationKey: "userApi.userNotFound" }
        );
      }
      if (errorCode === 'P2025') {
        return createErrorResponse("User not found", 404, "USER_NOT_FOUND", error);
      }
      
      // Database connection errors
      if (errorCode === 'P1001' || error.message?.includes('Can\'t reach database')) {
        return createErrorResponse(
          "数据库连接失败，请检查数据库配置",
          500,
          "DATABASE_CONNECTION_FAILED",
          error,
          { translationKey: "userApi.databaseConnectionFailed" }
        );
      }
      
      // Return detailed error in development, generic in production
      const { env: serverEnv } = await import("@/lib/env");
      const isDev = serverEnv.NODE_ENV !== 'production';
      const errorMessage = isDev 
        ? `数据库操作失败: ${error.message || '未知错误'} (Code: ${errorCode || 'N/A'})`
        : "保存设置失败，请稍后重试";
      
      return createErrorResponse(
        errorMessage, 
        500, 
        "DATABASE_OPERATION_FAILED", 
        error,
        { 
          translationKey: isDev ? "userApi.databaseOperationFailed" : "userApi.saveSettingsFailed",
          translationParams: isDev ? { error: error.message || "未知错误", code: errorCode || "N/A" } : undefined
        }
      );
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return createErrorResponse("Invalid JSON in request body", 400, "INVALID_JSON", error);
    }
    
    // Handle encryption errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('ENCRYPTION_KEY') || errorMessage.includes('encrypt')) {
      const err = error instanceof Error ? error : new Error(errorMessage);
      logger.error("Encryption failed when saving settings", err);
      return createErrorResponse("Configuration error: encryption service unavailable", 500, "ENCRYPTION_FAILED", err);
    }
    
    const err = error instanceof Error ? error : new Error(errorMessage);
    return createErrorResponse("Failed to save settings", 500, "SAVE_SETTINGS_FAILED", err);
  }
}
