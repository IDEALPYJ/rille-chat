/**
 * Provider 参数日志记录工具
 * 用于记录和调试发送给各 Provider 的参数
 */

import { logger } from '@/lib/logger';

/**
 * 日志级别
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 参数日志配置
 */
export interface ParamLoggerConfig {
  /** 是否启用日志 */
  enabled: boolean;
  /** 日志级别 */
  level: LogLevel;
  /** 是否记录敏感信息（默认 false） */
  logSensitiveData: boolean;
  /** 最大记录深度 */
  maxDepth: number;
  /** 最大字符串长度 */
  maxStringLength: number;
  /** 最大数组长度 */
  maxArrayLength: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ParamLoggerConfig = {
  enabled: process.env.NODE_ENV === 'development',
  level: 'debug',
  logSensitiveData: false,
  maxDepth: 5,
  maxStringLength: 1000,
  maxArrayLength: 50,
};

/**
 * 敏感字段列表
 */
const SENSITIVE_FIELDS = [
  'apiKey',
  'api_key',
  'token',
  'password',
  'secret',
  'authorization',
  'x-api-key',
  'access_token',
  'refresh_token',
];

/**
 * 参数日志记录器
 */
export class ParamLogger {
  private providerName: string;
  private config: ParamLoggerConfig;

  constructor(providerName: string, config: Partial<ParamLoggerConfig> = {}) {
    this.providerName = providerName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 记录请求参数
   */
  logRequest(params: Record<string, any>, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const sanitized = this.sanitizeParams(params);
    const logData = {
      provider: this.providerName,
      params: sanitized,
      context,
    };

    this.log(this.config.level, `[${this.providerName}] API Request`, logData);
  }

  /**
   * 记录响应数据
   */
  logResponse(response: any, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const sanitized = this.sanitizeValue(response, 0);
    const logData = {
      provider: this.providerName,
      response: sanitized,
      context,
    };

    this.log('debug', `[${this.providerName}] API Response`, logData);
  }

  /**
   * 记录错误信息
   */
  logError(error: any, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const logData = {
      provider: this.providerName,
      error: this.sanitizeValue(error, 0),
      context,
    };

    this.log('error', `[${this.providerName}] API Error`, logData);
  }

  /**
   * 记录工具调用
   */
  logToolCall(toolName: string, toolParams: any, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const logData = {
      provider: this.providerName,
      tool: toolName,
      params: this.sanitizeValue(toolParams, 0),
      context,
    };

    this.log('debug', `[${this.providerName}] Tool Call`, logData);
  }

  /**
   * 记录流式数据块
   */
  logStreamChunk(chunk: any, context?: Record<string, any>): void {
    if (!this.config.enabled) return;

    const logData = {
      provider: this.providerName,
      chunk: this.sanitizeValue(chunk, 0),
      context,
    };

    this.log('debug', `[${this.providerName}] Stream Chunk`, logData);
  }

  /**
   * 记录参数转换
   */
  logParamConversion(
    originalParams: Record<string, any>,
    convertedParams: Record<string, any>,
    context?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    const logData = {
      provider: this.providerName,
      original: this.sanitizeParams(originalParams),
      converted: this.sanitizeParams(convertedParams),
      context,
    };

    this.log('debug', `[${this.providerName}] Param Conversion`, logData);
  }

  /**
   * 执行日志记录
   */
  private log(level: LogLevel, message: string, data: any): void {
    switch (level) {
      case 'debug':
        logger.debug(message, data);
        break;
      case 'info':
        logger.info(message, data);
        break;
      case 'warn':
        logger.warn(message, data);
        break;
      case 'error':
        logger.error(message, data);
        break;
    }
  }

  /**
   * 清理参数（移除敏感信息）
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    return this.sanitizeValue(params, 0) as Record<string, any>;
  }

  /**
   * 清理值（递归处理）
   */
  private sanitizeValue(value: any, depth: number): any {
    // 检查深度限制
    if (depth >= this.config.maxDepth) {
      return '[Max Depth Reached]';
    }

    // 处理 null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // 处理字符串
    if (typeof value === 'string') {
      // 截断长字符串
      if (value.length > this.config.maxStringLength) {
        return value.substring(0, this.config.maxStringLength) + '...[truncated]';
      }
      return value;
    }

    // 处理数字、布尔值
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // 处理数组
    if (Array.isArray(value)) {
      const sanitized = value
        .slice(0, this.config.maxArrayLength)
        .map((item) => this.sanitizeValue(item, depth + 1));
      
      if (value.length > this.config.maxArrayLength) {
        sanitized.push(`...[${value.length - this.config.maxArrayLength} more items]`);
      }
      
      return sanitized;
    }

    // 处理对象
    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      
      for (const [key, val] of Object.entries(value)) {
        // 检查是否是敏感字段
        const isSensitive = SENSITIVE_FIELDS.some(
          (field) => key.toLowerCase().includes(field.toLowerCase())
        );

        if (isSensitive && !this.config.logSensitiveData) {
          sanitized[key] = '***REDACTED***';
        } else {
          sanitized[key] = this.sanitizeValue(val, depth + 1);
        }
      }
      
      return sanitized;
    }

    // 其他类型
    return String(value);
  }
}

/**
 * 创建参数日志记录器
 */
export function createParamLogger(
  providerName: string,
  config?: Partial<ParamLoggerConfig>
): ParamLogger {
  return new ParamLogger(providerName, config);
}

/**
 * 全局配置
 */
let globalConfig: Partial<ParamLoggerConfig> = {};

/**
 * 设置全局配置
 */
export function setGlobalParamLoggerConfig(config: Partial<ParamLoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * 获取全局配置
 */
export function getGlobalParamLoggerConfig(): Partial<ParamLoggerConfig> {
  return { ...globalConfig };
}
