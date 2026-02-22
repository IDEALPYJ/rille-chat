import { useEffect, useState, memo, useRef, useMemo } from 'react';
import { createHighlighter, type Highlighter } from 'shiki';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// 全局单例，防止重复创建
let highlighterPromise: Promise<Highlighter> | null = null;
let globalHighlighter: Highlighter | null = null;

function getGlobalHighlighter() {
  if (globalHighlighter) return Promise.resolve(globalHighlighter);
  
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: ['javascript', 'typescript', 'python', 'json', 'bash', 'tsx', 'html', 'css', 'markdown'],
    }).then(h => {
      globalHighlighter = h;
      return h;
    });
  }
  return highlighterPromise;
}

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock = memo(({ language, value }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [highlighterLoaded, setHighlighterLoaded] = useState(!!globalHighlighter);
  const containerRef = useRef<HTMLDivElement>(null);

  // 如果 highlighter 还没加载，异步加载并触发重新渲染
  useEffect(() => {
    if (!highlighterLoaded) {
      getGlobalHighlighter().then(() => {
        setHighlighterLoaded(true);
      });
    }
  }, [highlighterLoaded]);

  // 同步生成 HTML，避免 useEffect 带来的延迟和闪烁
  const html = useMemo(() => {
    if (!globalHighlighter) return null;
    try {
      return globalHighlighter.codeToHtml(value, {
        lang: language || 'text',
        theme: 'vitesse-light',
      });
    } catch {
      return globalHighlighter.codeToHtml(value, {
        lang: 'text',
        theme: 'vitesse-light',
      });
    }
  }, [value, language, highlighterLoaded]);
  
  // 检测当前是否为深色模式
  const isDarkMode = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDarkClass = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const shouldUseDarkTheme = isDarkMode || isDarkClass;

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // 计算代码行数，用于判断是否需要 sticky
  const lineCount = value.split('\n').length;
  const needsSticky = lineCount > 5; // 超过5行才启用 sticky

  return (
    <div
        ref={containerRef}
        className={cn(
          "code-block-container relative group rounded-md my-4 border text-sm w-full max-w-full grid grid-cols-1",
          "border bg-card/50",
          !isCollapsed && needsSticky ? "overflow-visible" : "overflow-hidden"
        )}
    >
      {/* 标题栏 - 当代码块较长时启用 sticky */}
      <div className={cn(
        "code-block-header flex items-center justify-between p-1 px-3 select-none rounded-t-md z-30 min-w-0",
        "bg-muted/95 dark:bg-muted/50 border-b backdrop-blur-sm",
        isCollapsed ? "rounded-b-md" : "",
        needsSticky && !isCollapsed && "sticky top-0"
      )}>
        <span className="text-xs font-medium text-muted-foreground">{language || 'text'}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Copy code"
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            aria-label={isCollapsed ? "Expand code" : "Collapse code"}
          >
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="overflow-x-auto w-full relative min-h-[1.6rem] transition-none min-w-0">
          {html ? (
            <div
              className={cn(
                "shiki-container [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-4 [&>pre]:!leading-[1.6] [&>pre]:!text-[0.8rem] font-mono whitespace-pre transition-none",
                shouldUseDarkTheme && "[&>pre]:!bg-[#1e1e1e] [&>pre]:!text-[#e0e0e0]"
              )}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <pre className="p-4 m-0 leading-[1.6] text-[0.8rem] font-mono text-foreground bg-transparent whitespace-pre transition-none">
              <code>{value}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}, (prev, next) => prev.value === next.value && prev.language === next.language);

CodeBlock.displayName = 'CodeBlock';
