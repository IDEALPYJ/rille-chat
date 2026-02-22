import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";
import { logger } from "./logger";

const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS.split(",").map(origin => origin.trim());

/**
 * 处理 CORS 请求
 * 提取 CORS 逻辑为独立函数，提高可维护性
 */
export function handleCORS(req: NextRequest, response: NextResponse): NextResponse {
  const requestOrigin = req.headers.get("origin");
  let origin: string | null = null;

  // 生产环境：严格验证
  if (env.NODE_ENV === "production") {
    if (ALLOWED_ORIGINS.includes("*")) {
      logger.error("Security: ALLOWED_ORIGINS cannot be '*' in production. CORS request rejected.", undefined, {
        nodeEnv: env.NODE_ENV,
        allowedOrigins: env.ALLOWED_ORIGINS,
        pathname: req.nextUrl.pathname,
        requestOrigin: requestOrigin
      });
      origin = null;
    } else if (requestOrigin) {
      try {
        const originUrl = new URL(requestOrigin);
        if (originUrl.protocol !== 'https:') {
          logger.warn("CORS: Non-HTTPS origin rejected in production", { origin: requestOrigin });
          origin = null;
        } else if (ALLOWED_ORIGINS.includes(requestOrigin)) {
          origin = requestOrigin;
        } else {
          logger.warn("CORS: Unauthorized origin attempt", {
            origin: requestOrigin,
            allowedOrigins: ALLOWED_ORIGINS
          });
          origin = null;
        }
      } catch {
        logger.warn("CORS: Invalid origin format", { origin: requestOrigin });
        origin = null;
      }
    }
  } else {
    // 开发环境：宽松验证
    if (ALLOWED_ORIGINS.includes("*")) {
      origin = requestOrigin || "*";
    } else if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
      origin = requestOrigin;
    } else if (ALLOWED_ORIGINS.length > 0) {
      origin = ALLOWED_ORIGINS[0] !== "*" ? ALLOWED_ORIGINS[0] : null;
    }
  }

  // 设置 CORS 头
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");

    // 添加安全头
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return response;
}

