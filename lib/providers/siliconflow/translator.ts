/**
 * SiliconFlow 参数翻译器
 * 负责将模型层配置翻译为 SiliconFlow Chat Completions API 参数
 */

import {
  TranslatorInput,
  ParameterTranslator
} from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';

export interface SiliconFlowChatParams {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | any[];
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
  }>;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
  n?: number;

  enable_thinking?: boolean;
  thinking_budget?: number;
  min_p?: number;

  response_format?: {
    type: 'text' | 'json_object' | 'json_schema';
    json_schema?: {
      name: string;
      schema: Record<string, any>;
      strict?: boolean;
    };
  };

  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, any>;
      strict?: boolean;
    };
  }>;
}

export class SiliconFlowTranslator implements ParameterTranslator<TranslatorInput, SiliconFlowChatParams> {
  translate(input: TranslatorInput): SiliconFlowChatParams {
    const params: SiliconFlowChatParams = {
      model: input.modelConfig.id,
      messages: this.translateMessages(input.messages, input.instructions),
      stream: true
    };

    this.translateBasicParameters(input, params);
    this.translateSiliconFlowParameters(input, params);
    this.translateReasoningParameters(input, params);
    this.translateStructuredOutput(input, params);
    this.translateTools(input, params);

    return params;
  }

  private translateBasicParameters(input: TranslatorInput, params: SiliconFlowChatParams): void {
    const settings = input.userSettings;
    const modelParams = input.modelConfig.parameters || [];

    for (const paramDef of modelParams) {
      let value = settings[paramDef.id as keyof typeof settings];

      if (value === undefined && input.extra) {
        value = input.extra[paramDef.id];
      }

      if (value === undefined) {
        value = paramDef.default as any;
      }

      if ((value as any) === 'true') {
        value = true as any;
      } else if ((value as any) === 'false') {
        value = false as any;
      }

      if (paramDef.mapping && value !== undefined) {
        this.setDeepValue(params, paramDef.mapping, value);
      }
    }

    if (params.temperature === undefined && settings.temperature !== undefined) {
      params.temperature = settings.temperature;
    }
    if (params.top_p === undefined && settings.top_p !== undefined) {
      params.top_p = settings.top_p;
    }
    if (params.max_tokens === undefined && settings.max_tokens !== undefined) {
      params.max_tokens = settings.max_tokens;
    }
    if (params.presence_penalty === undefined && settings.presence_penalty !== undefined) {
      params.presence_penalty = settings.presence_penalty;
    }
    if (params.frequency_penalty === undefined && settings.frequency_penalty !== undefined) {
      params.frequency_penalty = settings.frequency_penalty;
    }
    if (params.stop === undefined && settings.stop && settings.stop.length > 0) {
      params.stop = settings.stop;
    }
    if (params.top_k === undefined && (settings as any).top_k !== undefined) {
      params.top_k = (settings as any).top_k;
    }
  }

  private translateSiliconFlowParameters(input: TranslatorInput, params: SiliconFlowChatParams): void {
    const extra = input.extra || {};

    if (extra.enable_thinking !== undefined) {
      params.enable_thinking = extra.enable_thinking;
    }

    if (extra.thinking_budget !== undefined) {
      params.thinking_budget = extra.thinking_budget;
    }

    if (extra.min_p !== undefined) {
      params.min_p = extra.min_p;
    }

    if (extra.n !== undefined) {
      params.n = extra.n;
    }
  }

  private translateReasoningParameters(input: TranslatorInput, params: SiliconFlowChatParams): void {
    if (!input.modelConfig.features?.includes('reasoning')) {
      return;
    }

    if (!input.reasoning?.enabled) {
      return;
    }

    if (input.reasoning.effort !== undefined) {
      const effortValue = input.reasoning.effort;
      if (typeof effortValue === 'number') {
        params.thinking_budget = effortValue;
      } else if (typeof effortValue === 'string') {
        const budgetMapping = input.modelConfig.reasoning?.intensity?.budget;
        if (budgetMapping) {
          params.thinking_budget = parseInt(effortValue, 10) || budgetMapping.default;
        }
      }
    }

    params.enable_thinking = true;
  }

  private translateStructuredOutput(input: TranslatorInput, params: SiliconFlowChatParams): void {
    if (!input.enabledFeatures?.includes('structured_outputs')) {
      return;
    }

    if (input.extra?.json_schema) {
      params.response_format = {
        type: 'json_schema',
        json_schema: input.extra.json_schema
      };
    } else if (input.extra?.json_mode) {
      params.response_format = {
        type: 'json_object'
      };
    }
  }

  private translateTools(input: TranslatorInput, params: SiliconFlowChatParams): void {
    if (!input.enabledFeatures?.includes('tool_call')) {
      return;
    }

    if (input.extra?.tools && Array.isArray(input.extra.tools) && input.extra.tools.length > 0) {
      params.tools = input.extra.tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.function?.name || tool.name,
          description: tool.function?.description || tool.description,
          parameters: tool.function?.parameters || tool.parameters,
          strict: tool.function?.strict || tool.strict,
        }
      }));

      if (input.extra.tool_choice) {
        (params as any).tool_choice = input.extra.tool_choice;
      }
    }
  }

  private translateMessages(
    messages: UnifiedMessage[],
    instructions?: string
  ): SiliconFlowChatParams['messages'] {
    const result: SiliconFlowChatParams['messages'] = [];

    if (instructions) {
      result.push({
        role: 'system',
        content: instructions
      });
    }

    for (const msg of messages) {
      if (msg.role === 'system' && instructions) {
        continue;
      }

      const message: SiliconFlowChatParams['messages'][0] = {
        role: msg.role as any,
        content: msg.content as any
      };

      if (msg.tool_calls) {
        message.tool_calls = msg.tool_calls;
      }
      if (msg.tool_call_id) {
        message.tool_call_id = msg.tool_call_id;
      }
      if (msg.name) {
        message.name = msg.name;
      }

      result.push(message);
    }

    return result;
  }

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
}

export function createSiliconFlowTranslator(): SiliconFlowTranslator {
  return new SiliconFlowTranslator();
}
