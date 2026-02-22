
import { ModelParameter, ReasoningSettings } from '@/lib/types';
import { getCapabilities as getOpenAICapabilities } from './openai/capabilities';
import { BailianCapabilities } from './bailian/capabilities';
import { ProviderCapabilities } from './types';

/**
 * 获取服务商能力定义
 * 目前仅支持 OpenAI，后续可扩展
 */
function getProviderCapabilities(providerId: string): ProviderCapabilities | null {
    switch (providerId) {
        case 'openai':
            return getOpenAICapabilities('responses');
        case 'bailian':
            return BailianCapabilities;
        default:
            return null;
    }
}

/**
 * 解析参数冲突
 * 根据服务商定义的规则，决定哪些参数应该被隐藏
 * 
 * @param providerId 服务商ID
 * @param modelId 模型ID (预留，目前规则是服务商级别的)
 * @param parameters 原始参数列表
 * @param settings 当前设置状态 (用于判断触发条件)
 * @returns 过滤后的参数列表
 */
export function resolveParameterConflicts(
    providerId: string,
    modelId: string,
    parameters: ModelParameter[],
    settings: {
        reasoning?: ReasoningSettings;
        [key: string]: any;
    }
): ModelParameter[] {
    const capabilities = getProviderCapabilities(providerId);
    if (!capabilities || !capabilities.parameterConflictRules) {
        return parameters;
    }

    const rules = capabilities.parameterConflictRules;
    const hiddenParams = new Set<string>();

    // 1. 检查 reasoning_enabled 规则
    if (rules.reasoning_enabled && settings.reasoning) {
        // 如果推理强度为 'none'，则视为未开启，不应用冲突规则
        if (settings.reasoning.effort === 'none') {
            return parameters;
        }

        for (const rule of rules.reasoning_enabled) {
            if (rule.when.enabled === settings.reasoning.enabled) {
                rule.hide.forEach(p => hiddenParams.add(p));
            }
        }
    }

    // 2. 这里可以扩展其他规则类型的检查...
    // 3. 检查每个参数自带的 visibleWhen 条件
    const result = parameters.map(p => {
        let isVisible = true;
        const isDisabled = hiddenParams.has(p.id);
        const disabledReason = isDisabled ? '深度思考模式下不可用' : undefined;

        if (p.visibleWhen) {
            // 目前主要支持推理状态判断
            if (p.visibleWhen.reasoning === false && settings.reasoning?.enabled === true) {
                isVisible = false;
            }
            if (p.visibleWhen.reasoning === true && settings.reasoning?.enabled === false) {
                isVisible = false;
            }
            // 兼容 reasoning_mode: "disabled"
            if (p.visibleWhen.reasoning_mode === "disabled" && settings.reasoning?.enabled === true) {
                isVisible = false;
            }
            if (p.visibleWhen.reasoning_mode === "enabled" && settings.reasoning?.enabled === false) {
                isVisible = false;
            }
        }

        if (!isVisible) {
            return {
                ...p,
                disabled: true,
                disabledReason: '当前模式下不可用'
            };
        }

        if (isDisabled) {
            return {
                ...p,
                disabled: true,
                disabledReason
            };
        }

        return p;
    });

    return result;
}
