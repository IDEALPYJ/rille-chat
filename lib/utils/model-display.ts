import { 
  Type, 
  Image, 
  Video, 
  Mic, 
  Lightbulb, 
  SquareFunction, 
  Braces,
  Globe,
  ImagePlus,
  Terminal,
  Database,
  Link,
  Map,
  Search,
  Twitter,
  Layers,
  Pencil
} from "lucide-react"
import { ModelConfig } from "@/lib/types/model"

/**
 * 格式化 token 数量
 * @param tokens token 数量
 * @param detailed 是否显示详细数字（带千位分隔符）
 */
export const formatTokens = (tokens: number, detailed: boolean = false): string => {
  if (detailed) {
    return tokens.toLocaleString()
  }
  if (tokens >= 1048576) {
    const m = tokens / 1048576
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`
  }
  if (tokens >= 1024) {
    const k = tokens / 1024
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * 格式化价格
 * @param rate 价格
 * @param currency 货币类型
 */
export const formatPrice = (rate: number, currency: string): string => {
  const symbol = currency === 'USD' ? '$' : '¥'
  return `${symbol}${rate.toFixed(2)}`
}

/**
 * 格式化日期
 * @param dateString 日期字符串
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

/**
 * 翻译 feature 名称
 */
export const translateFeature = (feature: string): string => {
  const translations: Record<string, string> = {
    'reasoning': '推理',
    'function_call': '函数调用',
    'function_calling': '函数调用',
    'structured_outputs': '结构化输出',
    'structured-outputs': '结构化输出',
    'context-1m': '百万上下文',
    'image_generation': '图像生成',
    'image_edit': '图像编辑',
    'interleave': '图文混排',
  }
  return translations[feature] || feature
}

/**
 * 翻译工具名称
 */
export const translateTool = (tool: string): string => {
  const translations: Record<string, string> = {
    'web_search': '网络搜索',
    'web-search': '网络搜索',
    'google_search': 'Google搜索',
    'x_search': 'X搜索',
    'image_generation': '图片生成',
    'code_interpreter': '代码解释器',
    'code_execution': '代码执行',
    'code_runner': '代码运行器',
    'web_fetch': '网页抓取',
    'url_context': 'URL上下文',
    'tool_search_tool': '工具搜索',
    'google_maps': 'Google地图',
  }
  return translations[tool] || tool
}

/**
 * 翻译模态类型
 */
export const translateModality = (modality: string): string => {
  const translations: Record<string, string> = {
    'text': '文本',
    'image': '图片',
    'video': '视频',
    'audio': '音频',
  }
  return translations[modality] || modality
}

/**
 * 翻译定价项名称
 */
export const translatePricingName = (name: string): string => {
  const translations: Record<string, string> = {
    'input': '输入',
    'output': '输出',
    'cacheRead': '缓存读取',
    'cacheWrite': '缓存写入',
    'web_search': '网络搜索',
  }
  return translations[name] || name
}

/**
 * 翻译定价单位
 */
export const translatePricingUnit = (unit: string): string => {
  const translations: Record<string, string> = {
    '1M_tokens': '1M tokens',
    '1K_tokens': '1K tokens',
    'per_image': '每张图片',
    'per_minute': '每分钟',
    '1K_web_search': '1K 次搜索',
  }
  return translations[unit] || unit
}

/**
 * 模态图标映射
 */
export const modalityIcons: Record<string, React.ElementType> = {
  text: Type,
  image: Image,
  video: Video,
  audio: Mic,
}

/**
 * Feature 图标映射
 */
export const featureIcons: Record<string, React.ElementType> = {
  reasoning: Lightbulb,
  function_call: SquareFunction,
  function_calling: SquareFunction, // 别名
  structured_outputs: Braces,
  'structured-outputs': Braces, // 别名
  'context-1m': Database, // 1M上下文
  image_generation: ImagePlus, // 图像生成
  image_edit: Pencil, // 图像编辑
  interleave: Layers, // 图文混排
}

/**
 * 工具图标映射
 */
export const toolIcons: Record<string, React.ElementType> = {
  web_search: Globe,
  'web-search': Globe, // 别名
  google_search: Search,
  x_search: Twitter,
  image_generation: ImagePlus,
  code_interpreter: Terminal,
  code_execution: Terminal, // 别名
  code_runner: Terminal, // 别名
  web_fetch: Link,
  url_context: Link,
  tool_search_tool: Search,
  google_maps: Map,
}

/**
 * 获取主要输入价格
 * 优先级：text input > image input
 */
export const getPrimaryInputPrice = (pricing?: ModelConfig['pricing']): { rate: number, currency: string, type: string } | null => {
  if (!pricing || !pricing.items) return null
  
  // 优先查找文本输入价格
  const textInput = pricing.items.find(item => item.type === 'text' && item.name === 'input')
  if (textInput && textInput.tiers && textInput.tiers.length > 0) {
    return {
      rate: textInput.tiers[0].rate,
      currency: pricing.currency,
      type: 'text'
    }
  }
  
  // 如果没有文本输入，查找图片输入价格
  const imageInput = pricing.items.find(item => item.type === 'image' && item.name === 'input')
  if (imageInput && imageInput.tiers && imageInput.tiers.length > 0) {
    return {
      rate: imageInput.tiers[0].rate,
      currency: pricing.currency,
      type: 'image'
    }
  }
  
  return null
}

/**
 * 获取主要输出价格
 * 优先级：text output > image output
 */
export const getPrimaryOutputPrice = (pricing?: ModelConfig['pricing']): { rate: number, currency: string, type: string } | null => {
  if (!pricing || !pricing.items) return null
  
  // 优先查找文本输出价格
  const textOutput = pricing.items.find(item => item.type === 'text' && item.name === 'output')
  if (textOutput && textOutput.tiers && textOutput.tiers.length > 0) {
    return {
      rate: textOutput.tiers[0].rate,
      currency: pricing.currency,
      type: 'text'
    }
  }
  
  // 如果没有文本输出，查找图片输出价格
  const imageOutput = pricing.items.find(item => item.type === 'image' && item.name === 'output')
  if (imageOutput && imageOutput.tiers && imageOutput.tiers.length > 0) {
    return {
      rate: imageOutput.tiers[0].rate,
      currency: pricing.currency,
      type: 'image'
    }
  }
  
  return null
}
