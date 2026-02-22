"use client"

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Image as ImageIcon,
  Scaling,
  Layers,
  Plus,
  X,
  Settings2,
  Shuffle,
  Sparkles,
  HelpCircle,
  Ban
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/context";
import { ResolutionPicker, CustomResolutionInput, ValidatedResolutionInput } from "@/components/image/resolution-picker";
import { VolcengineResolutionPicker } from "@/components/image/volcengine-resolution-picker";
import { ZaiResolutionPicker } from "@/components/image/zai-resolution-picker";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { ActionButton } from "./action-button";
import { RecordingStatus } from "./recording-status";
import { AlertToast } from "@/components/ui/alert-toast";

// 模型参数配置
export interface ImageGenerationParams {
  // 基础参数
  aspectRatio: string;
  count: number;
  referenceImages: string[];
  
  // 高级参数 - Bailian
  size?: string;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
  seed?: number;
  n?: number;
  enable_interleave?: boolean;
  max_images?: number;
  
  // 高级参数 - OpenAI / ZAI
  quality?: 'low' | 'medium' | 'high' | 'auto' | 'standard' | 'hd';
  background?: 'transparent' | 'opaque' | 'auto';
  output_format?: 'png' | 'jpeg' | 'webp';
  output_compression?: number;
  input_fidelity?: 'low' | 'high';
  mask?: string;

  // 高级参数 - Volcengine
  size_mode?: 'resolution' | 'custom';
  resolution?: '1k' | '2k' | '4k';
  custom_width?: number;
  custom_height?: number;
  sequential_mode?: 'auto' | 'disabled';
  optimize_mode?: 'standard' | 'fast';
  grid_count?: number; // 组图模式下每张图片包含的小图数量
}

interface ImageInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (options: ImageGenerationParams) => void;
  isLoading: boolean;
  onStop?: () => void;
  selectedModel?: string | null;
  voiceInputMode?: "browser" | "ai";
  voiceInputEnabled?: boolean;
}

// 获取模型类型
const getModelType = (modelId: string | null | undefined): 'qwen-image' | 'qwen-image-edit' | 'z-image' | 'wan2.6' | 'gpt-image' | 'generic' => {
  if (!modelId) return 'generic';
  if (modelId.includes('qwen-image-edit')) return 'qwen-image-edit';
  if (modelId.includes('qwen-image')) return 'qwen-image';
  if (modelId.includes('z-image')) return 'z-image';
  if (modelId.includes('wan2.6')) return 'wan2.6';
  if (modelId.includes('gpt-image') || modelId.includes('chatgpt-image')) return 'gpt-image';
  return 'generic';
};

// 获取模型支持的功能
const getModelFeatures = (modelId: string | null | undefined) => {
  const features = {
    hasNegativePrompt: false,
    hasPromptExtend: false,
    hasWatermark: false,
    hasSeed: false,
    hasSize: false,
    hasN: false,
    hasInterleave: false,
    hasCustomResolution: false, // 是否支持自定义分辨率输入
    hasQuality: false, // OpenAI: 质量选择
    hasBackground: false, // OpenAI: 背景透明
    hasOutputFormat: false, // OpenAI: 输出格式
    hasInputFidelity: false, // OpenAI: 输入保真度
    maxReferenceImages: 1, // 最大参考图片数量
    maxCount: 4,
    countOptions: [1, 2, 4] as number[],
    resolutionRange: { min: 512, max: 2048 }, // 自定义分辨率范围
    resolutionStep: 1, // 分辨率步长
    qualityOptions: [] as string[], // 质量选项列表
  };

  if (!modelId) return features;

  // qwen-image 系列
  if (modelId.includes('qwen-image')) {
    features.hasNegativePrompt = true;
    features.hasSeed = true;
    features.hasSize = true;
    features.maxReferenceImages = 1; // qwen-image 目前只支持单张参考图

    if (modelId.includes('max') || modelId.includes('plus')) {
      features.hasPromptExtend = true;
      features.hasWatermark = true;
    }

    if (modelId.includes('edit')) {
      features.hasN = true;
      features.hasCustomResolution = true;
      features.resolutionRange = { min: 512, max: 2048 };
      features.maxCount = modelId.includes('edit-max') || modelId.includes('edit-plus') ? 6 : 1;
      features.countOptions = modelId.includes('edit-max') || modelId.includes('edit-plus')
        ? [1, 2, 3, 4, 5, 6]
        : [1];
    }
  }

  // z-image 系列
  if (modelId.includes('z-image')) {
    features.hasPromptExtend = true;
    features.hasSeed = true;
    features.hasSize = true;
    features.hasCustomResolution = true;
    features.resolutionRange = { min: 512, max: 2048 };
    features.maxCount = 1;
    features.countOptions = [1];
  }

  // wan2.6 系列
  if (modelId.includes('wan2.6')) {
    features.hasNegativePrompt = true;
    features.hasPromptExtend = true;
    features.hasWatermark = true;
    features.hasSeed = true;
    features.hasSize = true;
    features.hasN = true;
    features.hasInterleave = true;
    features.hasCustomResolution = true;
    features.maxReferenceImages = 1; // wan2.6 目前只支持单张参考图
    features.resolutionRange = { min: 384, max: 2560 };
    features.maxCount = 4;
    features.countOptions = [1, 2, 3, 4];
  }

  // OpenAI GPT Image 系列
  if (modelId.includes('gpt-image') || modelId.includes('chatgpt-image')) {
    features.hasSize = true;
    features.hasQuality = true;
    features.hasN = true;
    features.maxReferenceImages = 16; // GPT Image 支持最多 16 张参考图
    features.maxCount = 10;
    features.countOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // GPT Image 1.5 和 ChatGPT Image 支持更多参数
    if (modelId.includes('1.5') || modelId.includes('chatgpt-image')) {
      features.hasBackground = true;
      features.hasOutputFormat = true;
    }

    // 编辑模式支持 input_fidelity
    if (modelId.includes('edit')) {
      features.hasInputFidelity = true;
    }
  }

  // Volcengine Seedream 系列
  if (modelId.includes('seedream')) {
    features.hasSize = true;
    features.hasCustomResolution = true;
    features.hasWatermark = true;
    features.resolutionRange = { min: 480, max: 16384 };
    features.maxReferenceImages = 14; // Seedream 支持最多 14 张参考图（多图融合）
    features.maxCount = 4; // 生成图片数量（独立图片张数）
    features.countOptions = [1, 2, 3, 4];
  }

  // ZAI (智谱AI) 图像生成系列
  if (modelId.includes('glm-image')) {
    features.hasSize = true;
    features.hasCustomResolution = true;
    features.hasQuality = true;
    features.hasWatermark = true;
    features.resolutionRange = { min: 1024, max: 2048 };
    features.resolutionStep = 32; // glm-image 步长为 32
    features.qualityOptions = ['hd']; // glm-image 仅支持 hd
    features.maxReferenceImages = 0; // ZAI 图像生成不支持参考图
    features.maxCount = 1; // 每次只生成 1 张
    features.countOptions = [1];
  }

  if (modelId.includes('cogview')) {
    features.hasSize = true;
    features.hasCustomResolution = true;
    features.hasQuality = true;
    features.hasWatermark = true;
    features.resolutionRange = { min: 512, max: 2048 };
    features.resolutionStep = 16; // cogview 步长为 16
    features.qualityOptions = ['standard', 'hd']; // cogview 支持 standard/hd
    features.maxReferenceImages = 0;
    features.maxCount = 1;
    features.countOptions = [1];
  }

  return features;
};

export function ImageInput({
  input = "",
  handleInputChange,
  handleSubmit,
  isLoading,
  onStop,
  selectedModel,
  voiceInputMode = "browser",
  voiceInputEnabled = false,
}: ImageInputProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // 使用语音输入 hook
  const {
    isRecording,
    isProcessingVoice,
    voiceTranscript,
    interimTranscript,
    recordingDuration,
    formatRecordingDuration,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    voiceInputMode,
    onError: (message) => {
      setAlertMessage(message);
      setAlertOpen(true);
    },
    onSubmit: (text) => {
      // 将语音转文字填入输入框
      const syntheticEvent = {
        target: { value: text },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      handleInputChange(syntheticEvent);
    },
    attachments: [],
    advancedSettings: {
      temperature: 0.7,
      topP: 1,
      topK: 0,
      presencePenalty: 0,
      frequencyPenalty: 0,
      seed: undefined,
      stopSequences: [],
    },
  });

  // 模型类型和功能
  const modelType = getModelType(selectedModel);
  const features = getModelFeatures(selectedModel);

  // 基础状态 - 根据模型类型设置默认值
  const getDefaultAspectRatio = (model: string | null | undefined) => {
    if (model?.includes('wan2.6')) {
      return "1024×1024";
    }
    if (model?.includes('qwen-image')) {
      if (model?.includes('edit')) {
        return "1024×1024";
      }
      return "1328×1328";
    }
    if (model?.includes('z-image')) {
      return "1024×1536";
    }
    if (model?.includes('glm-image')) {
      return "1280×1280";
    }
    if (model?.includes('cogview')) {
      return "1024×1024";
    }
    return "1024×1024";
  };

  const getDefaultQuality = (model: string | null | undefined): 'low' | 'medium' | 'high' | 'standard' | 'hd' => {
    if (model?.includes('glm-image')) {
      return 'hd';
    }
    if (model?.includes('cogview')) {
      return 'standard';
    }
    return 'medium';
  };

  const getDefaultResolution = (model: string | null | undefined): '1k' | '2k' | '4k' => {
    if (model?.includes('seedream-4.5')) {
      return '2k';
    }
    if (model?.includes('seedream-4.0')) {
      return '1k';
    }
    return '2k';
  };
  
  const [aspectRatio, setAspectRatio] = useState(() => getDefaultAspectRatio(selectedModel));
  const [count, setCount] = useState(1);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  
  // 高级参数状态 - Bailian
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [promptExtend, setPromptExtend] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [enableInterleave, setEnableInterleave] = useState(() => selectedModel?.includes('wan2.6') ?? false);
  
  // 高级参数状态 - OpenAI / ZAI
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'standard' | 'hd'>(() => getDefaultQuality(selectedModel));
  const [background, setBackground] = useState<'transparent' | 'opaque' | 'auto'>('auto');
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [inputFidelity, setInputFidelity] = useState<'low' | 'high'>('low');

  // 高级参数状态 - Volcengine
  const [sizeMode, setSizeMode] = useState<'resolution' | 'custom'>('resolution');
  const [resolution, setResolution] = useState<'1k' | '2k' | '4k'>(() => getDefaultResolution(selectedModel));
  const [customWidth, setCustomWidth] = useState<number>(2048);
  const [customHeight, setCustomHeight] = useState<number>(2048);
  const [sequentialMode, setSequentialMode] = useState<'auto' | 'disabled'>('disabled');
  const [optimizeMode, setOptimizeMode] = useState<'standard' | 'fast'>('standard');
  const [gridCount, setGridCount] = useState<number>(4);

  // 菜单状态
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  // 反向提示词 hover 提示状态
  const [showNegativeTooltip, setShowNegativeTooltip] = useState(false);
  
  // 客户端渲染标志
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 自动高度逻辑
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "inherit";
      const scrollHeight = textarea.scrollHeight;
      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
      
      // 根据屏幕宽度判断移动端或桌面端的最小高度
      const isDesktop = window.innerWidth >= 768; // md breakpoint
      const minHeight = isDesktop ? 56 : 48;
      
      // 如果内容高度接近最小高度（单行情况），直接使用最小高度
      // 这样可以避免 placeholder 或空内容时的计算偏差
      const singleLineThreshold = minHeight + lineHeight * 0.5;
      const isEssentiallyEmpty = scrollHeight <= singleLineThreshold;
      
      const finalHeight = isEssentiallyEmpty 
        ? minHeight 
        : Math.min(Math.max(scrollHeight, minHeight), 256);
      
      textarea.style.height = `${finalHeight}px`;
    }
  }, [input]);

  // 注意：由于父组件使用了 key={selectedModel} 强制重新挂载
  // 模型切换时组件会完全重新初始化，所有状态都会使用新的默认值
  // 这个 useEffect 作为后备，处理非重新挂载的模型切换情况
  useEffect(() => {
    // 使用 requestAnimationFrame 避免同步调用 setState 导致的级联渲染问题
    const rafId = requestAnimationFrame(() => {
      // 只重置需要清理的状态，默认值由 useState 初始化处理
      setNegativePrompt("");
      setSeed(undefined);
      setEnableInterleave(selectedModel?.includes('wan2.6') ?? false);
      setReferenceImages([]);
    });
    return () => cancelAnimationFrame(rafId);
  }, [selectedModel]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleFormSubmit();
      }
    }
  };

  const handleFormSubmit = () => {
    if (!input.trim() || isLoading) return;

    // 自定义分辨率模型验证
    if (features.hasCustomResolution) {
      const parts = aspectRatio.split(/[×*]/);
      if (parts.length === 2) {
        const width = parseInt(parts[0]) || 0;
        const height = parseInt(parts[1]) || 0;
        const { min, max } = features.resolutionRange;

        const errors: string[] = [];

        // 检查宽高范围
        if (width < min || width > max || height < min || height > max) {
          errors.push(`宽高需在 ${min}-${max} 之间`);
        }

        // wan2.6 额外检查宽高比和总分辨率
        if (selectedModel?.includes('wan2.6')) {
          const aspectRatioValue = width / height;
          const totalPixels = width * height;
          const minRatio = 1 / 4;
          const maxRatio = 4;
          const minPixels = 589824;
          const maxPixels = 1638400;

          if (aspectRatioValue < minRatio || aspectRatioValue > maxRatio) {
            errors.push("宽高比需在 1:4 到 4:1 之间");
          }
          if (totalPixels < minPixels || totalPixels > maxPixels) {
            errors.push(`总像素需在 ${minPixels.toLocaleString()}-${maxPixels.toLocaleString()} 之间`);
          }
        }

        if (errors.length > 0) {
          alert(errors.join("\n"));
          return;
        }
      }
    }

    const params: ImageGenerationParams = {
      aspectRatio,
      count,
      referenceImages,
      size: aspectRatio, // 传递 size 参数给后端
    };

    // 根据模型功能添加高级参数 - Bailian
    if (features.hasNegativePrompt && negativePrompt) {
      params.negative_prompt = negativePrompt;
    }
    if (features.hasPromptExtend) {
      params.prompt_extend = promptExtend;
    }
    if (features.hasWatermark) {
      params.watermark = watermark;
    }
    if (features.hasSeed && seed !== undefined) {
      params.seed = seed;
    }
    if (features.hasN) {
      params.n = count;
    }
    if (features.hasInterleave) {
      // wan2.6-image 需要显式设置 enable_interleave
      // - 无参考图时：强制启用 interleave（文生图模式）
      // - 有参考图时：根据用户选择（true=图文混排，false=图像编辑）
      const shouldEnableInterleave = enableInterleave || referenceImages.length === 0;
      params.enable_interleave = shouldEnableInterleave;
      params.max_images = count;
    }

    // 根据模型功能添加高级参数 - OpenAI
    if (features.hasQuality) {
      params.quality = quality;
    }
    if (features.hasBackground) {
      params.background = background;
    }
    if (features.hasOutputFormat) {
      params.output_format = outputFormat;
    }
    if (features.hasInputFidelity) {
      params.input_fidelity = inputFidelity;
    }

    // 根据模型功能添加高级参数 - Volcengine
    if (selectedModel?.includes('seedream')) {
      params.size_mode = sizeMode;
      params.resolution = resolution;
      params.custom_width = customWidth;
      params.custom_height = customHeight;
      params.sequential_mode = sequentialMode;
      params.grid_count = gridCount; // 组图模式下的小图数量
      if (selectedModel?.includes('4-0')) {
        params.optimize_mode = optimizeMode;
      }
    }

    handleSubmit(params);
  };

  const handleReferenceImageUpload = () => {
    const remainingSlots = features.maxReferenceImages - referenceImages.length;
    if (remainingSlots <= 0) {
      alert(`最多只能上传 ${features.maxReferenceImages} 张参考图`);
      return;
    }
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = remainingSlots > 1;
    fileInput.onchange = (e: any) => {
      const files = Array.from(e.target.files as FileList).slice(0, remainingSlots);
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setReferenceImages(prev => [...prev, base64]);
        };
        reader.onerror = () => {
          console.error(t("imageChat.readFileFailed"));
        };
        reader.readAsDataURL(file);
      });
    };
    fileInput.click();
  };

  const handleClearReferenceImage = (index?: number) => {
    if (index !== undefined) {
      // 删除指定索引的图片
      setReferenceImages(prev => prev.filter((_img, i) => i !== index));
    } else {
      // 清空所有图片
      setReferenceImages([]);
    }
  };

  // 检查自定义分辨率是否有效
  const isCustomResolutionValid = () => {
    if (!features.hasCustomResolution) return true;
    const parts = aspectRatio.split(/[×*]/);
    if (parts.length !== 2) return false;
    const width = parseInt(parts[0]) || 0;
    const height = parseInt(parts[1]) || 0;
    const { min, max } = features.resolutionRange;

    // 检查宽高是否在范围内
    const isWidthValid = width >= min && width <= max;
    const isHeightValid = height >= min && height <= max;

    // 对于 wan2.6，还需要检查宽高比和总分辨率
    if (selectedModel?.includes('wan2.6')) {
      const ratio = width / height;
      const totalPixels = width * height;
      const minRatio = 1 / 4;
      const maxRatio = 4;
      const minPixels = 589824;
      const maxPixels = 1638400;
      return isWidthValid && isHeightValid &&
        ratio >= minRatio && ratio <= maxRatio &&
        totalPixels >= minPixels && totalPixels <= maxPixels;
    }

    return isWidthValid && isHeightValid;
  };

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  // 判断是否显示高级设置按钮（反向提示词、图像质量已独立显示）
  const hasAdvancedFeatures = features.hasPromptExtend ||
                              features.hasWatermark || features.hasSeed || features.hasInterleave ||
                              features.hasBackground || features.hasOutputFormat || features.hasInputFidelity;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full mx-auto flex flex-col gap-2">
        <div className="relative">
          {/* 参考图预览区域 - 显示在按钮上方 */}
          {referenceImages.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {referenceImages.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="w-16 h-16 rounded-lg border border-border overflow-hidden bg-muted shadow-sm">
                    <img
                      src={image}
                      alt={`参考图 ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleClearReferenceImage(index)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="删除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {referenceImages.length < features.maxReferenceImages && (
                <button
                  onClick={handleReferenceImageUpload}
                  className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:border-primary/50 transition-all bg-white dark:bg-card"
                  title="添加参考图"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* 顶部工具栏 */}
          <div className="flex gap-1.5 flex-wrap mb-2">
            {/* 参考图按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setOpenMenu(null);
                  handleReferenceImageUpload();
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group",
                  referenceImages.length > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                    : 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70'
                )}
              >
                <ImageIcon className={cn(
                  "h-3.5 w-3.5",
                  referenceImages.length > 0 ? 'text-blue-500' : 'text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-foreground/70'
                )} />
                <span className="text-xs font-medium">
                  {referenceImages.length > 0 
                    ? `${referenceImages.length}/${features.maxReferenceImages} 参考图`
                    : t("imageChat.referenceImage")}
                </span>
              </button>
              {referenceImages.length > 0 && (
                <button
                  onClick={() => handleClearReferenceImage()}
                  className="p-1.5 rounded-full hover:bg-muted dark:hover:bg-muted transition-colors"
                  title={t("imageChat.clearReferenceImage")}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
                </button>
              )}
            </div>

            {/* 比例选择 - 仅对特定模型显示 */}
            {features.hasSize && mounted ? (
              features.hasCustomResolution ? (
                // 支持自定义分辨率的模型
                <Popover open={openMenu === 'aspectRatio'} onOpenChange={(open) => setOpenMenu(open ? 'aspectRatio' : null)}>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group",
                        isCustomResolutionValid()
                          ? "bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
                          : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      )}
                      title={t("imageChat.aspectRatio")}
                    >
                      <Scaling className={cn(
                        "h-3.5 w-3.5",
                        isCustomResolutionValid()
                          ? "text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground"
                          : "text-red-500 dark:text-red-400"
                      )} />
                      <span className="text-xs font-medium">
                        {selectedModel?.includes('seedream')
                          ? (sizeMode === 'resolution' ? resolution : `${customWidth}×${customHeight}`)
                          : aspectRatio}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 w-[280px]" side="top" align="start">
                    {selectedModel?.includes('seedream') ? (
                      // Volcengine 使用特殊的分辨率选择器
                      <VolcengineResolutionPicker
                        modelId={selectedModel}
                        sizeMode={sizeMode}
                        resolution={resolution}
                        customWidth={customWidth}
                        customHeight={customHeight}
                        onSizeModeChange={setSizeMode}
                        onResolutionChange={(value) => setResolution(value as '1k' | '2k' | '4k')}
                        onCustomSizeChange={(width, height) => {
                          setCustomWidth(width);
                          setCustomHeight(height);
                        }}
                      />
                    ) : selectedModel?.includes('wan2.6') ? (
                      // wan2.6 使用带验证的输入
                      <ValidatedResolutionInput
                        value={aspectRatio}
                        onChange={(value) => {
                          setAspectRatio(value);
                        }}
                        minSize={features.resolutionRange.min}
                        maxSize={features.resolutionRange.max}
                      />
                    ) : selectedModel?.includes('glm-image') || selectedModel?.includes('cogview') ? (
                      // ZAI 模型使用拖动条选择分辨率
                      <ZaiResolutionPicker
                        modelId={selectedModel}
                        value={aspectRatio}
                        onChange={(value) => {
                          setAspectRatio(value);
                        }}
                        resolutionRange={features.resolutionRange}
                        resolutionStep={features.resolutionStep}
                      />
                    ) : (
                      // 其他模型使用简单自定义输入
                      <CustomResolutionInput
                        value={aspectRatio}
                        onChange={(value) => {
                          setAspectRatio(value);
                        }}
                        minSize={features.resolutionRange.min}
                        maxSize={features.resolutionRange.max}
                      />
                    )}
                  </PopoverContent>
                </Popover>
              ) : (
                // 其他模型使用预设分辨率选择
                <DropdownMenu open={openMenu === 'aspectRatio'} onOpenChange={(open) => setOpenMenu(open ? 'aspectRatio' : null)}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
                      title={t("imageChat.aspectRatio")}
                    >
                      <Scaling className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground" />
                      <span className="text-xs font-medium">{aspectRatio}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-3 w-[calc(100vw-2rem)] max-w-[320px] mb-2" side="top" align="start">
                    <ResolutionPicker
                      modelType={modelType === 'generic' ? 'qwen-image' : modelType}
                      provider={selectedModel?.includes('gpt-image') || selectedModel?.includes('chatgpt-image') ? 'openai' : 'bailian'}
                      value={aspectRatio}
                      onChange={(value) => {
                        setAspectRatio(value);
                        setOpenMenu(null);
                      }}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            ) : mounted ? (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70"
                disabled
              >
                <Scaling className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground" />
                <span className="text-xs font-medium">{aspectRatio}</span>
              </button>
            ) : null}

            {/* 数量选择 - 滑块弹窗 */}
            {mounted ? (
              <Popover open={openMenu === 'count'} onOpenChange={(open) => setOpenMenu(open ? 'count' : null)}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70">
                    <Layers className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground" />
                    <span className="text-xs font-medium">{count === 1 ? t("imageChat.imageCountSingular").replace("{count}", "1") : t("imageChat.imageCountPlural").replace("{count}", count.toString())}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-4 mb-2" side="top" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t("imageChat.imageCount")}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 1;
                            setCount(Math.min(Math.max(value, 1), features.maxCount));
                          }}
                          className="w-14 h-7 text-xs text-center"
                          min={1}
                          max={features.maxCount}
                        />
                      </div>
                    </div>
                    <Slider
                      value={[count]}
                      onValueChange={(value) => setCount(value[0])}
                      min={1}
                      max={features.maxCount}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1</span>
                      <span>{features.maxCount}</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70" disabled>
                <Layers className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700 dark:group-hover:text-muted-foreground" />
                <span className="text-xs font-medium">{count === 1 ? t("imageChat.imageCountSingular").replace("{count}", "1") : t("imageChat.imageCountPlural").replace("{count}", count.toString())}</span>
              </button>
            )}

            {/* 图像质量选择 */}
            {features.hasQuality && features.qualityOptions.length > 1 && mounted && (
              <Popover open={openMenu === 'quality'} onOpenChange={(open) => setOpenMenu(open ? 'quality' : null)}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70">
                    <Sparkles className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700" />
                    <span className="text-xs font-medium">
                      {selectedModel?.includes('cogview') || selectedModel?.includes('glm-image')
                        ? (quality === 'hd' ? t("imageChat.qualityHD") : t("imageChat.qualityStandard"))
                        : (quality === 'low' ? t("imageChat.qualityLow") : quality === 'high' ? t("imageChat.qualityHigh") : t("imageChat.qualityMedium"))
                      }
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-3 mb-2" side="top" align="start">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{t("imageChat.imageQuality")}</span>
                      <span className="text-sm font-semibold text-primary">
                        {(selectedModel?.includes('cogview') || selectedModel?.includes('glm-image'))
                          ? (quality === 'hd' ? t("imageChat.qualityHD") : t("imageChat.qualityStandard"))
                          : (quality === 'low' ? t("imageChat.qualityLow") : quality === 'medium' ? t("imageChat.qualityMedium") : t("imageChat.qualityHigh"))
                        }
                      </span>
                    </div>
                    {/* ZAI 风格的质量选择 - 两档滑块 */}
                    {(selectedModel?.includes('cogview') || selectedModel?.includes('glm-image')) ? (
                      <>
                        <Slider
                          value={[quality === 'hd' ? 1 : 0]}
                          onValueChange={(value) => {
                            const q = value[0] === 1 ? 'hd' : 'standard';
                            setQuality(q as any);
                          }}
                          min={0}
                          max={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{t("imageChat.qualityStandard")}</span>
                          <span>{t("imageChat.qualityHD")}</span>
                        </div>
                      </>
                    ) : (
                      /* OpenAI 风格的质量选择 - 三档滑块 */
                      <>
                        <Slider
                          value={[quality === 'low' ? 1 : quality === 'medium' ? 2 : 3]}
                          onValueChange={(value) => {
                            const q = value[0] === 1 ? 'low' : value[0] === 2 ? 'medium' : 'high';
                            setQuality(q);
                          }}
                          min={1}
                          max={3}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{t("imageChat.qualityLow")}</span>
                          <span>{t("imageChat.qualityMedium")}</span>
                          <span>{t("imageChat.qualityHigh")}</span>
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* 反向提示词按钮 - 独立显示 */}
            {features.hasNegativePrompt && mounted && (
              <>
                <Popover 
                  open={showNegativeTooltip && !!negativePrompt} 
                  onOpenChange={setShowNegativeTooltip}
                >
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => setOpenMenu('negativePrompt')}
                      onMouseEnter={() => negativePrompt && setShowNegativeTooltip(true)}
                      onMouseLeave={() => setShowNegativeTooltip(false)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group",
                        negativePrompt
                          ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400'
                          : 'bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70'
                      )}
                    >
                      <Ban className={cn(
                        "h-3.5 w-3.5",
                        negativePrompt ? 'text-amber-500' : 'text-gray-500 dark:text-muted-foreground group-hover:text-gray-700'
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        negativePrompt ? 'text-amber-600 dark:text-amber-400' : ''
                      )}>{t("imageChat.negativePrompt")}</span>
                    </button>
                  </PopoverTrigger>
                  {negativePrompt && (
                    <PopoverContent 
                      className="w-[280px] p-2" 
                      side="top" 
                      align="center"
                      sideOffset={8}
                    >
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {negativePrompt}
                      </p>
                    </PopoverContent>
                  )}
                </Popover>

                <Dialog open={openMenu === 'negativePrompt'} onOpenChange={(open) => setOpenMenu(open ? 'negativePrompt' : null)}>
                  <DialogContent className="sm:max-w-[500px]" overlayClassName="bg-background/80 backdrop-blur-sm">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Ban className="h-5 w-5 text-amber-500" />
                        {t("imageChat.negativePrompt")}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-sm text-muted-foreground">
                        {t("imageChat.negativePromptDesc")}
                      </p>
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder={t("imageChat.negativePromptPlaceholder")}
                        className="min-h-[150px] text-sm resize-none"
                        maxLength={500}
                      />
                      {negativePrompt.length >= 500 && (
                        <div className="text-xs text-red-500 text-right">
                          {t("imageChat.negativePromptMaxLength")}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={() => setOpenMenu(null)} className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90">{t("common.confirm")}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {/* 高级设置按钮 */}
            {hasAdvancedFeatures && mounted && (
              <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all group bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-muted/50 hover:border-gray-300 dark:hover:border-border text-gray-600 dark:text-foreground/70">
                    <Settings2 className="h-3.5 w-3.5 text-gray-500 dark:text-muted-foreground group-hover:text-gray-700" />
                    <span className="text-xs font-medium">{t("imageChat.advancedSettings")}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[calc(100vw-2rem)] max-w-[320px] p-3" 
                  side="top" 
                  align="start"
                  sideOffset={8}
                >
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pt-1">

                    {/* 图文混排开关 - 仅wan2.6 */}
                    {features.hasInterleave && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">{t("imageChat.interleave")}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">{t("imageChat.interleaveTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={enableInterleave}
                            onCheckedChange={setEnableInterleave}
                            className="scale-90"
                          />
                        </div>
                        {enableInterleave && (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400">
                            {t("imageChat.interleaveModeHint")}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 智能改写 */}
                    {features.hasPromptExtend && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">{t("imageChat.promptExtend")}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">{t("imageChat.promptExtendTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={promptExtend}
                            onCheckedChange={setPromptExtend}
                            className="scale-90"
                          />
                        </div>
                      </div>
                    )}

                    {/* 水印 */}
                    {features.hasWatermark && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">{t("imageChat.watermark")}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">{t("imageChat.watermarkTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={watermark}
                            onCheckedChange={setWatermark}
                            className="scale-90"
                          />
                        </div>
                      </div>
                    )}

                    {/* Volcengine 组图模式 */}
                    {selectedModel?.includes('seedream') && (
                      <>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">{t("imageChat.sequentialMode")}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">{t("imageChat.sequentialModeTooltip")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex gap-1">
                            {([
                              { value: 'disabled', label: t("imageChat.singleImage") },
                              { value: 'auto', label: t("imageChat.multiImage") }
                            ] as const).map((option) => (
                              <button
                                key={option.value}
                                onClick={() => setSequentialMode(option.value)}
                                className={cn(
                                  "flex-1 px-2 py-1 text-xs rounded-md border transition-all",
                                  sequentialMode === option.value
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {sequentialMode === 'auto' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs font-medium">{t("imageChat.gridCount")}</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs max-w-xs">{t("imageChat.gridCountTooltip")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                type="number"
                                value={gridCount}
                                onChange={(e) => setGridCount(Math.min(Math.max(parseInt(e.target.value) || 1, 1), 15))}
                                className="w-16 text-xs h-7"
                                min={1}
                                max={15}
                              />
                            </div>
                            <Slider
                              value={[gridCount]}
                              onValueChange={(value) => setGridCount(value[0])}
                              min={1}
                              max={15}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>1</span>
                              <span>15</span>
                            </div>
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              {t("imageChat.billingHint")}
                            </p>
                          </div>
                        )}

                        {/* 提示词优化 - 仅 4.0 支持 fast 模式 */}
                        {selectedModel?.includes('4-0') && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Label className="text-xs font-medium">{t("imageChat.promptOptimize")}</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs max-w-xs">{t("imageChat.promptOptimizeTooltip")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="flex gap-1">
                              {([
                                { value: 'standard', label: t("imageChat.standard") },
                                { value: 'fast', label: t("imageChat.fast") }
                              ] as const).map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setOptimizeMode(option.value)}
                                  className={cn(
                                    "flex-1 px-2 py-1 text-xs rounded-md border transition-all",
                                    optimizeMode === option.value
                                      ? "bg-primary/10 border-primary text-primary"
                                      : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* 随机种子 */}
                    {features.hasSeed && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Label className="text-xs font-medium">{t("imageChat.seed")}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs max-w-xs">{t("imageChat.seedDesc")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Input
                          type="number"
                          value={seed || ''}
                          onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder={t("common.optional")}
                          className="flex-1 text-xs h-7 min-w-[80px]"
                          min={0}
                          max={2147483647}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={generateRandomSeed}
                          className="shrink-0 h-7 w-7"
                        >
                          <Shuffle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* OpenAI 参数 */}

                    {/* 背景透明 */}
                    {features.hasBackground && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium">{t("imageChat.background")}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs max-w-xs">{t("imageChat.backgroundTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex gap-1">
                          {([
                            { value: 'auto', label: t("imageChat.auto") },
                            { value: 'transparent', label: t("imageChat.backgroundTransparent") },
                            { value: 'opaque', label: t("imageChat.backgroundOpaque") }
                          ] as const).map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setBackground(option.value)}
                              className={cn(
                                "flex-1 px-2 py-1 text-xs rounded-md border transition-all",
                                background === option.value
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 输出格式 */}
                    {features.hasOutputFormat && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-medium">{t("imageChat.outputFormat")}</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs max-w-xs">{t("imageChat.outputFormatTooltip")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex gap-1">
                          {(['png', 'jpeg', 'webp'] as const).map((format) => (
                            <button
                              key={format}
                              onClick={() => setOutputFormat(format)}
                              className={cn(
                                "flex-1 px-2 py-1 text-xs rounded-md border transition-all uppercase",
                                outputFormat === format
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-white dark:bg-card border-border text-gray-600 dark:text-foreground/70 hover:bg-gray-50 dark:hover:bg-muted/50"
                              )}
                            >
                              {format}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 输入保真度 */}
                    {features.hasInputFidelity && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">{t("imageChat.inputFidelity")}</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">{t("imageChat.inputFidelityDesc")}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <select
                            value={inputFidelity}
                            onChange={(e) => setInputFidelity(e.target.value as any)}
                            className="px-2 py-1 text-xs border rounded-md bg-white dark:bg-card border-border"
                          >
                            <option value="low">{t("imageChat.qualityLow")}</option>
                            <option value="high">{t("imageChat.qualityHigh")}</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* 输入框 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFormSubmit();
            }}
            className={cn(
              "relative flex items-end border bg-white dark:bg-[#111114] overflow-hidden transition-all duration-200",
              "rounded-[24px] md:rounded-[28px]",
              "min-h-[48px] md:min-h-[56px]"
            )}
          >
            {/* 输入框 - 录音/处理时显示状态 */}
            {isRecording || isProcessingVoice ? (
              <RecordingStatus
                isRecording={isRecording}
                isProcessingVoice={isProcessingVoice}
                recordingDuration={recordingDuration}
                voiceTranscript={voiceTranscript}
                interimTranscript={interimTranscript}
                formatDuration={formatRecordingDuration}
              />
            ) : (
              <div className="relative flex-1 pr-[42px] md:pr-[49px] flex items-start">
                <div className="relative w-full flex items-start">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={onKeyDown}
                    placeholder={t("imageChat.placeholder")}
                    rows={1}
                    className="resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 py-[14px] px-3 md:py-[18px] md:px-6 min-h-[48px] md:min-h-[56px] max-h-64 w-full bg-transparent dark:bg-transparent dark:text-zinc-100 text-zinc-900 relative z-10 whitespace-pre-wrap break-all text-xs md:text-xs"
                  />
                </div>
              </div>
            )}
            <ActionButton
              isRecording={isRecording}
              isProcessingVoice={isProcessingVoice}
              isLoading={isLoading}
              hasInput={!!input.trim()}
              hasAttachments={false}
              isUploading={false}
              hasError={false}
              voiceInputEnabled={voiceInputEnabled}
              onStopRecording={stopRecording}
              onStartRecording={startRecording}
              onStop={onStop || (() => { })}
            />
          </form>
        </div>
      </div>
      <AlertToast
        open={alertOpen}
        onOpenChange={setAlertOpen}
        message={alertMessage}
      />
    </TooltipProvider>
  );
}
