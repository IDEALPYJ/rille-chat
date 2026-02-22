"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Globe, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

interface SearchData {
  provider?: string;
  answer?: string;
  results: SearchResult[];
}

interface SearchDisplayProps {
  content: string;
}

export function SearchDisplay({ content }: SearchDisplayProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const searchData = useMemo<SearchData | null>(() => {
    try {
      return JSON.parse(content);
    } catch {
      // Fallback for old markdown content or malformed JSON
      return null;
    }
  }, [content]);

  // 生成搜索摘要预览
  const previewText = useMemo(() => {
    if (!searchData) return "";
    
    const resultCount = searchData.results?.length || 0;
    const provider = searchData.provider || "网络";
    
    if (searchData.answer) {
      // 截取答案的前50个字符作为预览
      const preview = searchData.answer.slice(0, 50);
      return preview + (searchData.answer.length > 50 ? "..." : "");
    }
    
    if (resultCount > 0) {
      return t("messageDisplay.searchResultsCount", { count: resultCount, provider });
    }
    
    return t("messageDisplay.searchCompleted");
  }, [searchData, t]);

  if (!content) return null;

  return (
    <div className="pt-0">
      {/* 折叠标题栏 */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-medium text-[11px] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
          <Globe size={14} />
          <span>{t("messageDisplay.webSearch")}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
        
        {/* 折叠时显示预览 */}
        {!isExpanded && previewText && (
          <div className="text-muted-foreground dark:text-muted-foreground text-[11px] truncate flex-1 font-normal">
            {previewText}
          </div>
        )}
      </div>

      {/* 展开的内容 */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {searchData ? (
            <>
              {/* 搜索摘要/答案 */}
              {searchData.answer && (
                <div className="text-xs text-foreground/80 dark:text-muted-foregroundleading-relaxed bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900/30">
                  <p>{searchData.answer}</p>
                </div>
              )}
              
              {/* 搜索结果卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {searchData.results.map((result, idx) => (
                  <a
                    key={idx}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1.5 p-2.5 rounded-md border border-border dark:border-borderhover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group/card"
                  >
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-[11px] font-medium text-foreground dark:text-muted-foregroundline-clamp-2 break-all leading-tight group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                        {result.title}
                      </h4>
                      <ExternalLink size={10} className="shrink-0 mt-0.5 text-muted-foreground dark:text-foreground/80group-hover/card:text-blue-400" />
                    </div>

                    {/* 内容摘要 */}
                    {result.content && (
                      <p className="text-[10px] text-muted-foreground dark:text-muted-foregroundline-clamp-2 break-all leading-normal">
                        {result.content.length > 150 ? result.content.slice(0, 150) + '...' : result.content}
                      </p>
                    )}
                    
                    {/* 域名 */}
                    <div className="text-[9px] text-muted-foreground dark:text-foreground/80truncate mt-auto flex items-center gap-1">
                      <Globe size={10} className="text-muted-foreground shrink-0" />
                      {(() => {
                        try {
                          return new URL(result.url).hostname;
                        } catch {
                          return result.url;
                        }
                      })()}
                    </div>
                  </a>
                ))}
              </div>
              
              {/* 来源标识 */}
              {searchData.provider && (
                <div className="text-[10px] text-muted-foreground dark:text-muted-foreground text-right">
                  {t("messageDisplay.searchResultsFrom", { provider: searchData.provider })}
                </div>
              )}
            </>
          ) : (
            // Fallback for non-JSON content
            <div className="text-xs text-muted-foreground dark:text-muted-foregroundwhitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
