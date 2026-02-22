/**
 * xAI 服务商能力定义
 * 定义 xAI 支持的所有 API 参数、内置工具、特性等
 * xAI 使用 OpenAI 兼容的 Responses API
 */

import { ProviderCapabilities } from '../types';

/**
 * xAI Responses API 能力定义
 */
export const XAICapabilities: ProviderCapabilities = {
  apiType: 'responses',

  parameters: {
    // 基础参数
    model: {
      type: 'string',
      required: true,
      description: 'Model ID to use for generation'
    },

    input: {
      type: 'string | array',
      required: false,
      description: 'Text, image, or file inputs to the model'
    },

    // xAI 使用 developer 作为 system 的别名
    instructions: {
      type: 'string',
      required: false,
      description: 'System (or developer) message inserted into the model\'s context'
    },

    // 采样参数
    temperature: {
      type: 'number',
      range: [0, 2],
      description: 'Sampling temperature between 0 and 2'
    },

    top_p: {
      type: 'number',
      range: [0, 1],
      description: 'Nucleus sampling parameter'
    },

    // 推理参数 - xAI 支持 reasoning
    reasoning: {
      type: 'object',
      properties: {
        effort: {
          type: 'string',
          enum: ['minimal', 'low', 'medium', 'high'],
          description: 'Reasoning effort level for reasoning models'
        },
        summary: {
          type: 'string',
          enum: ['auto', 'detailed', 'concise'],
          description: 'Reasoning summary detail level'
        }
      },
      description: 'Configuration options for reasoning models'
    },

    // 工具参数
    tools: {
      type: 'array',
      description: 'Array of tools the model may call'
    },

    tool_choice: {
      type: 'string | object',
      enum: ['auto', 'none', 'required'],
      description: 'How the model should select which tool to use'
    },

    max_tool_calls: {
      type: 'number',
      description: 'Maximum number of total calls to built-in tools'
    },

    parallel_tool_calls: {
      type: 'boolean',
      description: 'Whether to allow the model to run tool calls in parallel'
    },

    // 输出控制
    max_output_tokens: {
      type: 'number',
      description: 'Upper bound for the number of tokens that can be generated'
    },

    text: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['text', 'json_object', 'json_schema']
        },
        json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            schema: { type: 'object' },
            strict: { type: 'boolean' }
          }
        }
      },
      description: 'Configuration options for text response'
    },

    // 流式参数
    stream: {
      type: 'boolean',
      description: 'Whether to stream the response'
    },

    // xAI 特有: 是否存储响应
    store: {
      type: 'boolean',
      description: 'Whether to store the generated model response on xAI servers'
    },

    // xAI 特有: 前一个响应 ID（用于继续对话）
    previous_response_id: {
      type: 'string',
      description: 'The unique ID of the previous response to continue the conversation'
    },

    // xAI 特有: 包含的额外数据
    include: {
      type: 'array',
      description: 'Specify additional output data to include (e.g., "reasoning.encrypted_content")'
    },

    // 其他参数
    stop: {
      type: 'array',
      description: 'Sequences where the API will stop generating further tokens'
    },

    metadata: {
      type: 'map',
      description: 'Set of key-value pairs for storing additional information'
    },

    truncation: {
      type: 'string',
      enum: ['auto', 'disabled'],
      description: 'The truncation strategy to use for the model response'
    }
  },

  builtinTools: {
    // xAI 特有: Web 搜索
    web_search: {
      apiFormat: { type: 'web_search' },
      options: [],
      description: 'Allow models to search the web for latest information'
    },

    // xAI 特有: X (Twitter) 搜索
    x_search: {
      apiFormat: { type: 'x_search' },
      options: [],
      description: 'Allow models to search X (Twitter) for information'
    },

    // xAI 支持: 代码解释器
    code_interpreter: {
      apiFormat: { type: 'code_interpreter' },
      options: [],
      description: 'Allow models to write and run Python code'
    }
  },

  features: [
    'reasoning',
    'function_call',
    'structured_outputs',
    'image_input',
    'streaming',
    'conversation_state',
    'tool_calling',
    'parallel_tool_calls',
    'citations',
    'encrypted_reasoning'
  ],

  parameterConflictRules: {
    // 当推理开启时隐藏某些参数
    reasoning_enabled: [
      {
        when: { enabled: true },
        hide: ['temperature', 'top_p']
      }
    ]
  }
};

/**
 * 参数映射表: 模型层参数ID -> API参数名
 */
export const XAIParameterMappings = {
  temperature: {
    responsesAPI: 'temperature'
  },

  top_p: {
    responsesAPI: 'top_p'
  },

  max_tokens: {
    responsesAPI: 'max_output_tokens'
  },

  reasoning_effort: {
    responsesAPI: 'reasoning.effort'
  },

  // xAI 特有参数
  store: {
    responsesAPI: 'store'
  },

  previous_response_id: {
    responsesAPI: 'previous_response_id'
  },

  include: {
    responsesAPI: 'include'
  }
};

/**
 * 获取 xAI 能力定义
 */
export function getXAICapabilities(): ProviderCapabilities {
  return XAICapabilities;
}
