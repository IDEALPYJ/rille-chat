"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, FileText, Quote, FileImage, FileVideo, FileAudio } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface RetrievalChunk {
  id: string;
  content: string;
  fileId: string;
  fileName?: string;
  fileType?: string;
  similarity: number;
  chunkIndex?: number;
}

interface RetrievalData {
  chunks: RetrievalChunk[];
  totalChunks: number;
  query?: string;
}

interface RetrievalDisplayProps {
  content: string;
}

/**
 * 判断文件是否为文本类型（可展示内容）
 */
function isTextFile(fileType?: string, fileName?: string): boolean {
  if (!fileType && !fileName) return true; // 默认为文本

  const textMimeTypes = [
    'text/',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/rtf',
    'application/vnd.oasis.opendocument',
  ];

  const textExtensions = [
    '.txt', '.md', '.markdown', '.json', '.xml', '.yaml', '.yml',
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
    '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
    '.sh', '.bash', '.zsh', '.html', '.css', '.scss', '.less', '.sql',
    '.r', '.m', '.pl', '.lua', '.vim', '.log', '.conf', '.config',
    '.ini', '.toml', '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.rtf', '.odt', '.ods', '.odp'
  ];

  const mimeTypeMatch = fileType && textMimeTypes.some(type => fileType.startsWith(type) || fileType.includes(type));
  const extMatch = fileName && textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

  return !!(mimeTypeMatch || extMatch);
}

/**
 * 根据文件类型获取图标
 */
function getFileIcon(fileType?: string, fileName?: string) {
  if (!fileType && !fileName) return FileText;

  const type = (fileType || '').toLowerCase();
  const name = (fileName || '').toLowerCase();

  // 图片
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name)) {
    return FileImage;
  }

  // 视频
  if (type.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(name)) {
    return FileVideo;
  }

  // 音频
  if (type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i.test(name)) {
    return FileAudio;
  }

  return FileText;
}

export function RetrievalDisplay({ content }: RetrievalDisplayProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const retrievalData = useMemo<RetrievalData | null>(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  // 生成预览文本
  const previewText = useMemo(() => {
    if (!retrievalData) return "";

    const chunkCount = retrievalData.chunks?.length || 0;
    const fileNames = [...new Set(retrievalData.chunks?.map(c => c.fileName).filter(Boolean))];

    if (chunkCount > 0) {
      if (fileNames.length > 0) {
        return `${fileNames.slice(0, 2).join(", ")}${fileNames.length > 2 ? ` +${fileNames.length - 2}` : ""}`;
      }
      return t("messageDisplay.retrievalResultsCount", { count: chunkCount });
    }

    return t("messageDisplay.retrievalCompleted");
  }, [retrievalData, t]);

  // 格式化相似度为百分比
  const formatSimilarity = (similarity: number): string => {
    return `${Math.round(similarity * 100)}%`;
  };

  // 截断内容用于预览
  const truncateContent = (content: string, maxLength: number = 200): string => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  if (!content) return null;

  return (
    <div className="mb-3 py-1">
      {/* 折叠标题栏 */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
          <FileText size={14} className={isExpanded ? "" : "animate-pulse"} />
          <span>{t("messageDisplay.documentRetrieval")}</span>
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
          {retrievalData ? (
            <>
              {/* 文档引用卡片 */}
              <div className="grid grid-cols-1 gap-2">
                {retrievalData.chunks.map((chunk, idx) => {
                  const isText = isTextFile(chunk.fileType, chunk.fileName);
                  const FileIcon = getFileIcon(chunk.fileType, chunk.fileName);

                  return (
                    <div
                      key={chunk.id || idx}
                      className="flex flex-col gap-2 p-3 rounded-md border border-border dark:border-border hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group/card"
                    >
                      {/* 标题行 */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isText ? (
                            <Quote size={12} className="text-emerald-500 shrink-0" />
                          ) : (
                            <FileIcon size={12} className="text-emerald-500 shrink-0" />
                          )}
                          <h4 className="text-[11px] font-medium text-foreground dark:text-muted-foreground truncate">
                            {chunk.fileName || t("messageDisplay.unknownFile")}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {chunk.chunkIndex !== undefined && isText && (
                            <span className="text-[10px] text-muted-foreground">
                              #{chunk.chunkIndex + 1}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                            {formatSimilarity(chunk.similarity)}
                          </span>
                        </div>
                      </div>

                      {/* 内容摘要 - 仅文本文件显示 */}
                      {isText ? (
                        <p className="text-[11px] text-muted-foreground dark:text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {truncateContent(chunk.content, 300)}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <FileIcon size={14} className="text-emerald-500" />
                          <span>{chunk.fileType || t("messageDisplay.unknownFile")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 来源统计 */}
              {retrievalData.totalChunks > retrievalData.chunks.length && (
                <div className="text-[10px] text-muted-foreground dark:text-muted-foreground text-right">
                  {t("messageDisplay.retrievalResultsMore", {
                    shown: retrievalData.chunks.length,
                    total: retrievalData.totalChunks
                  })}
                </div>
              )}
            </>
          ) : (
            // Fallback for non-JSON content
            <div className="text-xs text-muted-foreground dark:text-muted-foreground whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
