import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { env } from "./env";
import { Redis } from "@upstash/redis";

/**
 * 速率限制器接口
 */
interface IRateLimiter {
  check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
}

/**
 * 内存速率限制器（用于开发环境或单实例部署）
 */
class MemoryRateLimiter implements IRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // 定期清理过期的记录（每5分钟）
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // 获取该标识符的请求记录
    let requests = this.requests.get(identifier) || [];

    // 过滤掉窗口外的请求
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // 检查是否超过限制
    const count = requests.length;
    const allowed = count < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - count);
    const resetTime = requests.length > 0 
      ? requests[0] + this.windowMs 
      : now + this.windowMs;

    if (allowed) {
      // 添加当前请求时间戳
      requests.push(now);
      this.requests.set(identifier, requests);
    }

    return { allowed, remaining, resetTime };
  }

  /**
   * 清理过期的记录
   */
  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Redis 速率限制器（用于生产环境多实例部署）
 * 使用滑动窗口算法
 */
class RedisRateLimiter implements IRateLimiter {
  private readonly redis: Redis;
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly keyPrefix: string = "ratelimit:";

  constructor(redis: Redis, windowMs: number, maxRequests: number) {
    this.redis = redis;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  async check(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const key = `${this.keyPrefix}${identifier}`;

    try {
      // 使用 Redis Sorted Set 实现滑动窗口
      // 1. 移除窗口外的记录
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // 2. 添加当前请求时间戳
      await this.redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });

      // 3. 设置过期时间（窗口大小 + 1分钟缓冲）
      await this.redis.expire(key, Math.ceil((this.windowMs + 60000) / 1000));

      // 4. 获取当前窗口内的请求数
      const count = await this.redis.zcard(key);

      const allowed = count <= this.maxRequests;
      const remaining = Math.max(0, this.maxRequests - count);
      const resetTime = now + this.windowMs;

      // 如果超过限制，移除刚添加的记录
      if (!allowed) {
        await this.redis.zremrangebyscore(key, now, now);
      }

      return { allowed, remaining, resetTime };
    } catch (error) {
      // Redis 错误时降级到允许请求，但记录警告
      logger.error("Redis rate limiter error, allowing request", error, { identifier });
      return { allowed: true, remaining: this.maxRequests, resetTime: now + this.windowMs };
    }
  }
}

/**
 * 创建速率限制器实例
 */
function createRateLimiter(windowMs: number, maxRequests: number): IRateLimiter {
  // 优先使用 Upstash Redis（REST API，适合 Edge Runtime）
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      });
      logger.info("Using Redis rate limiter (Upstash)", { windowMs, maxRequests });
      return new RedisRateLimiter(redis, windowMs, maxRequests);
    } catch (error) {
      logger.error("Failed to initialize Upstash Redis, falling back to memory", error);
    }
  }

  // 如果有标准 Redis URL，也可以使用（但需要支持 Edge Runtime 的客户端）
  // 目前 Upstash 是最佳选择，因为它支持 REST API

  // 降级到内存实现
  if (env.NODE_ENV === "production") {
    logger.warn("Using memory rate limiter in production. This may not work correctly in multi-instance deployments.", {
      windowMs,
      maxRequests,
    });
  }
  return new MemoryRateLimiter(windowMs, maxRequests);
}

// 创建不同限制的速率限制器实例
export const rateLimiters = {
  // 严格限制：每分钟 60 次请求（用于认证相关）
  strict: createRateLimiter(60 * 1000, 60),
  
  // 中等限制：每分钟 100 次请求（用于一般 API）
  medium: createRateLimiter(60 * 1000, 100),
  
  // 宽松限制：每分钟 200 次请求（用于读取操作）
  loose: createRateLimiter(60 * 1000, 200),
  
  // 聊天限制：每分钟 30 次请求（用于聊天 API，避免滥用）
  chat: createRateLimiter(60 * 1000, 30),
  
  // 上传限制：每分钟 10 次请求（用于文件上传）
  upload: createRateLimiter(60 * 1000, 10),
};

/**
 * 速率限制中间件
 * @param req NextRequest 对象
 * @param limiter 速率限制器实例
 * @param getIdentifier 获取唯一标识符的函数（默认使用 IP 地址）
 * @returns 如果超过限制返回错误响应，否则返回 null
 */
export async function rateLimit(
  req: NextRequest,
  limiter: IRateLimiter = rateLimiters.medium,
  getIdentifier?: (req: NextRequest) => string
): Promise<NextResponse | null> {
  // 获取标识符（IP 地址或用户 ID）
  const identifier = getIdentifier 
    ? getIdentifier(req)
    : req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

  const { allowed, remaining, resetTime } = await limiter.check(identifier);

  if (!allowed) {
    logger.warn("Rate limit exceeded", {
      identifier,
      path: req.nextUrl.pathname,
      method: req.method,
      remaining,
      resetTime: new Date(resetTime).toISOString(),
    });

    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "100", // 这里需要从 limiter 获取，但接口不暴露，暂时硬编码
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": new Date(resetTime).toISOString(),
          "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // 添加速率限制头信息
  return null;
}

/**
 * 创建速率限制包装器
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: IRateLimiter = rateLimiters.medium,
  getIdentifier?: (req: NextRequest) => string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(req, limiter, getIdentifier);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(req);
  };
}
