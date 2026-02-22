/**
 * OpenAI参数翻译器
 * 负责将模型层配置翻译为Responses API参数
 */

import {
  TranslatorInput,
  ResponsesAPIParams,
  ResponseInputItem,
  ToolConfig,
  BuiltinToolConfig,
  FunctionToolConfig,
  ParameterTranslator
} from '../types';
import { logger } from '@/lib/logger';

/**
 * OpenAI Responses API 参数翻译器
 */
export class OpenAIResponsesTranslator implements ParameterTranslator<TranslatorInput, ResponsesAPIParams> {
  /**
   * 完整翻译流程
   */
  translate(input: TranslatorInput): ResponsesAPIParams {
    const params: ResponsesAPIParams = {
      model: input.modelConfig.id,
      stream: true
    };

    // 翻译输入消息
    this.translateInput(input, params);

    // 翻译系统指令 (仅处理 input.instructions，参数相关的指令在 translateBasicParameters 中处理)
    if (input.instructions) {
      params.instructions = input.instructions;
    }

    // 翻译基础参数与自定义参数 (含指令增强)
    this.translateBasicParameters(input, params);

    // 翻译推理参数
    this.translateReasoningParameters(input, params);

    // 翻译工具
    this.translateTools(input, params);

    // 翻译特性相关参数
    this.translateFeatures(input, params);

    return params;
  }

  /**
   * 翻译输入消息
   * 适配 OpenAI/Volcengine Responses API 的 input 格式
   */
  protected translateInput(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.messages || input.messages.length === 0) {
      return;
    }

    const inputItems: ResponseInputItem[] = [];

    for (const msg of input.messages) {
      if (msg.role === 'system') {
        if (!params.instructions) {
          params.instructions = '';
        }
        params.instructions += (params.instructions ? '\n\n' : '') +
          (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
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
              if (contentItem.type === 'image_url' || contentItem.image_url) {
                return {
                  type: 'input_image' as const,
                  image_url: contentItem.image_url || contentItem.imageUrl,
                  detail: contentItem.detail
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

  /**
   * 翻译基础参数与自定义参数
   * 完全基于 ModelConfig 的定义进行动态映射
   */
  protected translateBasicParameters(input: TranslatorInput, params: ResponsesAPIParams): void {
    const settings = input.userSettings;
    const modelParams = input.modelConfig.parameters || [];

    // 检查是否启用了推理（reasoning）
    const hasReasoningFeature = input.modelConfig.features?.includes('reasoning');
    const isReasoningEnabled = hasReasoningFeature && input.reasoning?.enabled;
    const reasoningEffort = input.reasoning?.effort;
    // temperature 和 top_p 只在 reasoning 为 none 或禁用时可调
    const shouldSkipSamplingParams = isReasoningEnabled && reasoningEffort !== 'none';

    // 遍历模型配置中定义的所有参数
    for (const paramDef of modelParams) {
      // 获取用户设置的值，如果未设置则使用默认值
      // 注意：settings 中的 key 需要与 paramDef.id 对应
      let value = settings[paramDef.id as keyof typeof settings];

      // 如果 userSettings 里没有找到，尝试从 extra 中找（兼容 verbosity 等非标准设置）
      if (value === undefined && input.extra) {
        value = input.extra[paramDef.id];
      }

      // 如果还是没有，使用默认值
      if (value === undefined) {
        value = paramDef.default as any;
      }

      // 1. 处理 API 字段映射 (Mapping)
      if (paramDef.mapping) {
        // temperature 和 top_p 只在 reasoning 为 none 或禁用时传递
        if ((paramDef.id === 'temperature' || paramDef.id === 'top_p') && shouldSkipSamplingParams) {
          logger.debug(`Skipping ${paramDef.id} parameter because reasoning is enabled with effort: ${reasoningEffort}`);
          continue;
        }
        this.setDeepValue(params, paramDef.mapping, value);
      }

      // 2. 处理指令映射 (Instruction Map)
      if (paramDef.instruction_map && typeof value === 'string') {
        const instruction = paramDef.instruction_map[value];
        if (instruction) {
          if (params.instructions) {
            params.instructions += '\n\n' + instruction;
          } else {
            params.instructions = instruction;
          }
        }
      }
    }
  }

  /**
   * 设置嵌套属性值
   */
  private setDeepValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 翻译推理参数
   * 基于 ModelConfig.reasoning 配置动态映射
   * 支持 OpenAI / Volcengine 等使用 Responses API 的服务商
   */
  protected translateReasoningParameters(input: TranslatorInput, params: ResponsesAPIParams): void {
    if (!input.modelConfig.features?.includes('reasoning')) {
      return;
    }

    const reasoningConfig = input.modelConfig.reasoning;
    if (!reasoningConfig) return;

    if (!input.reasoning?.enabled) {
      return;
    }

    // OpenAI 官方 API 使用 reasoning 参数，不使用 thinking 参数
    // thinking 参数是 Volcengine/火山引擎等服务商特有的

    if (reasoningConfig.intensity?.effort) {
      const effortValue = input.reasoning.effort;
      if (typeof effortValue === 'string') {
        const options = reasoningConfig.intensity.effort.options;
        const isValid = options.some(opt =>
          typeof opt === 'string' ? opt === effortValue : opt.value === effortValue
        );
        if (isValid) {
          if (!params.reasoning) {
            params.reasoning = {};
          }
          params.reasoning.effort = effortValue as any;
        }
      }
    }

    if (reasoningConfig.intensity?.budget && typeof input.reasoning.effort === 'number') {
      if (!params.reasoning) {
        params.reasoning = {};
      }
      params.reasoning.max_completion_tokens = input.reasoning.effort;
    }

    if (input.reasoning.summary) {
      if (!params.reasoning) {
        params.reasoning = {};
      }
      params.reasoning.summary = input.reasoning.summary as any;
    }
  }

  /**
   * 翻译工具
   */
  protected translateTools(input: TranslatorInput, params: ResponsesAPIParams): void {
    const tools: ToolConfig[] = [];

    // 翻译内置工具
    if (input.enabledTools && input.enabledTools.length > 0) {
      for (const toolName of input.enabledTools) {
        // 检查模型是否支持该工具
        if (!input.modelConfig.builtinTools?.includes(toolName)) {
          logger.warn(`Model ${input.modelConfig.id} does not support tool: ${toolName}`);
          continue;
        }

        const toolConfig = this.translateBuiltinTool(toolName, input.extra);
        if (toolConfig) {
          tools.push(toolConfig);
        }
      }
    }

    // 翻译自定义函数工具
    if (input.extra?.tools) {
      const customTools = input.extra.tools;
      if (Array.isArray(customTools)) {
        for (const tool of customTools) {
          if (tool.type === 'function') {
            // 处理两种格式：
            // 1. OpenAI 格式: { type: 'function', function: { name, description, parameters } }
            // 2. FunctionToolConfig 格式: { type: 'function', name, description, parameters }
            if (tool.function) {
              // OpenAI 格式 - 转换为 FunctionToolConfig
              tools.push({
                type: 'function',
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters
              });
            } else if (tool.name) {
              // 已经是 FunctionToolConfig 格式
              tools.push(tool as FunctionToolConfig);
            } else {
              logger.warn('Skipping invalid tool format', tool);
            }
          }
        }
      }
    }

    if (tools.length > 0) {
      params.tools = tools;

      // 设置tool_choice
      if (input.extra?.tool_choice) {
        params.tool_choice = input.extra.tool_choice;
      } else {
        params.tool_choice = 'auto';
      }

      // 设置parallel_tool_calls
      if (input.extra?.parallel_tool_calls !== undefined) {
        params.parallel_tool_calls = input.extra.parallel_tool_calls;
      }

      // 设置max_tool_calls
      if (input.extra?.max_tool_calls !== undefined) {
        params.max_tool_calls = input.extra.max_tool_calls;
      }
    }
  }

  /**
   * 翻译内置工具
   */
  protected translateBuiltinTool(toolName: string, extra?: Record<string, any>): BuiltinToolConfig | null {
    const toolConfig: BuiltinToolConfig = {
      type: toolName as any
    };

    switch (toolName) {
      case 'web_search':
        // Web搜索选项
        if (extra?.web_search_options) {
          const options = extra.web_search_options;

          if (options.user_location) {
            toolConfig.user_location = options.user_location;
          }

          if (options.filters) {
            toolConfig.filters = options.filters;
          }

          if (options.external_web_access !== undefined) {
            toolConfig.external_web_access = options.external_web_access;
          }
        }
        break;

      case 'code_interpreter':
        // 代码解释器选项
        if (extra?.code_interpreter_options) {
          const options = extra.code_interpreter_options;

          toolConfig.container = {
            type: options.container_type || 'auto',
            memory_limit: options.memory_limit || '4g'
          };

          if (options.file_ids) {
            toolConfig.container.file_ids = options.file_ids;
          }
        } else {
          // 默认配置
          toolConfig.container = {
            type: 'auto',
            memory_limit: '4g'
          };
        }
        break;

      case 'file_search':
        // 文件搜索选项
        if (extra?.file_search_options?.vector_store_ids) {
          toolConfig.vector_store_ids = extra.file_search_options.vector_store_ids;
        } else {
          // 文件搜索必须提供vector_store_ids
          logger.warn('file_search tool requires vector_store_ids');
          return null;
        }
        break;

      case 'image_generation':
      case 'computer':
      case 'apply_patch':
      case 'shell':
        // 这些工具不需要额外配置
        break;

      default:
        logger.warn(`Unknown builtin tool: ${toolName}`);
        return null;
    }

    return toolConfig;
  }

  /**
   * 翻译特性相关参数
   */
  protected translateFeatures(input: TranslatorInput, params: ResponsesAPIParams): void {
    // 结构化输出
    if (input.enabledFeatures?.includes('structured_outputs')) {
      if (input.extra?.json_schema) {
        params.text = {
          type: 'json_schema',
          json_schema: input.extra.json_schema
        };
      } else if (input.extra?.json_mode) {
        params.text = {
          type: 'json_object'
        };
      }
    }

    // 会话状态管理
    if (input.extra?.conversation) {
      params.conversation = input.extra.conversation;
    }

    if (input.extra?.previous_response_id) {
      params.previous_response_id = input.extra.previous_response_id;
    }

    // 其他高级参数
    if (input.extra?.include) {
      params.include = input.extra.include;
    }

    if (input.extra?.store !== undefined) {
      params.store = input.extra.store;
    }
  }
}

/**
 * 创建Responses API翻译器实例
 */
export function createResponsesTranslator(): OpenAIResponsesTranslator {
  return new OpenAIResponsesTranslator();
}
