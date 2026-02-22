/**
 * Provider 参数验证工具
 * 用于验证和清理发送给各 Provider 的参数
 */

import { logger } from '@/lib/logger';

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 参数验证规则
 */
export interface ParamValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  enum?: any[];
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * 参数验证器
 */
export class ParamValidator {
  private rules: Map<string, ParamValidationRule>;
  private providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
    this.rules = new Map();
  }

  /**
   * 添加验证规则
   */
  addRule(field: string, rule: ParamValidationRule): void {
    this.rules.set(field, rule);
  }

  /**
   * 验证参数
   */
  validate(params: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    for (const [field, rule] of this.rules) {
      const value = params[field];

      // 必需字段检查
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${field}`);
        continue;
      }

      // 如果值为空，跳过其他检查
      if (value === undefined || value === null) {
        continue;
      }

      // 类型检查
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field ${field} should be ${rule.type}, got ${actualType}`);
          continue;
        }
      }

      // 数值范围检查
      if (rule.type === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field ${field} should be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field ${field} should be <= ${rule.max}`);
        }
      }

      // 字符串长度检查
      if (rule.type === 'string') {
        if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`Field ${field} length should be >= ${rule.min}`);
        }
        if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`Field ${field} length should be <= ${rule.max}`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`Field ${field} does not match required pattern`);
        }
      }

      // 枚举值检查
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`Field ${field} should be one of: ${rule.enum.join(', ')}`);
      }

      // 自定义验证
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          if (typeof result === 'string') {
            errors.push(`Field ${field}: ${result}`);
          } else {
            errors.push(`Field ${field} failed custom validation`);
          }
        }
      }
    }

    // 记录验证结果
    if (errors.length > 0) {
      logger.warn(`[${this.providerName}] Parameter validation failed`, {
        errors,
        warnings,
        params: this.sanitizeParamsForLogging(params),
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 清理参数用于日志记录（移除敏感信息）
   */
  private sanitizeParamsForLogging(params: Record<string, any>): Record<string, any> {
    const sanitized = { ...params };
    const sensitiveFields = ['apiKey', 'api_key', 'token', 'password', 'secret'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}

/**
 * 创建 OpenAI 参数验证器
 */
export function createOpenAIValidator(): ParamValidator {
  const validator = new ParamValidator('OpenAI');
  
  validator.addRule('model', { required: true, type: 'string' });
  validator.addRule('messages', { required: true, type: 'array' });
  validator.addRule('temperature', { type: 'number', min: 0, max: 2 });
  validator.addRule('max_tokens', { type: 'number', min: 1 });
  validator.addRule('top_p', { type: 'number', min: 0, max: 1 });
  validator.addRule('stream', { type: 'boolean' });
  
  return validator;
}

/**
 * 创建 Gemini 参数验证器
 */
export function createGeminiValidator(): ParamValidator {
  const validator = new ParamValidator('Gemini');
  
  validator.addRule('contents', { required: true, type: 'array' });
  validator.addRule('generationConfig', { type: 'object' });
  validator.addRule('tools', { type: 'array' });
  
  return validator;
}

/**
 * 创建通用参数验证器
 */
export function createGenericValidator(providerName: string): ParamValidator {
  return new ParamValidator(providerName);
}
