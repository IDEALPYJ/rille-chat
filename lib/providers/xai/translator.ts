/**
 * xAI 参数翻译器
 * 继承 OpenAI Responses API 翻译器，添加 xAI 特有的功能支持
 */

import {
  TranslatorInput,
  ResponsesAPIParams,
  ResponseInputItem,
  ToolConfig
} from '../types';
import { OpenAIResponsesTranslator } from '../openai/translator';
import { logger } from '@/lib/logger';

/**
 * xAI Responses API 参数翻译器
 * 基于 OpenAI Responses API，添加 xAI 特有功能：
 * - x_search 工具
 * - 加密推理内容
 * - store 参数
 * - 模型路由（根据深度思考设置切换 reasoning/non-reasoning 版本）
 */
export class XAIResponsesTranslator extends OpenAIResponsesTranslator {
  /**
   * 根据深度思考设置路由到正确的模型版本
   * grok-4-fast -> grok-4-fast-reasoning / grok-4-fast-non-reasoning
   * grok-4-1-fast -> grok-4-1-fast-reasoning / grok-4-1-fast-non-reasoning
   */
  private routeModelByReasoning(input: TranslatorInput): TranslatorInput {
    const modelId = input.modelConfig.id;
    const reasoningEnabled = input.reasoning?.enabled ?? input.modelConfig.reasoning?.defaultEnabled ?? false;

    // 模型路由映射表
    const modelRoutingMap: Record<string, { reasoning: string; nonReasoning: string }> = {
      'grok-4-fast': {
        reasoning: 'grok-4-fast-reasoning',
        nonReasoning: 'grok-4-fast-non-reasoning'
      },
      'grok-4-1-fast': {
        reasoning: 'grok-4-1-fast-reasoning',
        nonReasoning: 'grok-4-1-fast-non-reasoning'
      }
    };

    const routing = modelRoutingMap[modelId];
    if (!routing) {
      // 不需要路由的模型，直接返回原输入
      return input;
    }

    // 根据深度思考设置选择模型版本
    const targetModelId = reasoningEnabled ? routing.reasoning : routing.nonReasoning;

    logger.info('xAI model routing', {
      originalModel: modelId,
      targetModel: targetModelId,
      reasoningEnabled
    });

    // 返回修改后的输入
    return {
      ...input,
      modelConfig: {
        ...input.modelConfig,
        id: targetModelId
      }
    };
  }

  /**
   * 完整翻译流程
   * 在父类基础上添加 xAI 特有参数处理
   */
  translate(input: TranslatorInput): ResponsesAPIParams {
    // xAI 特有：根据深度思考设置路由到正确的模型版本
    const routedInput = this.routeModelByReasoning(input);

    // 调用父类的翻译逻辑
    const params = super.translate(routedInput);

    // xAI 特有：处理 store 参数（默认不存储）
    if (input.extra?.store !== undefined) {
      params.store = input.extra.store;
    } else {
      // 默认不存储在服务器上
      params.store = false;
    }

    // xAI 特有：处理 previous_response_id
    if (input.extra?.previous_response_id) {
      params.previous_response_id = input.extra.previous_response_id;
    }

    // xAI 特有：处理 include 参数（如加密推理内容）
    // 注意：grok-4 的推理内容是加密的，如果需要用于后续对话，可以通过 extra.include 传入
    // 格式: ["reasoning.encrypted_content"]
    if (input.extra?.include) {
      params.include = input.extra.include;
    }

    // xAI 特有：处理加密推理内容请求
    // 注意：grok-4 等模型的推理内容是加密的，无法直接显示
    // 因此我们不请求加密推理内容，而是依赖 reasoning.summary 来获取推理摘要
    // 如果用户明确需要加密内容用于后续对话，可以通过 extra.include 传入

    // xAI 特有：处理 x_search 工具
    if (input.enabledTools?.includes('x_search')) {
      if (!params.tools) {
        params.tools = [];
      }
      // 检查是否已添加 x_search
      const hasXSearch = params.tools.some((t: ToolConfig) =>
        t.type === 'x_search'
      );
      if (!hasXSearch) {
        params.tools.push({ type: 'x_search' });
      }
    }

    logger.info('xAI Responses API params', {
      model: params.model,
      hasTools: !!params.tools,
      hasReasoning: !!params.reasoning,
      store: params.store,
      hasPreviousResponseId: !!params.previous_response_id,
      include: params.include
    });

    return params;
  }

  /**
   * 翻译推理参数
   * 重写以支持 xAI 特有的推理配置
   * 注意：grok-4 系列模型的推理内容是加密的，我们使用 reasoning.summary 来获取明文摘要
   */
  protected translateReasoningParameters(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.modelConfig.features?.includes('reasoning')) {
      return;
    }

    const reasoningConfig = input.modelConfig.reasoning;
    if (!reasoningConfig) return;

    // 如果推理被禁用，不添加推理参数
    if (!input.reasoning?.enabled && !reasoningConfig.defaultEnabled) {
      return;
    }

    // 检查是否是 grok-4 系列模型（加密推理内容）
    const modelId = input.modelConfig.id;
    const isGrok4 = modelId.includes('grok-4');

    if (!params.reasoning) {
      params.reasoning = {};
    }

    // xAI 支持 reasoning.effort 参数
    if (input.reasoning?.effort) {
      const effortValue = input.reasoning.effort;
      if (typeof effortValue === 'string') {
        // xAI 支持的 effort 值: minimal, low, medium, high
        const validEfforts = ['minimal', 'low', 'medium', 'high'];
        if (validEfforts.includes(effortValue)) {
          params.reasoning.effort = effortValue as any;
        }
      }
    }

    // xAI 支持 reasoning.summary 参数
    // 对于 grok-4 系列模型，默认启用 summary 以获取明文推理摘要
    if (input.reasoning?.summary) {
      params.reasoning.summary = input.reasoning.summary as any;
    } else if (isGrok4) {
      // grok-4 系列模型推理内容加密，默认使用 concise summary
      params.reasoning.summary = 'concise';
    }

    logger.info('xAI reasoning params', {
      model: modelId,
      isGrok4,
      effort: params.reasoning?.effort,
      summary: params.reasoning?.summary
    });
  }

  /**
   * 翻译输入消息
   * 重写以支持 xAI 特有的消息格式要求
   * xAI 要求：
   * - developer 角色作为 system 的别名
   * - 只能有一个 system/developer 消息，且必须是第一条
   */
  protected translateInput(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.messages || input.messages.length === 0) {
      return;
    }

    const inputItems: ResponseInputItem[] = [];
    let systemMessageProcessed = false;

    for (const msg of input.messages) {
      // xAI: developer 角色作为 system 的别名
      if (msg.role === 'system' || (msg.role as string) === 'developer') {
        // xAI 要求只能有一个 system 消息，且必须是第一条
        if (!systemMessageProcessed) {
          if (!params.instructions) {
            params.instructions = '';
          }
          params.instructions += (params.instructions ? '\n\n' : '') +
            (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
          systemMessageProcessed = true;
        } else {
          // 额外的 system 消息转换为 user 消息
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          inputItems.push({
            role: 'user',
            content: `[System Instruction] ${content}`
          });
        }
        continue;
      }

      if (msg.role === 'user' || msg.role === 'assistant') {
        const content = msg.content;
        let formattedContent: ResponseInputItem['content'];

        if (typeof content === 'string') {
          formattedContent = content;
        } else if (Array.isArray(content)) {
          formattedContent = content.map(item => {
            if (typeof item === 'string') {
              return { type: 'input_text' as const, text: item };
            }
            if (item && typeof item === 'object') {
              const contentItem = item as Record<string, any>;
              // xAI 支持图片输入
              if (contentItem.type === 'image_url' || contentItem.image_url) {
                return {
                  type: 'input_image' as const,
                  image_url: contentItem.image_url || contentItem.imageUrl,
                  detail: contentItem.detail || 'auto'
                };
              }
              if (contentItem.type === 'text' || contentItem.text) {
                return {
                  type: 'input_text' as const,
                  text: contentItem.text || contentItem.content
                };
              }
              return {
                type: 'input_text' as const,
                text: JSON.stringify(item)
              };
            }
            return { type: 'input_text' as const, text: String(item) };
          });
        } else {
          formattedContent = String(content);
        }

        const item: ResponseInputItem = {
          role: msg.role,
          content: formattedContent
        };

        inputItems.push(item);
      }
    }

    if (inputItems.length > 0) {
      params.input = inputItems;
    }
  }
}

/**
 * 创建 xAI Responses API 翻译器实例
 */
export function createXAIResponsesTranslator(): XAIResponsesTranslator {
  return new XAIResponsesTranslator();
}
