"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Globe, ExternalLink, Lightbulb } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface PerplexityImage {
  url: string;
  description?: string;
}

interface PerplexityStreamExtra {
  search_results?: SearchResult[];
  citations?: string[];
  images?: PerplexityImage[];
  related_questions?: string[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: {
      input_tokens_cost: number;
      output_tokens_cost: number;
      request_cost: number;
      total_cost: number;
    };
  };
}

interface PerplexitySearchResultsProps {
  extra: PerplexityStreamExtra;
}

export function PerplexitySearchResults({ extra }: PerplexitySearchResultsProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'images' | 'related'>('sources');

  const { search_results, citations, images, related_questions, usage } = extra;

  // 如果没有搜索结果，不显示
  if (!search_results && !citations && !images && !related_questions) {
    return null;
  }

  const hasSources = search_results && search_results.length > 0;
  const hasImages = images && images.length > 0;
  const hasRelated = related_questions && related_questions.length > 0;

  return (
    <div className="mb-3 py-1">
      {/* 折叠标题栏 */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-medium text-[11px] group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
          <Globe size={14} className={isExpanded ? "" : "animate-pulse"} />
          <span>{t("messageDisplay.webSearch")}</span>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>

        {/* 折叠时显示统计 */}
        {!isExpanded && (
          <div className="text-muted-foreground dark:text-muted-foreground text-[11px] truncate flex-1 font-normal">
            {hasSources && `${search_results!.length} 来源`}
            {hasImages && ` · ${images!.length} 图片`}
            {hasRelated && ` · ${related_questions!.length} 相关问题`}
          </div>
        )}
      </div>

      {/* 展开的内容 */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* 标签页导航 */}
          <div className="flex gap-2 border-b border-border dark:border-border pb-2">
            {hasSources && (
              <button
                onClick={() => setActiveTab('sources')}
                className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'sources'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted/50'
                }`}
              >
                来源 ({search_results!.length})
              </button>
            )}
            {hasImages && (
              <button
                onClick={() => setActiveTab('images')}
                className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'images'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted/50'
                }`}
              >
                图片 ({images!.length})
              </button>
            )}
            {hasRelated && (
              <button
                onClick={() => setActiveTab('related')}
                className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'related'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-muted-foreground hover:bg-muted dark:hover:bg-muted/50'
                }`}
              >
                相关问题 ({related_questions!.length})
              </button>
            )}
          </div>

          {/* 来源标签页 */}
          {activeTab === 'sources' && hasSources && (
            <div className="space-y-2">
              {/* Citations 引用列表 */}
              {citations && citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {citations.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <span>[{idx + 1}]</span>
                      <span className="truncate max-w-[150px]">
                        {(() => {
                          try {
                            return new URL(url).hostname;
                          } catch {
                            return url;
                          }
                        })()}
                      </span>
                      <ExternalLink size={8} />
                    </a>
                  ))}
                </div>
              )}

              {/* 搜索结果卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {search_results!.map((result, idx) => (
                  <a
                    key={idx}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border dark:border-border hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all group/card"
                  >
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-[11px] font-medium text-foreground dark:text-muted-foreground line-clamp-2 leading-tight group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
                        {result.title}
                      </h4>
                      <ExternalLink size={10} className="shrink-0 mt-0.5 text-muted-foreground dark:text-foreground/80 group-hover/card:text-blue-400" />
                    </div>

                    {/* 内容摘要 */}
                    {result.snippet && (
                      <p className="text-[10px] text-muted-foreground dark:text-muted-foreground line-clamp-2 leading-normal">
                        {result.snippet}
                      </p>
                    )}

                    {/* 域名 */}
                    <div className="text-[9px] text-muted-foreground dark:text-foreground/80 truncate mt-auto flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-muted dark:bg-muted flex items-center justify-center">
                        <Globe size={8} className="text-muted-foreground" />
                      </div>
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
            </div>
          )}

          {/* 图片标签页 */}
          {activeTab === 'images' && hasImages && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images!.map((image, idx) => (
                <a
                  key={idx}
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video rounded-lg overflow-hidden border border-border dark:border-border hover:border-blue-200 dark:hover:border-blue-800/50 transition-all"
                >
                  <img
                    src={image.url}
                    alt={image.description || `Image ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      // 图片加载失败时显示占位符
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex flex-col items-center justify-center bg-muted dark:bg-muted">
                            <svg class="w-6 h-6 text-muted-foreground mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span class="text-[9px] text-muted-foreground">Image unavailable</span>
                          </div>
                        `;
                      }
                    }}
                  />
                  {image.description && (
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-[9px] text-white line-clamp-1">{image.description}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* 相关问题标签页 */}
          {activeTab === 'related' && hasRelated && (
            <div className="space-y-2">
              {related_questions!.map((question, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg border border-border dark:border-border hover:border-blue-200 dark:hover:border-blue-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                >
                  <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-foreground dark:text-muted-foreground">{question}</span>
                </div>
              ))}
            </div>
          )}

          {/* 成本信息 */}
          {usage?.cost && (
            <div className="pt-2 border-t border-border dark:border-border">
              <div className="text-[10px] text-muted-foreground dark:text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                <span>Input Cost: ${usage.cost.input_tokens_cost.toFixed(6)}</span>
                <span>Output Cost: ${usage.cost.output_tokens_cost.toFixed(6)}</span>
                <span>Total Cost: ${usage.cost.total_cost.toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
