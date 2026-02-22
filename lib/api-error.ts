import { NextResponse } from "next/server";
import { logger } from "./logger";
import { env } from "./env";

/**
 * 统一的错误响应格式
 */
export interface ErrorResponse {
  error: string | Record<string, unknown> | Array<unknown>;
  code?: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
}

/**
 * 创建统一的错误响应
 * @param message 错误信息（或者是 Zod 错误对象等）
 * @param status HTTP 状态码
 * @param code 内部错误码
 * @param error 原始错误对象（用于日志记录，不会返回给客户端）
 */
export function createErrorResponse(
  message: string | Record<string, unknown> | Array<unknown>,
  status: number = 500,
  code?: string,
  error?: unknown,
  options?: { translationKey?: string; translationParams?: Record<string, string | number> }
) {
  const isProd = env.NODE_ENV === "production";
  
  // 记录结构化日志
  const logMessage = typeof message === 'string' ? message : (code || 'API Error');
  if (status >= 500) {
    logger.error(`[${status}] ${logMessage}`, error || (typeof message === 'object' ? undefined : message), { code, status });
  } else {
    logger.warn(`[${status}] ${logMessage}`, { code, status, details: error || message });
  }

  // 在生产环境中隐藏详细的内部服务器错误信息
  let displayMessage: string | Record<string, unknown> | Array<unknown>;
  if (isProd && status === 500) {
    displayMessage = "内部服务器错误，请稍后再试";
  } else {
    displayMessage = message;
  }

  const response: ErrorResponse = {
    error: displayMessage,
    code: code,
  };

  // 添加翻译键支持
  if (options?.translationKey) {
    response.translationKey = options.translationKey;
    if (options.translationParams) {
      response.translationParams = options.translationParams;
    }
  }

  return NextResponse.json(response, { status });
}

/**
 * 401 未授权响应
 */
export function unauthorizedResponse(message: string = "未授权") {
  return createErrorResponse(message, 401, "UNAUTHORIZED");
}

/**
 * 403 禁止访问响应
 */
export function forbiddenResponse(message: string = "禁止访问") {
  return createErrorResponse(message, 403, "FORBIDDEN");
}

/**
 * 404 资源未找到响应
 */
export function notFoundResponse(message: string = "资源未找到", options?: { translationKey?: string; translationParams?: Record<string, string | number> }) {
  return createErrorResponse(message, 404, "NOT_FOUND", undefined, options);
}

/**
 * 400 请求参数错误响应
 */
export function badRequestResponse(message: string = "请求参数错误", options?: { translationKey?: string; translationParams?: Record<string, string | number> }) {
  return createErrorResponse(message, 400, "BAD_REQUEST", undefined, options);
}

/**
 * 409 冲突响应（如用户已存在）
 */
export function conflictResponse(message: string = "资源已存在", options?: { translationKey?: string; translationParams?: Record<string, string | number> }) {
  return createErrorResponse(message, 409, "CONFLICT", undefined, options);
}

/**
 * 500 服务器错误响应
 * @param message 错误信息
 * @param error 原始错误对象
 */
export function internalServerErrorResponse(message: string = "服务器错误", error?: unknown) {
  return createErrorResponse(message, 500, "INTERNAL_SERVER_ERROR", error);
}
