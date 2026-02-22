/**
 * Gemini generateContent API 参数翻译器
 * 将 TranslatorInput 转为 Gemini API 请求体
 */

import { TranslatorInput, ParameterTranslator } from '../types';
import { UnifiedMessage } from '@/lib/chat/protocols/unified-types';
import { getReasoningConfig } from '@/lib/chat/reasoning-utils';

export class GeminiTranslator implements ParameterTranslator<TranslatorInput, any> {
  translate(input: TranslatorInput): any {
    const { modelConfig, messages, userSettings, reasoning, instructions } = input;

    let contents = this.convertMessagesToGeminiFormat(messages);
    if (contents.length === 0) {
      contents = [{ role: 'user' as const, parts: [{ text: ' ' }] }];
    }
    const systemInstruction = this.extractSystemInstruction(messages, instructions);

    const generationConfig: Record<string, unknown> = {};
    if (userSettings.temperature !== undefined) generationConfig.temperature = userSettings.temperature;
    if (userSettings.top_p !== undefined) generationConfig.topP = userSettings.top_p;
    if (userSettings.top_k !== undefined) generationConfig.topK = userSettings.top_k;
    if (userSettings.max_tokens !== undefined) generationConfig.maxOutputTokens = userSettings.max_tokens;
    if (userSettings.stop && userSettings.stop.length > 0) generationConfig.stopSequences = userSettings.stop;

    // 推理参数 (thinkingConfig 必须放在 generationConfig 内)
    // Gemini 3 Pro 不支持 thinkingLevel "none"，需过滤无效值
    if (reasoning?.enabled) {
      const config = getReasoningConfig(modelConfig, reasoning.effort_mode);
      if (config && config.kind === 'effort') {
        const thinkingConfig: Record<string, unknown> = {};
        if (config.baseParams?.thinkingConfig) {
          Object.assign(thinkingConfig, config.baseParams.thinkingConfig);
        }
        const effortVal = reasoning.effort;
        const supportedOptions = new Set(
          config.options.map((o) => (typeof o === 'object' && 'value' in o ? (o as { value: string }).value : String(o)))
        );
        const isValidEffort =
          effortVal !== undefined &&
          effortVal !== 'none' &&
          supportedOptions.has(String(effortVal));
        if (isValidEffort) {
          const field = config.fieldPath?.replace('thinkingConfig.', '') || 'thinkingLevel';
          thinkingConfig[field] = effortVal;
        }
        if (Object.keys(thinkingConfig).length > 0) {
          generationConfig.thinkingConfig = thinkingConfig;
        }
      }
    }

    const requestBody: any = {
      contents,
      generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
    };
    if (!requestBody.generationConfig) delete requestBody.generationConfig;

    if (systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    // 内置工具
    const tools = this.buildTools(input);
    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    return requestBody;
  }

  private extractSystemInstruction(messages: UnifiedMessage[], instructions?: string): string | undefined {
    let system: string | undefined = instructions;
    for (const msg of messages) {
      if (msg.role === 'system') {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        system = system ? `${system}\n\n${content}` : content;
      }
    }
    return system;
  }

  private convertMessagesToGeminiFormat(messages: UnifiedMessage[]): any[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => {
        const parts: any[] = [];

        // 处理 tool 角色的消息 - 使用 functionResponse 格式
        if (msg.role === 'tool') {
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          // 从 tool_call_id 中提取函数名（格式通常是 "call_0" -> 需要找到对应的函数名）
          // 或者使用 name 字段（如果存在）
          const functionName = msg.name || 'unknown_function';
          parts.push({
            functionResponse: {
              name: functionName,
              response: {
                result: content,
              },
            },
          });

          return {
            role: 'user',
            parts,
          };
        }

        // 处理 assistant 角色的消息 - 检查是否有 tool_calls
        if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
          // 添加文本内容（如果有）
          if (typeof msg.content === 'string' && msg.content.trim()) {
            parts.push({ text: msg.content });
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text' && part.text) {
                parts.push({ text: part.text });
              }
            }
          }
          
          // 添加 functionCall 部分
          for (let i = 0; i < msg.tool_calls.length; i++) {
            const toolCall = msg.tool_calls[i];
            if (toolCall.function) {
              const functionCallPart: any = {
                functionCall: {
                  name: toolCall.function.name,
                  args: JSON.parse(toolCall.function.arguments || '{}'),
                },
              };
              // Gemini 3 需要 thought_signature 来维护函数调用上下文
              // 第一个 functionCall 必须包含 thought_signature
              // 使用虚拟签名跳过验证（根据 Google 文档）
              if (i === 0) {
                functionCallPart.thoughtSignature = 'skip_thought_signature_validator';
              }
              parts.push(functionCallPart);
            }
          }
          
          return {
            role: 'model',
            parts,
          };
        }

        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content || ' ' });
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url' && part.image_url?.url) {
              parts.push({ text: `[Image: ${part.image_url.url}]` });
            }
          }
        }
        if (parts.length === 0) parts.push({ text: ' ' });

        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        };
      })
      .filter((c) => c.parts.length > 0);
  }

  /**
   * 清理 Gemini 不支持的参数字段
   * Gemini API 不支持 additionalProperties 字段
   */
  private sanitizeGeminiParameters(parameters: any): any {
    if (!parameters || typeof parameters !== 'object') {
      return { type: 'object', properties: {} };
    }

    // 创建参数的副本，避免修改原始对象
    const sanitized = { ...parameters };

    // 移除 Gemini 不支持的字段
    delete sanitized.additionalProperties;

    // 递归清理 properties 中的字段
    if (sanitized.properties && typeof sanitized.properties === 'object') {
      const cleanedProperties: Record<string, any> = {};
      for (const [key, value] of Object.entries(sanitized.properties)) {
        if (value && typeof value === 'object') {
          cleanedProperties[key] = this.sanitizeGeminiParameters(value);
        } else {
          cleanedProperties[key] = value;
        }
      }
      sanitized.properties = cleanedProperties;
    }

    // 递归清理 items 中的字段（用于数组类型）
    if (sanitized.items && typeof sanitized.items === 'object') {
      sanitized.items = this.sanitizeGeminiParameters(sanitized.items);
    }

    return sanitized;
  }

  private buildTools(input: TranslatorInput): any[] {
    const tools: any[] = [];
    const builtinTools = input.modelConfig.builtinTools || [];
    const enabled = input.enabledTools || [];

    // google_search: builtinTools 使用 google_search，enabledTools 可能为 web_search（统一入口）
    if (
      builtinTools.includes('google_search') &&
      (enabled.includes('google_search') || enabled.includes('web_search'))
    ) {
      tools.push({ googleSearch: {} });
    }

    // code_execution
    if (enabled.includes('code_execution') && builtinTools.includes('code_execution')) {
      tools.push({ codeExecution: {} });
    }

    // 外部 / MCP 函数工具
    if (input.extra?.tools && Array.isArray(input.extra.tools) && input.extra.tools.length > 0) {
      const functionDeclarations = input.extra.tools
        .filter((t: any) => t.type === 'function' && t.function)
        .map((t: any) => ({
          name: t.function.name,
          description: t.function.description || '',
          parameters: this.sanitizeGeminiParameters(t.function.parameters),
        }));
      if (functionDeclarations.length > 0) {
        tools.push({ functionDeclarations });
      }
    }

    return tools;
  }
}
