import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * 流式消息状态缓存（使用 Redis）
 * 用于减少数据库写入压力
 */
class StreamCache {
  private redis: Redis | null = null;
  private readonly keyPrefix = "stream:";
  private readonly ttl = 300; // 5 分钟 TTL

  constructor() {
    // 初始化 Redis 客户端（如果可用）
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redis = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        logger.info("Stream cache initialized with Redis");
      } catch (error) {
        logger.error("Failed to initialize Redis for stream cache", error);
      }
    } else {
      logger.warn("Redis not configured, stream cache will use in-memory storage (not suitable for production)");
    }
  }

  /**
   * 保存流式消息状态到缓存
   */
  async saveStreamState(
    messageId: string,
    data: {
      content: string;
      reasoningContent: string;
      searchResults: string;
      contentParts?: any[];
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: { cached_tokens?: number };
        completion_tokens_details?: { reasoning_tokens?: number };
      };
      cost: number;
    }
  ): Promise<void> {
    if (!this.redis) {
      // Redis 不可用时，直接返回（不缓存）
      return;
    }

    try {
      const key = `${this.keyPrefix}${messageId}`;
      await this.redis.setex(key, this.ttl, JSON.stringify(data));
    } catch (error) {
      logger.error("Failed to save stream state to cache", error, { messageId });
    }
  }

  /**
   * 从缓存获取流式消息状态
   */
  async getStreamState(messageId: string): Promise<{
    content: string;
    reasoningContent: string;
    searchResults: string;
    contentParts?: any[];
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
      prompt_tokens_details?: { cached_tokens?: number };
      completion_tokens_details?: { reasoning_tokens?: number };
    };
    cost: number;
  } | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const key = `${this.keyPrefix}${messageId}`;
      const data = await this.redis.get<string>(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error("Failed to get stream state from cache", error, { messageId });
      return null;
    }
  }

  /**
   * 删除流式消息状态缓存
   */
  async deleteStreamState(messageId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const key = `${this.keyPrefix}${messageId}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error("Failed to delete stream state from cache", error, { messageId });
    }
  }
}

export const streamCache = new StreamCache();

