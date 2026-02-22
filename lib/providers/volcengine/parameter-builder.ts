/**
 * Volcengine 参数构建器
 * 将通用请求转换为 Volcengine 特定的请求体
 */

import type { ImageGenerationRequest } from '@/lib/image/types';
import type { RequestBuilder } from '@/lib/providers/base/types';
import type {
  VolcengineImageGenerationBody,
  VolcengineImageGenerationRequest,
} from './types';

export class VolcengineParameterBuilder
  implements RequestBuilder<VolcengineImageGenerationBody>
{
  /**
   * 构建 Volcengine 图像生成请求体
   */
  build(request: ImageGenerationRequest): VolcengineImageGenerationBody {
    const volcRequest = request as VolcengineImageGenerationRequest;

    const body: VolcengineImageGenerationBody = {
      model: request.model,
      prompt: request.prompt,
      n: request.count || 1,
      response_format: 'url',
    };

    // 处理尺寸参数
    const size = this.resolveSize(volcRequest);
    if (size) {
      body.size = size;
    }

    // 处理参考图片
    if (request.referenceImages && request.referenceImages.length > 0) {
      if (request.referenceImages.length === 1) {
        body.image = request.referenceImages[0];
      } else {
        body.image = request.referenceImages;
      }
    }

    // 处理组图生成
    if (volcRequest.sequential_image_generation) {
      body.sequential_image_generation = volcRequest.sequential_image_generation;
      if (volcRequest.sequential_image_generation === 'auto') {
        body.sequential_image_generation_options = {
          max_images: Math.min(request.count || 15, 15),
        };
      }
    }

    // 处理水印
    if (request.watermark !== undefined) {
      body.watermark = request.watermark;
    }

    // 处理提示词优化选项
    if (volcRequest.optimize_prompt_options) {
      body.optimize_prompt_options = {
        mode: volcRequest.optimize_prompt_options,
      };
    }

    // 处理流式输出
    if (request.stream !== undefined) {
      body.stream = request.stream;
    }

    return body;
  }

  /**
   * 验证请求参数
   */
  validate(request: ImageGenerationRequest): void {
    const volcRequest = request as VolcengineImageGenerationRequest;

    // 验证自定义分辨率
    if (
      volcRequest.resolution_width !== undefined ||
      volcRequest.resolution_height !== undefined
    ) {
      const width = volcRequest.resolution_width || 1024;
      const height = volcRequest.resolution_height || 1024;

      const MIN_WIDTH = 480;
      const MAX_WIDTH = 16384;
      const MIN_HEIGHT = 480;
      const MAX_HEIGHT = 16384;

      if (width < MIN_WIDTH || width > MAX_WIDTH) {
        throw new Error(
          `Invalid resolution width: ${width}. Must be between ${MIN_WIDTH} and ${MAX_WIDTH}`
        );
      }

      if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        throw new Error(
          `Invalid resolution height: ${height}. Must be between ${MIN_HEIGHT} and ${MAX_HEIGHT}`
        );
      }
    }
  }

  /**
   * 解析尺寸参数
   * 优先级: size > resolution > resolution_width + resolution_height
   */
  private resolveSize(
    request: VolcengineImageGenerationRequest
  ): string | undefined {
    // 直接使用 size 参数
    if (request.size) {
      return request.size;
    }

    // 使用 resolution 预设
    if (request.resolution) {
      return request.resolution;
    }

    // 使用自定义分辨率
    if (request.resolution_width && request.resolution_height) {
      return `${request.resolution_width}x${request.resolution_height}`;
    }

    return undefined;
  }
}
