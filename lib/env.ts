import { z } from 'zod';
import { logger } from './logger';

// 检查是否在构建阶段
// Next.js 在构建阶段会设置 NEXT_PHASE 环境变量
// 或者在构建时，如果 NODE_ENV 是 production 但缺少必需的环境变量，可能是构建阶段
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    (typeof process !== 'undefined' && 
                     process.env.NODE_ENV === 'production' && 
                     typeof process.env.AUTH_SECRET === 'undefined' && 
                     typeof process.env.DATABASE_URL === 'undefined' && 
                     typeof process.env.ENCRYPTION_KEY === 'undefined');

// 在构建时提供占位符值以避免验证失败
const envForValidation = {
  ...process.env,
  AUTH_SECRET: isBuildTime && !process.env.AUTH_SECRET 
    ? 'build-time-placeholder-32-chars-min' 
    : process.env.AUTH_SECRET,
  DATABASE_URL: isBuildTime && !process.env.DATABASE_URL
    ? 'postgresql://build-time-placeholder'
    : process.env.DATABASE_URL,
  ENCRYPTION_KEY: isBuildTime && !process.env.ENCRYPTION_KEY
    ? 'build-time-placeholder-must-be-at-least-32-characters-long'
    : process.env.ENCRYPTION_KEY,
};

const envSchema = z.object({
  // Auth
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(), // 生产环境建议设置
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters"),

  // Redis (可选，用于分布式限流)
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().optional().default("*"),

  // Node Environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Public URL (用于构建完整的公开 URL，如图片、视频等)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  
  // AI Provider Keys (可选，运行时校验)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

const _env = envSchema.safeParse(envForValidation);

if (!_env.success) {
  logger.error("Invalid environment variables", undefined, { errors: _env.error.format() });
  throw new Error("Invalid environment variables");
}

// 在运行时验证占位符值（如果是占位符，说明没有正确设置环境变量）
if (!isBuildTime) {
  if (_env.data.AUTH_SECRET === 'build-time-placeholder-32-chars-min') {
    throw new Error("AUTH_SECRET is required but not set. Please set it as an environment variable.");
  }
  if (_env.data.DATABASE_URL === 'postgresql://build-time-placeholder') {
    throw new Error("DATABASE_URL is required but not set. Please set it as an environment variable.");
  }
  if (_env.data.ENCRYPTION_KEY === 'build-time-placeholder-must-be-at-least-32-characters-long') {
    throw new Error("ENCRYPTION_KEY is required but not set. Please set it as an environment variable.");
  }
}

// Validate CORS configuration after parsing
if (_env.data.NODE_ENV === "production" && _env.data.ALLOWED_ORIGINS === "*") {
  const errorMessage = `
╔════════════════════════════════════════════════════════════════╗
║                    CORS Configuration Error                    ║
╠════════════════════════════════════════════════════════════════╣
║  ALLOWED_ORIGINS is set to '*' in production environment.    ║
║  This is insecure and will cause all CORS requests to fail.   ║
║                                                                ║
║  To fix this, set ALLOWED_ORIGINS to a comma-separated list   ║
║  of allowed origins, for example:                             ║
║  ALLOWED_ORIGINS=https://example.com,https://app.example.com   ║
║                                                                ║
║  The application will reject all cross-origin requests until   ║
║  this is fixed.                                                ║
╚════════════════════════════════════════════════════════════════╝
  `;
  logger.error(errorMessage, {
    nodeEnv: _env.data.NODE_ENV,
    allowedOrigins: _env.data.ALLOWED_ORIGINS
  });
  // 不抛出错误，允许应用启动，但在运行时拒绝请求
}

// Validate AUTH_URL in production
if (_env.data.NODE_ENV === "production" && !_env.data.AUTH_URL) {
  logger.warn("AUTH_URL is not set in production. Using trustHost: true may be insecure. Consider setting AUTH_URL explicitly.", {
    nodeEnv: _env.data.NODE_ENV
  });
}

// Warn about missing Redis configuration in production
if (_env.data.NODE_ENV === "production" && !_env.data.REDIS_URL && !(_env.data.UPSTASH_REDIS_REST_URL && _env.data.UPSTASH_REDIS_REST_TOKEN)) {
  logger.warn("Redis is not configured in production. Rate limiting will use in-memory storage which may not work correctly in multi-instance deployments.", {
    nodeEnv: _env.data.NODE_ENV
  });
}

export const env = _env.data;
