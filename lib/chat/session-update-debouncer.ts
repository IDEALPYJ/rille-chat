import { logger } from "@/lib/logger";

/**
 * Session 更新防抖器
 * 用于减少频繁的 Session 表更新
 */
class SessionUpdateDebouncer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingUpdates: Map<string, {
    content: string;
    role: string;
    timestamp: number;
  }> = new Map();
  private readonly debounceMs = 10000; // 10 秒防抖

  /**
   * 计划一个 Session 更新
   * 如果在该防抖窗口内再次调用，会取消之前的更新并重新计划
   */
  schedule(
    sessionId: string,
    content: string,
    role: string,
    updateFn: (sessionId: string, content: string, role: string) => Promise<void>
  ): void {
    // 保存待更新的数据
    this.pendingUpdates.set(sessionId, {
      content,
      role,
      timestamp: Date.now(),
    });

    // 清除之前的定时器
    const existingTimer = this.timers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      const update = this.pendingUpdates.get(sessionId);
      if (update) {
        try {
          await updateFn(sessionId, update.content, update.role);
          this.pendingUpdates.delete(sessionId);
        } catch (error) {
          logger.error("Failed to update session in debouncer", error, { sessionId });
        }
      }
      this.timers.delete(sessionId);
    }, this.debounceMs);

    this.timers.set(sessionId, timer);
  }

  /**
   * 立即执行待处理的更新（用于消息完成时）
   */
  async flush(
    sessionId: string,
    updateFn: (sessionId: string, content: string, role: string) => Promise<void>
  ): Promise<void> {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }

    const update = this.pendingUpdates.get(sessionId);
    if (update) {
      try {
        await updateFn(sessionId, update.content, update.role);
        this.pendingUpdates.delete(sessionId);
      } catch (error) {
        logger.error("Failed to flush session update", error, { sessionId });
      }
    }
  }

  /**
   * 清理所有待处理的更新
   */
  clear(sessionId?: string): void {
    if (sessionId) {
      const timer = this.timers.get(sessionId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(sessionId);
      }
      this.pendingUpdates.delete(sessionId);
    } else {
      // 清理所有
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      this.timers.clear();
      this.pendingUpdates.clear();
    }
  }
}

export const sessionUpdateDebouncer = new SessionUpdateDebouncer();

