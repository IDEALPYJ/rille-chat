"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Copy, Check, Code, FileJson, Terminal } from "lucide-react"

interface ParamsPreviewProps {
  params: Record<string, any>
  modelId: string
  provider?: string
  className?: string
}

type ViewMode = 'json' | 'api' | 'curl'

export function ParamsPreview({ params, modelId, provider = 'bailian', className }: ParamsPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('json')
  const [copied, setCopied] = useState(false)

  // 过滤掉undefined的值
  const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== '') {
      acc[key] = value
    }
    return acc
  }, {} as Record<string, any>)

  // 生成JSON格式
  const getJsonContent = () => {
    return JSON.stringify({
      model: modelId,
      parameters: cleanParams
    }, null, 2)
  }

  // 生成API调用格式
  const getApiContent = () => {
    if (provider === 'openai') {
      // OpenAI Image API 格式
      const apiParams: any = {
        model: modelId,
        prompt: "在此输入您的提示词...",
        n: cleanParams.n || 1,
        size: cleanParams.size || "1024x1024",
        response_format: "url",
      }
      
      if (cleanParams.quality) {
        apiParams.quality = cleanParams.quality
      }
      if (cleanParams.background) {
        apiParams.background = cleanParams.background
      }
      if (cleanParams.output_format) {
        apiParams.output_format = cleanParams.output_format
      }
      
      return JSON.stringify(apiParams, null, 2)
    } else {
      // Bailian API 格式
      const apiParams = {
        model: modelId,
        input: {
          prompt: "在此输入您的提示词..."
        },
        parameters: cleanParams
      }
      return JSON.stringify(apiParams, null, 2)
    }
  }

  // 生成cURL命令
  const getCurlContent = () => {
    if (provider === 'openai') {
      const apiParams: any = {
        model: modelId,
        prompt: "在此输入您的提示词...",
        n: cleanParams.n || 1,
        size: cleanParams.size || "1024x1024",
        response_format: "url",
      }
      
      if (cleanParams.quality) {
        apiParams.quality = cleanParams.quality
      }
      if (cleanParams.background) {
        apiParams.background = cleanParams.background
      }
      if (cleanParams.output_format) {
        apiParams.output_format = cleanParams.output_format
      }
      
      return `curl -X POST https://api.openai.com/v1/images/generations \\
  -H "Authorization: Bearer \${OPENAI_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(apiParams)}'`
    } else {
      const apiParams = {
        model: modelId,
        input: {
          prompt: "在此输入您的提示词..."
        },
        parameters: cleanParams
      }
      return `curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \\
  -H "Authorization: Bearer \${DASHSCOPE_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -H "X-DashScope-Async: enable" \\
  -d '${JSON.stringify(apiParams)}'`
    }
  }

  const getContent = () => {
    switch (viewMode) {
      case 'json':
        return getJsonContent()
      case 'api':
        return getApiContent()
      case 'curl':
        return getCurlContent()
      default:
        return getJsonContent()
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getContent())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 视图切换按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setViewMode('json')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              viewMode === 'json'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileJson className="h-3.5 w-3.5" />
            JSON
          </button>
          <button
            onClick={() => setViewMode('api')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              viewMode === 'api'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Code className="h-3.5 w-3.5" />
            API
          </button>
          <button
            onClick={() => setViewMode('curl')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              viewMode === 'curl'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Terminal className="h-3.5 w-3.5" />
            cURL
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 px-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-1.5 text-green-500" />
              <span className="text-xs">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-1.5" />
              <span className="text-xs">复制</span>
            </>
          )}
        </Button>
      </div>

      {/* 代码预览 */}
      <div className="relative">
        <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed max-h-[400px] overflow-y-auto">
          <code className="text-foreground">
            {getContent()}
          </code>
        </pre>
      </div>

      {/* 参数统计 */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>已配置参数: {Object.keys(cleanParams).length} 个</span>
        {cleanParams.size && (
          <span>分辨率: {cleanParams.size}</span>
        )}
        {cleanParams.n && (
          <span>生成数量: {cleanParams.n}</span>
        )}
        {cleanParams.quality && (
          <span>质量: {cleanParams.quality}</span>
        )}
        {cleanParams.seed !== undefined && (
          <span>种子: {cleanParams.seed}</span>
        )}
      </div>
    </div>
  )
}

// 参数对比组件
interface ParamsCompareProps {
  before: Record<string, any>
  after: Record<string, any>
  className?: string
}

export function ParamsCompare({ before, after, className }: ParamsCompareProps) {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  
  const getDiffType = (key: string): 'added' | 'removed' | 'modified' | 'same' => {
    const hasBefore = key in before
    const hasAfter = key in after
    
    if (!hasBefore && hasAfter) return 'added'
    if (hasBefore && !hasAfter) return 'removed'
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return 'modified'
    return 'same'
  }

  const getDiffColor = (type: string) => {
    switch (type) {
      case 'added':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'removed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case 'modified':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
      default:
        return ''
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium">参数变更对比</h4>
      <div className="space-y-1">
        {Array.from(allKeys).map(key => {
          const diffType = getDiffType(key)
          const colorClass = getDiffColor(diffType)
          
          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md text-xs",
                colorClass
              )}
            >
              <span className="font-mono">{key}</span>
              <div className="flex items-center gap-2">
                {diffType === 'modified' && (
                  <>
                    <span className="line-through opacity-60">
                      {JSON.stringify(before[key])}
                    </span>
                    <span>→</span>
                  </>
                )}
                <span>{JSON.stringify(after[key] ?? before[key])}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
