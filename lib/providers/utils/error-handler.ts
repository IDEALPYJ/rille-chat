/**
 * Provider 统一错误处理工具
 * 用于统一各 Provider 的错误格式
 */

import { logger } from '@/lib/logger';
import { UnifiedStreamEvent } from '@/lib/chat/protocols/unified-types';

/**
 * 标准化错误信息
 */
export interface StandardizedError {
  type: 'error';
  message: string;
  code?: string;
  status?: number;
  provider?: string;
  raw?: any;
}

/**
 * 错误代码映射
 */
const ERROR_CODE_MAP: Record<string, string> = {
  // OpenAI / OpenAI-compatible
  'invalid_api_key': 'INVALID_API_KEY',
  'insufficient_quota': 'INSUFFICIENT_QUOTA',
  'rate_limit_exceeded': 'RATE_LIMIT_EXCEEDED',
  'context_length_exceeded': 'CONTEXT_LENGTH_EXCEEDED',
  'invalid_request_error': 'INVALID_REQUEST',
  
  // Gemini
  'INVALID_ARGUMENT': 'INVALID_REQUEST',
  'PERMISSION_DENIED': 'PERMISSION_DENIED',
  'RESOURCE_EXHAUSTED': 'RATE_LIMIT_EXCEEDED',
  'UNAUTHENTICATED': 'INVALID_API_KEY',
  
  // Anthropic
  'authentication_error': 'INVALID_API_KEY',
  'permission_error': 'PERMISSION_DENIED',
  'not_found_error': 'NOT_FOUND',
  'rate_limit_error': 'RATE_LIMIT_EXCEEDED',
  'api_error': 'API_ERROR',
  'overloaded_error': 'SERVER_OVERLOADED',
  
  // HTTP Status
  '400': 'BAD_REQUEST',
  '401': 'UNAUTHORIZED',
  '403': 'FORBIDDEN',
  '404': 'NOT_FOUND',
  '429': 'RATE_LIMIT_EXCEEDED',
  '500': 'INTERNAL_SERVER_ERROR',
  '502': 'BAD_GATEWAY',
  '503': 'SERVICE_UNAVAILABLE',
  '504': 'GATEWAY_TIMEOUT',
};

/**
 * 错误处理器
 */
export class ErrorHandler {
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  /**
   * 处理错误并返回标准化错误
   */
  handle(error: any): StandardizedError {
    const standardized = this.standardize(error);
    
    // 记录错误日志
    logger.error(`[${this.providerName}] API Error`, {
      message: standardized.message,
      code: standardized.code,
      status: standardized.status,
      provider: standardized.provider,
    });

    return standardized;
  }

  /**
   * 创建错误事件
   */
  createErrorEvent(error: any): UnifiedStreamEvent {
    const standardized = this.handle(error);
    
    return {
      type: 'error',
      message: standardized.message,
      raw: {
        code: standardized.code,
        status: standardized.status,
        provider: standardized.provider,
        originalError: error,
      },
    };
  }

  /**
   * 标准化错误
   */
  private standardize(error: any): StandardizedError {
    // 如果已经是标准格式，直接返回
    if (error?.type === 'error' && error?.message) {
      return {
        type: 'error',
        message: error.message,
        code: error.code,
        status: error.status,
        provider: error.provider || this.providerName,
        raw: error.raw || error,
      };
    }

    // 提取错误信息
    const message = this.extractMessage(error);
    const code = this.extractCode(error);
    const status = this.extractStatus(error);

    return {
      type: 'error',
      message,
      code,
      status,
      provider: this.providerName,
      raw: error,
    };
  }

  /**
   * 提取错误消息
   */
  private extractMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    // OpenAI 格式
    if (error?.error?.message) {
      return error.error.message;
    }

    // Gemini 格式
    if (error?.error?.details?.[0]?.description) {
      return error.error.details[0].description;
    }

    // Anthropic 格式
    if (error?.error?.message) {
      return error.error.message;
    }

    // 通用格式
    if (error?.message) {
      return error.message;
    }

    return 'Unknown error occurred';
  }

  /**
   * 提取错误代码
   */
  private extractCode(error: any): string | undefined {
    // 直接代码
    if (error?.code) {
      return ERROR_CODE_MAP[error.code] || error.code;
    }

    // OpenAI 格式
    if (error?.error?.code) {
      return ERROR_CODE_MAP[error.error.code] || error.error.code;
    }

    // Gemini 格式
    if (error?.error?.code) {
      return ERROR_CODE_MAP[error.error.code] || error.error.code;
    }

    // HTTP 状态码
    if (error?.status) {
      return ERROR_CODE_MAP[String(error.status)];
    }

    return undefined;
  }

  /**
   * 提取 HTTP 状态码
   */
  private extractStatus(error: any): number | undefined {
    if (error?.status) {
      return error.status;
    }

    if (error?.statusCode) {
      return error.statusCode;
    }

    if (error?.response?.status) {
      return error.response.status;
    }

    return undefined;
  }
}

/**
 * 创建错误处理器
 */
export function createErrorHandler(providerName: string): ErrorHandler {
  return new ErrorHandler(providerName);
}

/**
 * 快速创建错误事件
 */
export function createErrorEvent(
  providerName: string,
  message: string,
  code?: string,
  status?: number,
  raw?: any
): UnifiedStreamEvent {
  const handler = createErrorHandler(providerName);
  return handler.createErrorEvent({
    message,
    code,
    status,
    ...raw,
  });
}
