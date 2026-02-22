"use client"


import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ResolutionPicker, CustomResolutionInput } from "./resolution-picker"
import { HelpCircle, Shuffle, AlertCircle, Sparkles, ImageIcon } from "lucide-react"

// 模型参数配置定义
export interface ModelParameterConfig {
  id: string
  type: 'select' | 'boolean' | 'number' | 'string' | 'resolution'
  label: string
  description?: string
  defaultValue: any
  options?: string[]
  min?: number
  max?: number
  step?: number
  maxLength?: number
  priceHint?: string
  visibleWhen?: Record<string, boolean | string | number>
}

// Bailian 模型配置
const BAILIAN_MODEL_CONFIGS: Record<string, {
  name: string
  type: 'image_generation' | 'image_edit'
  parameters: ModelParameterConfig[]
}> = {
  'qwen-image-max': {
    name: 'Qwen Image Max',
    type: 'image_generation',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1664*928',
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'qwen-image-plus': {
    name: 'Qwen Image Plus',
    type: 'image_generation',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1664*928',
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'qwen-image': {
    name: 'Qwen Image',
    type: 'image_generation',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1664*928',
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'qwen-image-edit-max': {
    name: 'Qwen Image Edit Max',
    type: 'image_edit',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率（可选，默认与输入图相似）',
        defaultValue: '1024*1024',
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '输出图像的数量',
        defaultValue: 1,
        min: 1,
        max: 6,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'qwen-image-edit-plus': {
    name: 'Qwen Image Edit Plus',
    type: 'image_edit',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率（可选，默认与输入图相似）',
        defaultValue: '1024*1024',
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '输出图像的数量',
        defaultValue: 1,
        min: 1,
        max: 6,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'qwen-image-edit': {
    name: 'Qwen Image Edit',
    type: 'image_edit',
    parameters: [
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '仅支持输出1张图片',
        defaultValue: 1,
        min: 1,
        max: 1,
        step: 1,
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'z-image-turbo': {
    name: 'Z-Image Turbo',
    type: 'image_generation',
    parameters: [
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1024*1536',
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后将返回优化后的提示词及推理过程',
        defaultValue: false,
        priceHint: '开启后价格更高',
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
  'wan2.6-image': {
    name: 'Wan2.6 Image',
    type: 'image_generation',
    parameters: [
      {
        id: 'enable_interleave',
        type: 'boolean',
        label: '图文混排',
        description: '开启后生成图文并茂的内容（仅支持流式输出）',
        defaultValue: true,
      },
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1280*1280',
        visibleWhen: { enable_interleave: false },
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '图像编辑模式下生成图片数量',
        defaultValue: 4,
        min: 1,
        max: 4,
        step: 1,
        priceHint: '按生成图片数量计费',
        visibleWhen: { enable_interleave: false },
      },
      {
        id: 'max_images',
        type: 'number',
        label: '最大图片数',
        description: '图文混排模式下最大生成图片数量',
        defaultValue: 5,
        min: 1,
        max: 5,
        step: 1,
        priceHint: '按生成图片数量计费',
        visibleWhen: { enable_interleave: true },
      },
      {
        id: 'negative_prompt',
        type: 'string',
        label: '反向提示词',
        description: '描述不希望在画面中出现的内容',
        defaultValue: '',
        maxLength: 500,
      },
      {
        id: 'prompt_extend',
        type: 'boolean',
        label: '智能改写',
        description: '开启后模型将优化正向提示词',
        defaultValue: true,
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加水印',
        defaultValue: false,
      },
      {
        id: 'seed',
        type: 'number',
        label: '随机种子',
        description: '使用相同的种子可使生成内容保持稳定',
        defaultValue: undefined,
        min: 0,
        max: 2147483647,
      },
    ],
  },
}

// OpenAI 图像模型配置
const OPENAI_MODEL_CONFIGS: Record<string, {
  name: string
  type: 'image_generation' | 'image_edit'
  parameters: ModelParameterConfig[]
}> = {
  'gpt-image-1.5-2025-12-16': {
    name: 'GPT Image 1.5',
    type: 'image_generation',
    parameters: [
      {
        id: 'quality',
        type: 'select',
        label: '图像质量',
        description: '生成图像的质量级别，高质量生成时间更长',
        defaultValue: 'medium',
        options: ['low', 'medium', 'high'],
        priceHint: 'high 质量价格更高',
      },
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1024×1024',
      },
      {
        id: 'background',
        type: 'select',
        label: '背景透明',
        description: '控制生成图像的背景透明度',
        defaultValue: 'auto',
        options: ['transparent', 'opaque', 'auto'],
      },
      {
        id: 'output_format',
        type: 'select',
        label: '输出格式',
        description: '生成图像的文件格式',
        defaultValue: 'png',
        options: ['png', 'jpeg', 'webp'],
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '生成图像的数量',
        defaultValue: 1,
        min: 1,
        max: 10,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
      {
        id: 'input_fidelity',
        type: 'select',
        label: '输入保真度',
        description: '编辑模式下参考图片的保真度',
        defaultValue: 'low',
        options: ['low', 'high'],
      },
    ],
  },
  'gpt-image-1': {
    name: 'GPT Image 1',
    type: 'image_generation',
    parameters: [
      {
        id: 'quality',
        type: 'select',
        label: '图像质量',
        description: '生成图像的质量级别',
        defaultValue: 'medium',
        options: ['low', 'medium', 'high'],
        priceHint: 'high 质量价格更高',
      },
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1024×1024',
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '生成图像的数量',
        defaultValue: 1,
        min: 1,
        max: 10,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
      {
        id: 'input_fidelity',
        type: 'select',
        label: '输入保真度',
        description: '编辑模式下参考图片的保真度',
        defaultValue: 'low',
        options: ['low', 'high'],
      },
    ],
  },
  'gpt-image-1-mini': {
    name: 'GPT Image 1 Mini',
    type: 'image_generation',
    parameters: [
      {
        id: 'quality',
        type: 'select',
        label: '图像质量',
        description: '生成图像的质量级别',
        defaultValue: 'medium',
        options: ['low', 'medium', 'high'],
      },
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1024×1024',
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '生成图像的数量',
        defaultValue: 1,
        min: 1,
        max: 10,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
    ],
  },
  'chatgpt-image-latest': {
    name: 'ChatGPT Image',
    type: 'image_generation',
    parameters: [
      {
        id: 'quality',
        type: 'select',
        label: '图像质量',
        description: '生成图像的质量级别',
        defaultValue: 'medium',
        options: ['low', 'medium', 'high'],
        priceHint: 'high 质量价格更高',
      },
      {
        id: 'size',
        type: 'resolution',
        label: '分辨率',
        description: '输出图像的分辨率',
        defaultValue: '1024×1024',
      },
      {
        id: 'background',
        type: 'select',
        label: '背景透明',
        description: '控制生成图像的背景透明度',
        defaultValue: 'auto',
        options: ['transparent', 'opaque', 'auto'],
      },
      {
        id: 'output_format',
        type: 'select',
        label: '输出格式',
        description: '生成图像的文件格式',
        defaultValue: 'png',
        options: ['png', 'jpeg', 'webp'],
      },
      {
        id: 'n',
        type: 'number',
        label: '生成数量',
        description: '生成图像的数量',
        defaultValue: 1,
        min: 1,
        max: 10,
        step: 1,
        priceHint: '按生成图片数量计费',
      },
    ],
  },
}

// Volcengine 图像模型配置
const VOLCENGINE_MODEL_CONFIGS: Record<string, {
  name: string
  type: 'image_generation' | 'image_edit'
  parameters: ModelParameterConfig[]
}> = {
  'doubao-seedream-4-5-251128': {
    name: 'Doubao Seedream 4.5',
    type: 'image_generation',
    parameters: [
      {
        id: 'size_mode',
        type: 'select',
        label: '尺寸模式',
        description: '选择尺寸设置方式',
        defaultValue: 'resolution',
        options: ['resolution', 'custom'],
      },
      {
        id: 'resolution',
        type: 'select',
        label: '分辨率',
        description: '选择预设分辨率，模型会根据提示词自动判断最佳尺寸',
        defaultValue: '2K',
        options: ['2K', '4K'],
        visibleWhen: { size_mode: 'resolution' },
      },
      {
        id: 'custom_width',
        type: 'number',
        label: '宽度',
        description: '自定义宽度（像素）',
        defaultValue: 2048,
        min: 480,
        max: 16384,
        step: 1,
        visibleWhen: { size_mode: 'custom' },
      },
      {
        id: 'custom_height',
        type: 'number',
        label: '高度',
        description: '自定义高度（像素）',
        defaultValue: 2048,
        min: 480,
        max: 16384,
        step: 1,
        visibleWhen: { size_mode: 'custom' },
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加"AI生成"水印',
        defaultValue: true,
      },
      {
        id: 'response_format',
        type: 'select',
        label: '返回格式',
        description: '图像返回方式',
        defaultValue: 'url',
        options: ['url', 'b64_json'],
      },
      {
        id: 'sequential_mode',
        type: 'select',
        label: '组图模式',
        description: 'auto: 自动生成组图，disabled: 单图生成',
        defaultValue: 'disabled',
        options: ['disabled', 'auto'],
      },
      {
        id: 'max_images',
        type: 'number',
        label: '组图数量',
        description: '组图模式下最多生成图片数量（1-15）',
        defaultValue: 4,
        min: 1,
        max: 15,
        step: 1,
        visibleWhen: { sequential_mode: 'auto' },
        priceHint: '按实际生成图片数量计费',
      },
    ],
  },
  'doubao-seedream-4-0-250828': {
    name: 'Doubao Seedream 4.0',
    type: 'image_generation',
    parameters: [
      {
        id: 'size_mode',
        type: 'select',
        label: '尺寸模式',
        description: '选择尺寸设置方式',
        defaultValue: 'resolution',
        options: ['resolution', 'custom'],
      },
      {
        id: 'resolution',
        type: 'select',
        label: '分辨率',
        description: '选择预设分辨率，模型会根据提示词自动判断最佳尺寸',
        defaultValue: '2K',
        options: ['1K', '2K', '4K'],
        visibleWhen: { size_mode: 'resolution' },
      },
      {
        id: 'custom_width',
        type: 'number',
        label: '宽度',
        description: '自定义宽度（像素）',
        defaultValue: 2048,
        min: 480,
        max: 16384,
        step: 1,
        visibleWhen: { size_mode: 'custom' },
      },
      {
        id: 'custom_height',
        type: 'number',
        label: '高度',
        description: '自定义高度（像素）',
        defaultValue: 2048,
        min: 480,
        max: 16384,
        step: 1,
        visibleWhen: { size_mode: 'custom' },
      },
      {
        id: 'watermark',
        type: 'boolean',
        label: '添加水印',
        description: '在图像右下角添加"AI生成"水印',
        defaultValue: true,
      },
      {
        id: 'response_format',
        type: 'select',
        label: '返回格式',
        description: '图像返回方式',
        defaultValue: 'url',
        options: ['url', 'b64_json'],
      },
      {
        id: 'sequential_mode',
        type: 'select',
        label: '组图模式',
        description: 'auto: 自动生成组图，disabled: 单图生成',
        defaultValue: 'disabled',
        options: ['disabled', 'auto'],
      },
      {
        id: 'max_images',
        type: 'number',
        label: '组图数量',
        description: '组图模式下最多生成图片数量（1-15）',
        defaultValue: 4,
        min: 1,
        max: 15,
        step: 1,
        visibleWhen: { sequential_mode: 'auto' },
        priceHint: '按实际生成图片数量计费',
      },
      {
        id: 'optimize_mode',
        type: 'select',
        label: '提示词优化',
        description: 'standard: 质量更高，fast: 速度更快',
        defaultValue: 'standard',
        options: ['standard', 'fast'],
      },
    ],
  },
}

// 合并所有模型配置
const MODEL_CONFIGS: Record<string, {
  name: string
  type: 'image_generation' | 'image_edit'
  parameters: ModelParameterConfig[]
}> = {
  ...BAILIAN_MODEL_CONFIGS,
  ...OPENAI_MODEL_CONFIGS,
  ...VOLCENGINE_MODEL_CONFIGS,
}

interface ImageParamsPanelProps {
  modelId: string
  provider?: string
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
  className?: string
}

export function ImageParamsPanel({ modelId, provider = 'bailian', values, onChange, className }: ImageParamsPanelProps) {
  const config = MODEL_CONFIGS[modelId]
  if (!config) return null

  // 检查参数是否可见
  const isParamVisible = (param: ModelParameterConfig): boolean => {
    if (!param.visibleWhen) return true
    return Object.entries(param.visibleWhen).every(([key, expectedValue]) => {
      return values[key] === expectedValue
    })
  }

  // 更新参数值
  const updateValue = (id: string, value: any) => {
    onChange({ ...values, [id]: value })
  }

  // 生成随机种子
  const generateRandomSeed = () => {
    return Math.floor(Math.random() * 2147483647)
  }

  // 获取模型类型对应的resolution picker类型
  const getResolutionPickerType = () => {
    if (modelId.includes('gpt-image') || modelId.includes('dall-e')) return 'gpt-image'
    if (modelId.includes('qwen-image-edit')) return 'qwen-image-edit'
    if (modelId.includes('qwen-image')) return 'qwen-image'
    if (modelId.includes('z-image')) return 'z-image'
    if (modelId.includes('wan2.6')) return 'wan2.6'
    return 'qwen-image'
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn("space-y-6", className)}>
        {/* 基础参数组 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            基础设置
          </h3>
          
          {config.parameters
            .filter(p => ['size', 'quality', 'n', 'max_images', 'enable_interleave'].includes(p.id))
            .filter(isParamVisible)
            .map(param => (
              <ParamField
                key={param.id}
                param={param}
                value={values[param.id] ?? param.defaultValue}
                onChange={(value) => updateValue(param.id, value)}
                onGenerateSeed={generateRandomSeed}
                resolutionPickerType={getResolutionPickerType()}
                provider={provider}
              />
            ))}
        </div>

        {/* 高级参数组 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            高级设置
          </h3>
          
          {config.parameters
            .filter(p => ['negative_prompt', 'prompt_extend', 'watermark', 'seed', 'background', 'output_format', 'input_fidelity'].includes(p.id))
            .filter(isParamVisible)
            .map(param => (
              <ParamField
                key={param.id}
                param={param}
                value={values[param.id] ?? param.defaultValue}
                onChange={(value) => updateValue(param.id, value)}
                onGenerateSeed={generateRandomSeed}
                resolutionPickerType={getResolutionPickerType()}
                provider={provider}
              />
            ))}
        </div>
      </div>
    </TooltipProvider>
  )
}

// 单个参数字段组件
interface ParamFieldProps {
  param: ModelParameterConfig
  value: any
  onChange: (value: any) => void
  onGenerateSeed: () => number
  resolutionPickerType: string
  provider?: string
}

function ParamField({ param, value, onChange, onGenerateSeed, resolutionPickerType, provider = 'bailian' }: ParamFieldProps) {
  const renderControl = () => {
    switch (param.type) {
      case 'resolution':
        if (resolutionPickerType === 'qwen-image-edit') {
          return (
            <CustomResolutionInput
              value={value || '1024*1024'}
              onChange={onChange}
            />
          )
        }
        return (
          <ResolutionPicker
            modelType={resolutionPickerType as any}
            provider={provider}
            value={value || param.defaultValue}
            onChange={onChange}
          />
        )

      case 'select':
        return (
          <select
            value={value || param.defaultValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-card border-border"
          >
            {param.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'string':
        return (
          <div className="space-y-1">
            <Textarea
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder={`输入${param.label}...`}
              className="min-h-[80px] text-sm resize-none"
              maxLength={param.maxLength}
            />
            {param.maxLength && (
              <div className="text-xs text-muted-foreground text-right">
                {(value || '').length}/{param.maxLength}
              </div>
            )}
          </div>
        )

      case 'boolean':
        return (
          <div className="flex items-center justify-between">
            <Switch
              checked={!!value}
              onCheckedChange={onChange}
            />
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {param.id === 'seed' ? (
                <>
                  <Input
                    type="number"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="随机"
                    className="flex-1 text-sm"
                    min={param.min}
                    max={param.max}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onChange(onGenerateSeed())}
                    className="shrink-0"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Slider
                    value={[value ?? param.defaultValue]}
                    onValueChange={([v]) => onChange(v)}
                    min={param.min}
                    max={param.max}
                    step={param.step || 1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {value ?? param.defaultValue}
                  </span>
                </>
              )}
            </div>
            {param.min !== undefined && param.max !== undefined && param.id !== 'seed' && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{param.min}</span>
                <span>{param.max}</span>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">{param.label}</Label>
          {param.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" align="center" className="max-w-xs">
                <p className="text-xs">{param.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {param.priceHint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 cursor-help">
                <AlertCircle className="h-3 w-3" />
                <span>影响价格</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <p className="text-xs">{param.priceHint}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {renderControl()}
    </div>
  )
}

// 获取模型的默认参数值
export function getDefaultParams(modelId: string): Record<string, any> {
  const config = MODEL_CONFIGS[modelId]
  if (!config) return {}
  
  return config.parameters.reduce((acc, param) => {
    acc[param.id] = param.defaultValue
    return acc
  }, {} as Record<string, any>)
}

// 根据 provider 和 modelId 获取配置
export function getModelConfig(modelId: string, _provider?: string) {
  // 首先尝试精确匹配
  if (MODEL_CONFIGS[modelId]) {
    return MODEL_CONFIGS[modelId]
  }

  // 模糊匹配（处理版本号变化）
  for (const [key, config] of Object.entries(MODEL_CONFIGS)) {
    if (modelId.includes(key.replace(/-\d{4}-\d{2}-\d{2}$/, ''))) {
      return config
    }
  }

  return null
}
