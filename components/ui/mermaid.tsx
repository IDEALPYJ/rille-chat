"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { cn } from "@/lib/utils"

interface MermaidProps {
  chart: string
  className?: string
  isStreaming?: boolean // 是否还在流式输出
  messageStatus?: 'pending' | 'streaming' | 'completed' | 'error' // 消息状态
}

// 全局初始化标志，确保 mermaid 只初始化一次
let mermaidInitialized = false

function initializeMermaid() {
  if (mermaidInitialized) return
  
  const isDark = typeof window !== 'undefined' && 
    (window.matchMedia('(prefers-color-scheme: dark)').matches || 
     document.documentElement.classList.contains('dark'))

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
    },
  })
  
  mermaidInitialized = true
}

// 检查 mermaid 代码块是否完整（用于流式输出场景）
function isMermaidCodeBlockComplete(code: string): boolean {
  if (!code || !code.trim()) return false
  
  const trimmed = code.trim()
  
  // 基本检查：至少应该有一些有效的 mermaid 语法
  if (trimmed.length < 10) return false
  
  // 检查是否包含常见的 mermaid 图表类型开始标记
  const hasValidStart = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|requirement|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|mindmap|timeline|quadrantChart|sankey-beta|sankey)/i.test(trimmed)
  
  if (!hasValidStart) return false
  
  // 检查是否有基本的节点或连接定义
  const hasBasicStructure = /(-->|--|==>|==|\.\.\.|\[|\]|\(|\)|{|})/.test(trimmed)
  if (!hasBasicStructure) return false
  
  // 重要：检查最后一行是否完整
  // 如果最后一行以箭头、连接符或未闭合的括号/方括号结尾，可能还在流式输出中
  const lines = trimmed.split('\n')
  const lastLine = lines[lines.length - 1].trim()
  
  // 如果最后一行以不完整的语法结尾，认为代码不完整
  // 例如：以箭头、连接符、未闭合的括号等结尾
  if (lastLine.match(/--$|==$|\.\.\.$|-->$|==>$|\[$|\($|{$/)) {
    return false
  }
  
  // 完整的括号/括号匹配检查（检查整个代码，而不仅仅是最后一行）
  if (!isBracketsBalanced(trimmed)) {
    return false
  }
  
  return true
}

/**
 * 完整的括号/括号匹配验证
 * 检查以下类型的括号是否匹配：
 * - 圆括号 ()
 * - 方括号 []
 * - 大括号 {}
 * - 尖括号 <> (在某些 mermaid 语法中使用)
 * 
 * 使用栈来跟踪未闭合的括号，确保括号正确匹配
 */
function isBracketsBalanced(code: string): boolean {
  const stack: Array<{ char: string; index: number }> = []
  
  // 括号对映射
  const bracketPairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '<': '>',
  }
  
  // 忽略字符串中的括号（单引号、双引号、反引号）
  let inString = false
  let stringChar = ''
  let escapeNext = false
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    
    // 处理转义字符
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    // 检查字符串的开始和结束
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true
      stringChar = char
      continue
    } else if (inString && char === stringChar) {
      inString = false
      stringChar = ''
      continue
    }
    
    // 如果当前在字符串中，跳过括号检查
    if (inString) {
      continue
    }
    
    // 检查是否是开括号
    if (char in bracketPairs) {
      stack.push({ char, index: i })
    }
    // 检查是否是闭括号
    else if (Object.values(bracketPairs).includes(char)) {
      if (stack.length === 0) {
        // 闭括号没有对应的开括号
        return false
      }
      
      const lastOpen = stack.pop()!
      const expectedClose = bracketPairs[lastOpen.char]
      
      if (char !== expectedClose) {
        // 括号类型不匹配
        return false
      }
    }
  }
  
  // 如果栈不为空，说明有未闭合的括号
  if (stack.length > 0) {
    return false
  }
  
  return true
}

export function Mermaid({ chart, className, isStreaming = false, messageStatus }: MermaidProps) {
  const containerRef = useRef<HTMLDivElement>(null)
   
  const [_error, setError] = useState<string | null>(null)
  const [isRendered, setIsRendered] = useState(false)
  const chartRef = useRef<string>(chart)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 当 chart 内容改变时，重置渲染状态
  useEffect(() => {
    if (chartRef.current !== chart) {
      chartRef.current = chart
      setIsRendered(false)
      setError(null)
      
      // 清除之前的 debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [chart])

  useEffect(() => {
    if (!containerRef.current || !chart.trim()) return

    // 清除之前的 debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // 检查代码块是否完整（防止流式输出时渲染不完整的代码）
    const isComplete = isMermaidCodeBlockComplete(chart)
    
    if (!isComplete) {
      // 如果代码块不完整，显示加载状态
      if (containerRef.current) {
        const currentContent = containerRef.current.innerHTML
        if (!currentContent.includes("正在生成图表")) {
          containerRef.current.innerHTML = `<div class="p-4 text-sm text-muted-foreground">正在生成图表...</div>`
        }
      }
      // 使用 debounce，等待代码稳定后再检查
      debounceTimerRef.current = setTimeout(() => {
        // 重新检查代码是否完整
        if (containerRef.current && isMermaidCodeBlockComplete(chart)) {
          // 如果现在完整了，触发重新渲染
          setIsRendered(false)
        }
      }, 300) // 300ms 延迟
      return
    }

    // 如果代码块完整，使用 debounce 延迟渲染，避免频繁渲染
    debounceTimerRef.current = setTimeout(() => {
      if (!containerRef.current) return
      
      // 再次检查代码是否仍然完整（可能在 debounce 期间又更新了）
      if (!isMermaidCodeBlockComplete(chart)) {
        return
      }

      // 如果已经渲染过且内容相同，则跳过
      if (isRendered && chartRef.current === chart) {
        return
      }

      const container = containerRef.current
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

      // 初始化 mermaid（只初始化一次）
      initializeMermaid()

      // 先尝试解析，如果解析失败就不渲染
      // 使用 try-catch 包装，避免 mermaid 显示错误提示
      let parseSuccess = false
       
      let _parseError: unknown = null
      try {
        // 使用 mermaid.parse 验证代码是否有效
        // 这会抛出错误如果代码不完整或语法错误
        mermaid.parse(chart)
        parseSuccess = true
      } catch (parseErr: unknown) {
        // 解析失败，记录错误
        parseSuccess = false
        _parseError = parseErr
        const errorMessage = (parseErr as Error).message || ""
        
        // 如果还在流式输出，显示加载状态
        if (isStreaming || messageStatus === 'streaming' || messageStatus === 'pending') {
          if (errorMessage.includes("Parse error") || 
              errorMessage.includes("Expecting") ||
              errorMessage.includes("EOF") ||
              errorMessage.includes("Syntax error")) {
            if (container && containerRef.current === container) {
              container.innerHTML = `<div class="p-4 text-sm text-muted-foreground">正在生成图表...</div>`
            }
            setIsRendered(false)
            return
          }
        }
        
        // 如果消息已完成但仍有错误，显示友好的错误信息
        if (messageStatus === 'completed' || (!isStreaming && messageStatus !== 'streaming' && messageStatus !== 'pending')) {
          const errorMsg = (parseErr as Error).message || "Mermaid 图表语法错误"
          if (container && containerRef.current === container) {
            container.innerHTML = `
              <div class="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                <div class="flex items-start gap-2">
                  <div class="text-amber-600 dark:text-amber-400 font-semibold text-sm">⚠️ Mermaid 图表渲染失败</div>
                </div>
                <div class="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  <p class="font-medium mb-1">错误原因：</p>
                  <p class="font-mono bg-amber-100 dark:bg-amber-900/30 p-2 rounded text-[10px] break-all">${errorMsg}</p>
                </div>
                <div class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  <p>请检查 Mermaid 代码语法是否正确。</p>
                </div>
              </div>
            `
          }
          setIsRendered(true)
          setError(errorMsg)
          return
        }
      }

      // 只有解析成功才渲染
      if (!parseSuccess) {
        return
      }

      // 渲染图表
      mermaid
        .render(id, chart)
        .then(({ svg }) => {
          if (container && containerRef.current === container) {
            container.innerHTML = svg
            setIsRendered(true)
            setError(null)
          }
        })
        .catch((err) => {
          // 静默处理错误，不输出到控制台
          const errorMessage = err.message || ""
          setError(errorMessage)
          if (container && containerRef.current === container) {
            const isParseError = errorMessage.includes("Parse error") || 
                                errorMessage.includes("Expecting") ||
                                errorMessage.includes("EOF") ||
                                errorMessage.includes("Syntax error")
            
            // 如果还在流式输出，显示加载状态
            if (isParseError && (isStreaming || messageStatus === 'streaming' || messageStatus === 'pending')) {
              container.innerHTML = `<div class="p-4 text-sm text-muted-foreground">正在生成图表...</div>`
              setIsRendered(false)
            } else if (messageStatus === 'completed' || (!isStreaming && messageStatus !== 'streaming' && messageStatus !== 'pending')) {
              // 如果消息已完成但仍有错误，显示友好的错误信息
              container.innerHTML = `
                <div class="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                  <div class="flex items-start gap-2">
                    <div class="text-amber-600 dark:text-amber-400 font-semibold text-sm">⚠️ Mermaid 图表渲染失败</div>
                  </div>
                  <div class="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    <p class="font-medium mb-1">错误原因：</p>
                    <p class="font-mono bg-amber-100 dark:bg-amber-900/30 p-2 rounded text-[10px] break-all">${errorMessage || '未知错误'}</p>
                  </div>
                  <div class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    <p>请检查 Mermaid 代码语法是否正确。</p>
                  </div>
                </div>
              `
              setIsRendered(true)
            } else {
              container.innerHTML = `<div class="p-4 text-sm text-red-500 dark:text-red-400">Error rendering mermaid: ${errorMessage}</div>`
            }
          }
        })
    }, 200) // 200ms debounce

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [chart, isRendered])

  // 清理 mermaid 错误提示的副作用 - 使用 MutationObserver 立即移除
  useEffect(() => {
    // 使用 MutationObserver 监听 DOM 变化，立即移除 mermaid 错误提示
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            // 检查是否是 mermaid 错误提示元素
            const isMermaidError = 
              element.textContent?.includes("Syntax error") ||
              element.textContent?.includes("Parse error") ||
              element.textContent?.includes("mermaid version") ||
              element.classList.toString().includes("mermaid") && 
              (element.classList.toString().includes("error") || 
               element.getAttribute("id")?.includes("error"))
            
            if (isMermaidError) {
              // 立即移除
              element.remove()
            }
            
            // 递归检查子元素
            const errorChildren = element.querySelectorAll(
              '[class*="mermaid"][class*="error"], ' +
              '.mermaid-error, ' +
              '[id*="mermaid-error"], ' +
              '[class*="error"][class*="mermaid"]'
            )
            errorChildren.forEach(child => {
              if (child.textContent?.includes("Syntax error") || 
                  child.textContent?.includes("Parse error") ||
                  child.textContent?.includes("mermaid version")) {
                child.remove()
              }
            })
          }
        })
      })
    })

    // 开始观察整个文档的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    // 立即清理已存在的错误提示
    const cleanupExistingErrors = () => {
      // 查找所有可能包含 mermaid 错误提示的元素
      const allElements = document.querySelectorAll('div, span, p, pre, code')
      allElements.forEach(el => {
        const text = el.textContent || ''
        // 检查是否包含 mermaid 错误提示的关键词
        if ((text.includes("Syntax error") || 
             text.includes("Parse error") ||
             text.includes("mermaid version")) &&
            (el.classList.toString().includes("mermaid") ||
             el.getAttribute("id")?.includes("mermaid") ||
             el.getAttribute("class")?.includes("error"))) {
          el.remove()
        }
      })
      
      // 也检查特定的选择器
      const errorSelectors = [
        '[class*="mermaid"][class*="error"]',
        '.mermaid-error',
        '[id*="mermaid-error"]',
        '[class*="error"][class*="mermaid"]'
      ]
      
      errorSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach(el => {
            if (el.textContent?.includes("Syntax error") || 
                el.textContent?.includes("Parse error") ||
                el.textContent?.includes("mermaid version")) {
              el.remove()
            }
          })
        } catch {
          // 忽略选择器错误
        }
      })
    }

    cleanupExistingErrors()
    const cleanupInterval = setInterval(cleanupExistingErrors, 200)

    return () => {
      observer.disconnect()
      clearInterval(cleanupInterval)
    }
  }, [])

  return (
    <>
      {/* 隐藏 mermaid 全局错误提示的样式 */}
      <style jsx global>{`
        .mermaid-error,
        [class*="mermaid"][class*="error"],
        [id*="mermaid-error"],
        [class*="error"][class*="mermaid"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
          position: absolute !important;
          left: -9999px !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className={cn(
          "mermaid-container my-4 rounded-md border bg-card/50 p-4 overflow-auto",
          className
        )}
      />
    </>
  )
}

