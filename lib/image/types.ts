/**
 * 图像生成通用类型定义
 * 用于统一不同 provider 的图像生成接口
 */

/**
 * 图像生成请求参数
 */
export interface ImageGenerationRequest {
  /** 提示词 */
  prompt: string;
  /** 模型ID */
  model: string;
  /** Provider ID */
  provider: string;
  /** 生成数量 */
  count?: number;
  /** 尺寸 (如 "1024x1024") */
  size?: string;
  /** 质量 */
  quality?: 'low' | 'medium' | 'high' | 'auto' | 'standard' | 'hd';
  /** 背景透明 */
  background?: 'transparent' | 'opaque' | 'auto';
  /** 输出格式 */
  output_format?: 'png' | 'jpeg' | 'webp';
  /** 输出压缩级别 (0-100) */
  output_compression?: number;
  /** 参考图片 (base64 或 URL) */
  referenceImages?: string[];
  /** 遮罩图片 (用于局部编辑) */
  mask?: string;
  /** 输入保真度 */
  input_fidelity?: 'low' | 'high';
  /** 随机种子 */
  seed?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 部分图片数量 */
  partial_images?: number;
  /** 内容审核级别 */
  moderation?: 'auto' | 'low';
  
  // Bailian 特有参数
  /** 反向提示词 */
  negative_prompt?: string;
  /** 智能改写 */
  prompt_extend?: boolean;
  /** 水印 */
  watermark?: boolean;
  /** 图文混排 */
  enable_interleave?: boolean;
  /** 最大图片数 */
  max_images?: number;
  /** 编辑模式下的生成数量 */
  n?: number;
}

/**
 * 图像编辑请求参数
 */
export interface ImageEditRequest extends ImageGenerationRequest {
  /** 必须提供参考图片 */
  referenceImages: string[];
  /** 可选遮罩 */
  mask?: string;
}

/**
 * 图像生成响应
 */
export interface ImageGenerationResponse {
  /** 生成的图片 URL 列表 */
  images: string[];
  /** 使用的模型 */
  model: string;
  /** 生成的图片数量 */
  count: number;
  /** 响应时间戳 */
  created?: number;
  /** Token 使用情况 (如果可用) */
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: {
      text_tokens?: number;
      image_tokens?: number;
    };
    output_tokens_details?: {
      text_tokens?: number;
      image_tokens?: number;
    };
  };
  /** 修订后的提示词 */
  revised_prompt?: string;
}

/**
 * 图像生成适配器接口
 * 每个 provider 需要实现此接口
 */
export interface ImageGenerationAdapter {
  /**
   * 生成图像
   * @param request 图像生成请求
   * @returns 生成的图片 URL 列表
   */
  generate(request: ImageGenerationRequest): Promise<string[]>;

  /**
   * 编辑图像 (可选实现)
   * @param request 图像编辑请求
   * @returns 编辑后的图片 URL 列表
   */
  edit?(request: ImageEditRequest): Promise<string[]>;

  /**
   * 生成图像变体 (可选实现)
   * @param request 图像生成请求
   * @returns 生成的图片 URL 列表
   */
  variations?(request: ImageGenerationRequest): Promise<string[]>;
}

/**
 * 图像模型能力定义
 */
export interface ImageModelCapabilities {
  /** 支持的特性 */
  features: ('image_generation' | 'image_edit' | 'mask_edit' | 'multi_reference' | 'streaming' | 'variations')[];
  /** 支持的参数 */
  parameters: {
    quality?: {
      type: 'select';
      options: ('low' | 'medium' | 'high' | 'auto')[];
      default: string;
    };
    size?: {
      type: 'select' | 'custom';
      options?: string[];
      default: string;
      min?: number;
      max?: number;
    };
    background?: {
      type: 'select';
      options: ('transparent' | 'opaque' | 'auto')[];
      default: string;
    };
    output_format?: {
      type: 'select';
      options: ('png' | 'jpeg' | 'webp')[];
      default: string;
    };
    n?: {
      type: 'number';
      min: number;
      max: number;
      default: number;
    };
    input_fidelity?: {
      type: 'select';
      options: ('low' | 'high')[];
      default: string;
    };
  };
  /** 最大参考图片数量 */
  maxReferenceImages?: number;
  /** 是否支持遮罩编辑 */
  supportsMask?: boolean;
  /** 是否使用 Responses API (而非 Image API) */
  useResponsesAPI?: boolean;
}

/**
 * Provider 图像能力配置
 */
export interface ProviderImageCapabilities {
  /** Provider ID */
  providerId: string;
  /** API 类型 */
  apiType: string;
  /** 支持的模型及其能力 */
  models: Record<string, ImageModelCapabilities>;
  /** 通用特性 */
  features: string[];
}

/**
 * 图像生成错误类型
 */
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public provider?: string
  ) {
    super(message);
    this.name = 'ImageGenerationError';
  }
}

/**
 * 图像尺寸工具函数
 */
export const ImageSizeUtils = {
  /**
   * 解析尺寸字符串
   * @param size 尺寸字符串 (如 "1024x1024" 或 "1024*1024")
   * @returns [width, height]
   */
  parseSize(size: string): [number, number] {
    const match = size.match(/(\d+)[x×*](\d+)/);
    if (!match) {
      throw new Error(`Invalid size format: ${size}`);
    }
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
  },

  /**
   * 将尺寸转换为 OpenAI 格式
   * @param size 尺寸字符串
   * @returns OpenAI 格式的尺寸 (如 "1024x1024")
   */
  toOpenAIFormat(size: string): string {
    const [width, height] = this.parseSize(size);
    return `${width}x${height}`;
  },

  /**
   * 将尺寸转换为 Bailian 格式
   * @param size 尺寸字符串
   * @returns Bailian 格式的尺寸 (如 "1024*1024")
   */
  toBailianFormat(size: string): string {
    const [width, height] = this.parseSize(size);
    return `${width}*${height}`;
  },

  /**
   * 验证尺寸是否在允许范围内
   * @param size 尺寸字符串
   * @param min 最小尺寸
   * @param max 最大尺寸
   * @returns 是否有效
   */
  validateSize(size: string, min: number, max: number): boolean {
    try {
      const [width, height] = this.parseSize(size);
      return width >= min && width <= max && height >= min && height <= max;
    } catch {
      return false;
    }
  },

  /**
   * 计算宽高比
   * @param size 尺寸字符串
   * @returns 宽高比 (width / height)
   */
  getAspectRatio(size: string): number {
    const [width, height] = this.parseSize(size);
    return width / height;
  },
};
