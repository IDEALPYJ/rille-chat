/**
 * OpenAI服务商能力定义
 * 定义OpenAI支持的所有API参数、内置工具、特性等
 */

import { ProviderCapabilities } from '../types';

/**
 * OpenAI Responses API 能力定义
 */
export const ResponsesAPICapabilities: ProviderCapabilities = {
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

    // 推理参数
    reasoning: {
      type: 'object',
      properties: {
        effort: {
          type: 'string',
          enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
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

    stream_options: {
      type: 'object',
      properties: {
        include_usage: {
          type: 'boolean',
          description: 'Whether to include usage information in the stream'
        }
      },
      description: 'Options for streaming responses'
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

    store: {
      type: 'boolean',
      description: 'Whether to store the generated model response'
    },

    conversation: {
      type: 'string | object',
      description: 'The conversation that this response belongs to'
    },

    previous_response_id: {
      type: 'string',
      description: 'The unique ID of the previous response to the model'
    },

    include: {
      type: 'array',
      description: 'Specify additional output data to include in the model response'
    },

    prompt_cache_key: {
      type: 'string',
      description: 'Used by OpenAI to cache responses for similar requests'
    },

    prompt_cache_retention: {
      type: 'string',
      enum: ['24h'],
      description: 'The retention policy for the prompt cache'
    },

    safety_identifier: {
      type: 'string',
      description: 'A stable identifier used to help detect users violating policies'
    },

    service_tier: {
      type: 'string',
      enum: ['auto', 'default', 'flex', 'priority'],
      description: 'Specifies the processing type used for serving the request'
    },

    truncation: {
      type: 'string',
      enum: ['auto', 'disabled'],
      description: 'The truncation strategy to use for the model response'
    },

    top_logprobs: {
      type: 'number',
      range: [0, 20],
      description: 'Number of most likely tokens to return at each token position'
    },

    background: {
      type: 'boolean',
      description: 'Whether to run the model response in the background'
    },

    prompt: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        variables: { type: 'object' }
      },
      description: 'Reference to a prompt template and its variables'
    }
  },

  builtinTools: {
    web_search: {
      apiFormat: { type: 'web_search' },
      options: ['user_location', 'filters', 'external_web_access'],
      description: 'Allow models to search the web for latest information'
    },

    code_interpreter: {
      apiFormat: { type: 'code_interpreter' },
      options: ['container'],
      description: 'Allow models to write and run Python code'
    },

    image_generation: {
      apiFormat: { type: 'image_generation' },
      options: [],
      description: 'Generate or edit images using GPT Image'
    },

    file_search: {
      apiFormat: { type: 'file_search' },
      options: ['vector_store_ids'],
      description: 'Search the contents of uploaded files'
    },

    computer: {
      apiFormat: { type: 'computer' },
      options: [],
      description: 'Enable models to control a computer interface'
    },

    apply_patch: {
      apiFormat: { type: 'apply_patch' },
      options: [],
      description: 'Allow models to propose structured diffs'
    },

    shell: {
      apiFormat: { type: 'shell' },
      options: [],
      description: 'Allow models to run shell commands'
    }
  },

  features: [
    'reasoning',
    'function_call',
    'structured_outputs',
    'image_input',
    'file_input',
    'streaming',
    'conversation_state',
    'tool_calling',
    'parallel_tool_calls'
  ],

  parameterConflictRules: {
    // 当推理开启时
    reasoning_enabled: [
      {
        when: { enabled: true },
        hide: ['temperature', 'top_p', 'presence_penalty', 'frequency_penalty']
      }
    ]
  }
};

/**
 * OpenAI Chat Completions API 能力定义 (降级选项)
 */
export const ChatAPICapabilities: ProviderCapabilities = {
  apiType: 'chat',

  parameters: {
    model: {
      type: 'string',
      required: true,
      description: 'Model ID to use for generation'
    },

    messages: {
      type: 'array',
      required: true,
      description: 'Array of messages in the conversation'
    },

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

    max_tokens: {
      type: 'number',
      description: 'Maximum number of tokens to generate'
    },

    stream: {
      type: 'boolean',
      description: 'Whether to stream the response'
    },

    tools: {
      type: 'array',
      description: 'Array of tools the model may call'
    },

    tool_choice: {
      type: 'string | object',
      enum: ['auto', 'none'],
      description: 'How the model should select which tool to use'
    },

    response_format: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['text', 'json_object', 'json_schema']
        }
      },
      description: 'Format of the model response'
    },

    stop: {
      type: 'array',
      description: 'Sequences where the API will stop generating further tokens'
    },

    presence_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on their presence in the text so far'
    },

    frequency_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on their frequency in the text so far'
    },

    seed: {
      type: 'number',
      description: 'Random seed for deterministic sampling'
    }
  },

  builtinTools: {
    // Chat Completions API不直接支持内置工具
    // 需要通过函数调用方式模拟
  },

  features: [
    'function_call',
    'structured_outputs',
    'image_input',
    'streaming',
    'tool_calling'
  ]
};

/**
 * 参数映射表: 模型层参数ID -> API参数名
 */
export const ParameterMappings = {
  // 详细度映射 (通过instructions实现)
  verbosity: {
    responsesAPI: 'instructions',
    chatAPI: 'messages',
    transformer: (value: string) => {
      const verbosityMap: Record<string, string> = {
        low: 'Please provide brief and concise responses.',
        medium: 'Please provide clear and balanced responses.',
        high: 'Please provide detailed and comprehensive explanations.'
      };
      return verbosityMap[value] || verbosityMap.medium;
    }
  },

  // 通用参数映射
  temperature: {
    responsesAPI: 'temperature',
    chatAPI: 'temperature'
  },

  top_p: {
    responsesAPI: 'top_p',
    chatAPI: 'top_p'
  },

  max_tokens: {
    responsesAPI: 'max_output_tokens',
    chatAPI: 'max_tokens'
  },

  max_completion_tokens: {
    responsesAPI: 'reasoning.max_completion_tokens',
    chatAPI: 'max_completion_tokens'
  }
};

/**
 * 获取指定API类型的能力定义
 */
export function getCapabilities(apiType: 'responses' | 'chat'): ProviderCapabilities {
  return apiType === 'responses' ? ResponsesAPICapabilities : ChatAPICapabilities;
}
