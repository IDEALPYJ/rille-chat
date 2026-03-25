/**
 * 消息格式转换工具
 * 在统一消息格式和系统消息格式之间转换
 */

import { Message } from '@/lib/types';
import { UnifiedMessage } from './unified-types';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { getFilePathFromUrl } from '@/lib/file-utils';
import { logger } from '@/lib/logger';

/**
 * 文件处理配置
 */
export interface FileProcessingConfig {
  // 是否在本地解析文件（提取文本）
  // true: 在本地解析成文本后传递给模型
  // false: 将文件作为 base64 直接传递给模型
  parseLocally?: boolean;
  // 最大文件大小（字节），超过此大小的文件将不会被转换为 base64
  maxFileSizeForBase64?: number;
}

// 默认配置：PDF/Word/Excel/PPT 在本地解析，图像直接上传
const defaultFileConfig: FileProcessingConfig = {
  parseLocally: true,
  maxFileSizeForBase64: 10 * 1024 * 1024, // 10MB
};

/**
 * 将文件转换为 base64 data URL
 */
async function convertFileToBase64(
  url: string, 
  fileId?: string, 
  mimeType?: string
): Promise<string | null> {
  try {
    // 从 URL 获取文件路径
    const filePath = await getFilePathFromUrl(url, fileId);
    if (!filePath) {
      logger.warn(`Cannot find file path for URL: ${url}`);
      return null;
    }

    // 读取文件并转换为 base64
    const buffer = await readFile(filePath);
    const base64 = buffer.toString('base64');
    
    // 根据文件扩展名确定 MIME 类型
    const ext = filePath.split('.').pop()?.toLowerCase();
    let detectedMimeType = mimeType || 'application/octet-stream';
    
    // 图像类型
    if (ext === 'png') detectedMimeType = 'image/png';
    else if (ext === 'jpg' || ext === 'jpeg') detectedMimeType = 'image/jpeg';
    else if (ext === 'gif') detectedMimeType = 'image/gif';
    else if (ext === 'webp') detectedMimeType = 'image/webp';
    else if (ext === 'bmp') detectedMimeType = 'image/bmp';
    // 文档类型
    else if (ext === 'pdf') detectedMimeType = 'application/pdf';
    else if (ext === 'doc') detectedMimeType = 'application/msword';
    else if (ext === 'docx') detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === 'xls') detectedMimeType = 'application/vnd.ms-excel';
    else if (ext === 'xlsx') detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === 'ppt') detectedMimeType = 'application/vnd.ms-powerpoint';
    else if (ext === 'pptx') detectedMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    // 文本类型
    else if (ext === 'txt') detectedMimeType = 'text/plain';
    else if (ext === 'csv') detectedMimeType = 'text/csv';
    else if (ext === 'json') detectedMimeType = 'application/json';
    
    return `data:${detectedMimeType};base64,${base64}`;
  } catch (err) {
    logger.error(`Failed to convert file to base64: ${url}`, err);
    return null;
  }
}

/**
 * 判断文件类型是否应该以 base64 格式直接上传
 * （而不是在本地解析成文本）
 */
function shouldUploadAsBase64(mimeType: string, fileName: string): boolean {
  // 图像文件：直接上传 base64
  if (mimeType.startsWith('image/')) return true;
  
  // 视频文件：直接上传（如果模型支持）
  if (mimeType.startsWith('video/')) return true;
  
  // 音频文件：直接上传（如果模型支持）
  if (mimeType.startsWith('audio/')) return true;
  
  // 其他文件类型默认在本地解析
  return false;
}

/**
 * 将系统 Message 格式转换为 UnifiedMessage 格式
 * @param messages 消息列表
 * @param config 文件处理配置
 */
export async function convertToUnifiedMessages(
  messages: Message[],
  config: FileProcessingConfig = defaultFileConfig
): Promise<UnifiedMessage[]> {
  return Promise.all(messages.map(async (msg) => {
    const unified: UnifiedMessage = {
      role: msg.role === 'data' ? 'user' : msg.role, // 将 'data' 转换为 'user'
      content: msg.content,
    };

    // 如果有 attachments，转换为 content 数组格式
    if (msg.attachments && msg.attachments.length > 0) {
      const contentParts: Array<{
        type: 'text' | 'image_url' | 'video_url' | 'file_url';
        text?: string;
        image_url?: { url: string };
        video_url?: { url: string };
        file_url?: { url: string };
      }> = [
        { type: 'text', text: msg.content },
      ];

      for (const attachment of msg.attachments) {
        // 判断是否应该直接上传为 base64
        const uploadAsBase64 = shouldUploadAsBase64(attachment.type, attachment.name);

        if (uploadAsBase64) {
          // 将文件转换为 base64 data URL
          const base64Url = await convertFileToBase64(attachment.url, attachment.id, attachment.type);
          if (base64Url) {
            if (attachment.type.startsWith('image/')) {
              contentParts.push({
                type: 'image_url',
                image_url: { url: base64Url },
              });
            } else if (attachment.type.startsWith('video/')) {
              contentParts.push({
                type: 'video_url',
                video_url: { url: base64Url },
              });
            } else {
              // 其他文件类型（PDF、Word等）也作为 file_url 上传
              contentParts.push({
                type: 'file_url',
                file_url: { url: base64Url },
              });
            }
          } else {
            // 如果转换失败，保留原始 URL
            contentParts.push({
              type: 'file_url',
              file_url: { url: attachment.url },
            });
          }
        }
        // 如果不是直接上传 base64，则保留附件信息
        // 文本提取在 file-helper.ts 中处理
      }

      unified.content = contentParts;
    }

    return unified;
  }));
}

/**
 * 将 CommonSettings 从 AdvancedSettings 转换
 */
import { AdvancedSettings } from '@/lib/types';
import { CommonSettings } from './unified-types';

export function convertToCommonSettings(advancedSettings?: AdvancedSettings): CommonSettings {
  if (!advancedSettings) {
    return {};
  }

  const settings: CommonSettings = {
    temperature: advancedSettings.temperature,
    top_p: advancedSettings.topP,
    top_k: advancedSettings.topK,
    presence_penalty: advancedSettings.presencePenalty,
    frequency_penalty: advancedSettings.frequencyPenalty,
    seed: advancedSettings.seed,
    stop: advancedSettings.stopSequences && advancedSettings.stopSequences.length > 0
      ? advancedSettings.stopSequences
      : undefined,
  };

  // 传递 OpenRouter 等服务商特有的参数
  if (advancedSettings.engine) {
    settings.engine = advancedSettings.engine;
  }
  if (advancedSettings.verbosity) {
    settings.verbosity = advancedSettings.verbosity;
  }
  if (advancedSettings.search_strategy !== undefined) {
    settings.search_strategy = advancedSettings.search_strategy;
  }
  if (advancedSettings.max_results !== undefined) {
    settings.max_results = advancedSettings.max_results;
  }

  // 传递 Perplexity 特有参数
  if (advancedSettings.search_type !== undefined) {
    settings.search_type = advancedSettings.search_type;
  }
  if (advancedSettings.search_mode !== undefined) {
    settings.search_mode = advancedSettings.search_mode;
  }
  if (advancedSettings.search_context_size !== undefined) {
    settings.search_context_size = advancedSettings.search_context_size;
  }

  // 传递 Zai 智谱AI 特有参数: search_engine
  // 始终传递 search_engine，优先使用用户设置的值，否则使用默认值 'search_std'
  settings.search_engine = advancedSettings.search_engine ?? 'search_std';

  return settings;
}

/**
 * 将 UnifiedMessage 转换为 OpenAI 格式
 */
export function convertUnifiedMessageToOpenAI(message: UnifiedMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (message.role === 'tool') {
    const toolMsg: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
      role: 'tool',
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      tool_call_id: message.tool_call_id!,
    };
    // 添加 name 字段（如果存在）
    if (message.name) {
      (toolMsg as any).name = message.name;
    }
    return toolMsg;
  }
  
  if (message.role === 'assistant' && message.tool_calls) {
    return {
      role: 'assistant',
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      tool_calls: message.tool_calls,
    };
  }

  // 处理多模态内容
  if (Array.isArray(message.content)) {
    // assistant 和 system 角色不支持 image_url，过滤掉只保留 text
    if (message.role === 'assistant' || message.role === 'system') {
      const textParts = message.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => ({ type: 'text' as const, text: part.text || '' }));
      return {
        role: message.role,
        content: textParts.length > 0 ? textParts : '',
      } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
    }

    const contentParts = message.content.map((part: any) => {
      if (part.type === 'text') {
        return { type: 'text' as const, text: part.text || '' };
      } else if (part.type === 'image_url') {
        return { type: 'image_url' as const, image_url: part.image_url || { url: '' } };
      } else if (part.type === 'video_url') {
        // 视频URL转换为image_url格式（部分模型支持）
        // 注意：OpenAI API 目前不直接支持视频，这里保留video_url供特定适配器处理
        return { type: 'image_url' as const, image_url: part.video_url || { url: '' } };
      }
      return { type: 'text' as const, text: JSON.stringify(part) };
    });

    return {
      role: 'user' as const,
      content: contentParts,
    };
  }

  if (message.role === 'assistant') {
    return {
      role: 'assistant' as const,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    };
  }
  if (message.role === 'system') {
    return {
      role: 'system' as const,
      content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
    };
  }
  return {
    role: 'user' as const,
    content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
  };
}
