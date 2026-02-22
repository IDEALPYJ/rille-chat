/**
 * Anthropic Messages API 参数翻译器
 * 将 TranslatorInput 转为 Anthropic API 请求体
 */

import { TranslatorInput, ParameterTranslator } from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';
import { getReasoningConfig, setDeep, deepMerge } from '@/lib/chat/reasoning-utils';

export class AnthropicTranslator implements ParameterTranslator<TranslatorInput, any> {
  translate(input: TranslatorInput): any {
    const { modelConfig, messages, userSettings, reasoning, instructions } = input;

    const { system, convertedMessages } = this.convertMessagesToAnthropicFormat(messages, instructions);

    const requestBody: any = {
      model: modelConfig.id,
      max_tokens: userSettings.max_tokens || 4096,
      temperature: userSettings.temperature,
      top_p: userSettings.top_p,
      system: system || undefined,
      messages: convertedMessages,
      stream: true,
    };

    // 推理参数
    if (reasoning?.enabled) {
      const config = getReasoningConfig(modelConfig, reasoning.effort_mode);
      if (config) {
        if (config.baseParams) {
          deepMerge(requestBody, config.baseParams);
        }
        if (reasoning.effort !== undefined) {
          setDeep(config.fieldPath, reasoning.effort, requestBody);
        }
      }
    }

    // 工具（MCP / Function Calling）
    if (input.extra?.tools && Array.isArray(input.extra.tools) && input.extra.tools.length > 0) {
      requestBody.tools = this.convertToolsToAnthropicFormat(input.extra.tools);
      // Anthropic API 要求 tool_choice 是对象格式 { type: 'auto' | 'any' | 'none' }
      const toolChoice = input.extra.tool_choice || 'auto';
      if (typeof toolChoice === 'string') {
        requestBody.tool_choice = { type: toolChoice };
      } else {
        requestBody.tool_choice = toolChoice;
      }
    }

    // Data residency 控制 (Claude Opus 4.6+)
    if (userSettings.inference_geo) {
      requestBody.inference_geo = userSettings.inference_geo;
    }

    // Compaction 上下文压缩 (Claude Opus 4.6+)
    if (userSettings.compaction === 'enabled') {
      requestBody.context_management = {
        edits: [
          {
            type: 'compact_20260112',
            trigger: {
              type: 'input_tokens',
              value: userSettings.compaction_trigger || 150000
            }
          }
        ]
      };
    }

    return requestBody;
  }

  private convertMessagesToAnthropicFormat(
    messages: UnifiedMessage[],
    instructions?: string
  ): { system?: string; convertedMessages: any[] } {
    let system: string | undefined = instructions;
    const convertedMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        system = system ? `${system}\n\n${content}` : content;
        continue;
      }

      if (msg.role === 'user' || msg.role === 'assistant') {
        let content: string | any[] = '';

        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          content = msg.content
            .map((part) => {
              if (part.type === 'text') {
                const text = part.text;
                if (text) return { type: 'text', text: String(text) };
              }
              if (part.type === 'image_url' && part.image_url?.url) {
                return {
                  type: 'image',
                  source: { type: 'url', url: part.image_url.url },
                };
              }
              return null;
            })
            .filter(Boolean) as any[];
        }

        convertedMessages.push({ role: msg.role, content });
      }
    }

    return { system, convertedMessages };
  }

  private convertToolsToAnthropicFormat(openaiTools: any[]): any[] {
    return openaiTools
      .filter((t) => t.type === 'function' && t.function)
      .map((t) => {
        const parameters = t.function.parameters || { type: 'object', properties: {} };
        // 确保每个属性都有 description，MiniMax 对此有严格要求
        const sanitizedProperties: Record<string, any> = {};
        if (parameters.properties && typeof parameters.properties === 'object') {
          for (const [key, value] of Object.entries(parameters.properties)) {
            if (value && typeof value === 'object') {
              sanitizedProperties[key] = {
                ...(value as object),
                description: (value as any).description || `${key} parameter`,
              };
            } else {
              sanitizedProperties[key] = { type: 'string', description: `${key} parameter` };
            }
          }
        }
        return {
          name: t.function.name,
          description: t.function.description || '',
          input_schema: {
            ...parameters,
            properties: sanitizedProperties,
          },
        };
      });
  }
}
