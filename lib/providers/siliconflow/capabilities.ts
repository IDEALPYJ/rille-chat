/**
 * SiliconFlow 服务商能力定义
 * 定义 SiliconFlow 支持的所有 API 参数、内置工具、特性等
 */

import { ProviderCapabilities } from '../types';

/**
 * SiliconFlow Chat Completions API 能力定义
 */
export const SiliconFlowCapabilities: ProviderCapabilities = {
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

    top_k: {
      type: 'number',
      description: 'Top-K sampling parameter'
    },

    max_tokens: {
      type: 'number',
      description: 'Maximum number of tokens to generate'
    },

    stream: {
      type: 'boolean',
      description: 'Whether to stream the response'
    },

    stop: {
      type: 'array',
      description: 'Sequences where the API will stop generating'
    },

    presence_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on presence'
    },

    frequency_penalty: {
      type: 'number',
      range: [-2, 2],
      description: 'Penalty for new tokens based on frequency'
    },

    n: {
      type: 'number',
      description: 'Number of generations to return'
    },

    enable_thinking: {
      type: 'boolean',
      description: 'Enable thinking mode for reasoning models'
    },

    thinking_budget: {
      type: 'number',
      range: [128, 32768],
      description: 'Maximum tokens for chain-of-thought output'
    },

    min_p: {
      type: 'number',
      range: [0, 1],
      description: 'Dynamic filtering threshold based on token probabilities'
    },

    response_format: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['text', 'json_object', 'json_schema']
        }
      },
      description: 'Specify the format that the model must output'
    },

    tools: {
      type: 'array',
      description: 'List of tools the model may call'
    }
  },

  builtinTools: {},

  features: [
    'streaming',
    'structured_outputs',
    'reasoning',
    'function_call',
    'prompt_caching'
  ]
};

export const SiliconFlowParameterMappings = {
  temperature: {
    chatAPI: 'temperature'
  },

  top_p: {
    chatAPI: 'top_p'
  },

  top_k: {
    chatAPI: 'top_k'
  },

  max_tokens: {
    chatAPI: 'max_tokens'
  },

  stop: {
    chatAPI: 'stop'
  },

  presence_penalty: {
    chatAPI: 'presence_penalty'
  },

  frequency_penalty: {
    chatAPI: 'frequency_penalty'
  },

  n: {
    chatAPI: 'n'
  },

  enable_thinking: {
    chatAPI: 'enable_thinking'
  },

  thinking_budget: {
    chatAPI: 'thinking_budget'
  },

  min_p: {
    chatAPI: 'min_p'
  },

  response_format: {
    chatAPI: 'response_format'
  }
};

export function getSiliconFlowCapabilities(): ProviderCapabilities {
  return SiliconFlowCapabilities;
}
