import { ModelConfig } from '@/lib/types/model';

/**
 * 推理强度控制类型 (保持兼容)
 */
export type ReasoningControl =
  | {
    kind: 'adaptive';              // Adaptive thinking 模式 (Claude Opus 4.6+)
    fieldPath: string;             // 如 'thinking.type'
    options: Array<{ value: string; label: string }>;
    default: string;
    baseParams?: Record<string, any>; // 开启该功能所需的基础参数
  }
  | {
    kind: 'effort';                // 枚举型档位
    fieldPath: string;             // 如 'reasoning.effort'
    options: Array<{ value: string; label: string }>;
    default: string;
    baseParams?: Record<string, any>; // 开启该功能所需的基础参数
  }
  | {
    kind: 'budget';                // 数值型 token 预算
    fieldPath: string;             // 如 'thinking.budget_tokens'
    min: number;
    max?: number;
    step?: number;
    default: number;
    baseParams?: Record<string, any>; // 开启该功能所需的基础参数
  };

export function getReasoningConfig(
  config: ModelConfig | null,
  preferredMode?: 'adaptive' | 'effort' | 'budget'
): ReasoningControl | null {
  if (!config || !config.reasoning || !config.reasoning.intensity) {
    return null;
  }

  const { intensity } = config.reasoning;

  // 如果提供了优选模式且该模式被支持，则使用它
  // 否则默认取第一个支持的模式
  const mode = (preferredMode && intensity.supportedModes.includes(preferredMode))
    ? preferredMode
    : intensity.supportedModes[0];

  if (mode === 'adaptive' && intensity.adaptive) {
    return {
      kind: 'adaptive',
      fieldPath: intensity.adaptive.mapping || 'thinking.type',
      options: intensity.adaptive.options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) } : opt
      ),
      default: intensity.adaptive.default,
      baseParams: intensity.adaptive.baseParams
    };
  }

  if (mode === 'effort' && intensity.effort) {
    return {
      kind: 'effort',
      fieldPath: intensity.effort.mapping || 'reasoning.effort',
      options: intensity.effort.options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) } : opt
      ),
      default: intensity.effort.default,
      baseParams: intensity.effort.baseParams
    };
  }

  if (mode === 'budget' && intensity.budget) {
    return {
      kind: 'budget',
      fieldPath: intensity.budget.mapping || 'thinking.budget_tokens',
      min: intensity.budget.min,
      max: intensity.budget.max,
      step: intensity.budget.step,
      default: intensity.budget.default,
      baseParams: intensity.budget.baseParams
    };
  }

  return null;
}

/**
 * 深度合并对象
 * 将源对象的所有属性深度合并到目标对象中
 * 
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象（会修改 target）
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        // 递归合并嵌套对象
        deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
      } else {
        // 直接赋值（覆盖）
        target[key] = sourceValue;
      }
    }
  }
  return target;
}

/**
 * 设置嵌套字段路径的工具函数
 * 支持嵌套路径如 'thinkingConfig.thinkingLevel'、'thinking.budget_tokens'
 * 
 * @param path 字段路径，支持点号分隔的嵌套路径
 * @param value 要设置的值
 * @param obj 目标对象
 */
export function setDeep(
  path: string,
  value: unknown,
  obj: Record<string, unknown>
): void {
  const keys = path.split('.');
  let current: any = obj;

  // 遍历到倒数第二层
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }

  // 设置最后一层的值
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * 检查模型是否支持推理强度设置
 * 
 * @param config 模型配置
 * @returns 如果模型支持推理强度设置则返回true
 */
export function supportsReasoningEffort(
  config: ModelConfig | null
): boolean {
  return getReasoningConfig(config) !== null;
}
