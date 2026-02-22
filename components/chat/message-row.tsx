import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { RotateCw, GitBranch, Pencil, Coins, Volume2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

import { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ModelIcon } from "@/components/ui/model-icon";
import { CodeBlock } from "@/components/ui/code-block";
import { Mermaid } from "@/components/ui/mermaid";

import { ReasoningDisplay } from "./reasoning-display";
import { SearchDisplay } from "./search-display";
import { RetrievalDisplay } from "./retrieval-display";
import { McpToolCallsDisplay } from "./mcp-tool-calls-display";
import { TokenUsageTooltip } from "./token-usage-tooltip";
import { CopyButton } from "./copy-button";
import { ImageMessageDisplay } from "./image-message-display";
import { InterleavedContent } from "./interleaved-content";

import { BranchSwitcher } from "./branch-switcher";
import { LoadingIndicator } from "./loading-indicator";
import { MessageAttachments } from "./message-attachments";
import { VoiceMessagePlayer } from "./voice-message-player";
import Highlighter from "react-highlight-words";
import { Skeleton } from "@/components/ui/skeleton";

interface MessageRowProps {
  message: Message;
  messageMap: Map<string, Message>;
  rootMessageIds: string[];
  setCurrentLeafId: (id: string) => void;
  _onEdit: (id: string, content: string) => void;
  onRegenerate: (id: string) => void;
  onFork?: (id: string) => void;
  _onSelectArtifact: (a: any) => void;
  isEditing: boolean;
  editContent: string;
  onEditStart: (id: string, content: string) => void;
  onEditCancel: () => void;
  onEditSave: (id: string, content: string) => void;
  onEditContentChange: (content: string) => void;
  isLast: boolean;
  isLoading: boolean;
  searchWords?: string[];
  highlightClassName?: string;
  onSpeak?: (text: string) => void;
}

/**
 * 消息行组件，负责渲染单条对话消息及其相关的交互操作
 */
export const MessageRow = memo(({
  message,
  _onEdit,
  onRegenerate,
  onFork,
  _onSelectArtifact,
  messageMap,
  rootMessageIds,
  setCurrentLeafId,
  isEditing,
  editContent,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditContentChange,
  isLast,
  isLoading,
  searchWords,
  highlightClassName,
  onSpeak
}: MessageRowProps) => {
  const { t } = useI18n()
  const isUser = message.role === "user";
  const isContentEmpty = !message.content && !message.reasoning_content && !message.search_results;
  const showLoading = !isUser && isLast && isLoading && isContentEmpty;

  // 检查是否为图像消息
  const isImageMessage = useMemo(() => {
    if (isUser || !message.content) return false;
    try {
      const parsed = JSON.parse(message.content);
      return parsed.type === 'image_generation';
    } catch {
      return false;
    }
  }, [isUser, message.content]);

  // 检查是否为图文混排消息
  const isInterleavedMessage = useMemo(() => {
    if (isUser || !message.content) return false;
    try {
      const parsed = JSON.parse(message.content);
      return parsed.type === 'interleaved';
    } catch {
      return false;
    }
  }, [isUser, message.content]);

  // 检查是否为pending状态的图像消息
  const isPendingImageMessage = useMemo(() => {
    return !isUser && isImageMessage && message.status === 'pending';
  }, [isUser, isImageMessage, message.status]);

  const handleEditStart = () => message.id && onEditStart(message.id, message.content);
  const handleEditSave = () => message.id && onEditSave(message.id, editContent);

  // 自定义 Markdown 渲染组件，处理代码块、数学公式等
  const markdownComponents = useMemo(() => {
    const renderWithHighlight = (node: any, children: any, Tag: 'p' | 'li' | 'td' | 'th' | 'blockquote') => {
      // 遍历子节点，如果子节点是文本节点，则使用 Highlighter 包裹
      const processedChildren = React.Children.map(children, (child) => {
        if (typeof child === 'string') {
          return (
            <Highlighter
              searchWords={searchWords || []}
              autoEscape={true}
              textToHighlight={child}
              highlightClassName={highlightClassName || ""}
            />
          );
        }
        return child;
      });

      // 如果子元素是块级元素（如 div），则直接渲染，避免嵌套在 p 标签中引起 HTML 验证错误
      if (node.children[0]?.tagName === 'div') {
        return <>{processedChildren}</>;
      }
      return <Tag>{processedChildren}</Tag>;
    };

    const baseComponents = {
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : '';

        // 判断是否为行内代码
        const isInline = inline ||
          (!className && !String(children).includes('\n')) ||
          (node?.position?.start?.line === node?.position?.end?.line && !className);

        if (isInline) {
          return (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
              {children}
            </code>
          );
        }

        // 如果是 mermaid 代码块，使用 Mermaid 组件渲染
        if (language === 'mermaid') {
          return (
            <Mermaid
              chart={String(children).replace(/\n$/, '')}
              isStreaming={isLoading && isLast}
              messageStatus={message.status}
            />
          );
        }

        return (
          <CodeBlock
            language={language}
            value={String(children).replace(/\n$/, '')}
          />
        );
      },
      pre({ children }: any) {
        // CodeBlock 内部已处理包装，此处直接返回
        return <>{children}</>;
      }
    };

    if (searchWords && searchWords.length > 0) {
      return {
        ...baseComponents,
        p: ({ node, children }: any) => renderWithHighlight(node, children, 'p'),
        li: ({ node, children }: any) => renderWithHighlight(node, children, 'li'),
        td: ({ node, children }: any) => renderWithHighlight(node, children, 'td'),
        th: ({ node, children }: any) => renderWithHighlight(node, children, 'th'),
        blockquote: ({ node, children }: any) => renderWithHighlight(node, children, 'blockquote'),
      };
    }

    return baseComponents;

  }, [searchWords, highlightClassName]);

  return (
    <div className="w-full max-w-full md:max-w-3xl mx-auto py-4 px-0 md:px-4 group overflow-x-hidden">
      <div className="flex items-start md:gap-4 gap-0">
        {/* 左侧头像或占位 - 移动端隐藏 */}
        <div className="shrink-0 w-0 md:w-8 mt-1.5 hidden md:flex justify-center">
          {!isUser && (
            <ModelIcon
              model={message.model}
              provider={message.provider}
              avatar={message.modelAvatar}
              size={32}
              variant="color"
              className="w-8 h-8"
            />
          )}
        </div>

        <div className="w-full flex-1 min-w-0 flex flex-col">
          <div className={`${isUser ? "items-end" : "items-start"} flex flex-col w-full min-w-0`}>
            {/* 渲染语音消息 */}
            {isUser && message.isVoiceInput && message.audioUrl && (
              <div className="mb-2">
                <VoiceMessagePlayer
                  audioUrl={message.audioUrl}
                  audioDuration={message.audioDuration}
                />
              </div>
            )}

            {/* 渲染附件 */}
            <MessageAttachments attachments={message.attachments} isUser={isUser} />

            <div
              className={`${isUser ? "inline-block self-end" : "block w-full"} text-left px-3 py-2 rounded-lg min-w-0 max-w-full ${isUser
                ? "bg-muted text-foreground"
                : "bg-transparent text-foreground px-0 pt-1 pb-0"
                } ${isEditing ? "w-full" : ""}`}
            >
              {showLoading ? (
                <LoadingIndicator />
              ) : isEditing ? (
                /* 编辑模式 */
                <div className="flex flex-col gap-2 w-full">
                  <Textarea
                    value={editContent}
                    onChange={(e) => onEditContentChange(e.target.value)}
                    className="w-full resize-none border-none bg-transparent p-0 shadow-none focus-visible:ring-0 min-h-0 text-inherit font-inherit leading-6"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onEditCancel} className="px-3 text-xs bg-background/50">
                      {t("message.cancel")}
                    </Button>
                    <Button size="sm" onClick={handleEditSave} className="px-3 text-xs">
                      {t("message.confirm")}
                    </Button>
                  </div>
                </div>
              ) : (
                /* AI消息内容区域 - 统一使用space-y-2容器 */
                <div className="space-y-2 w-full">
                  {/* 错误提示卡片 */}
                  {!isUser && message.status === 'error' && (
                    <div className="w-full rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                      <div className="mb-1 text-[10px] font-bold tracking-wider text-destructive uppercase font-mono">
                        {message.errorCode || 'ERROR'}
                      </div>
                      <div className="text-sm text-destructive leading-relaxed">
                        {message.error || t("message.unknownError")}
                      </div>
                    </div>
                  )}

                  {/* MCP工具调用 - contentParts方式 */}
                  {!isUser && message.contentParts && message.contentParts.length > 0 && (
                    message.contentParts
                      .filter(part => part.type === 'tool_call')
                      .map((part, index) => (
                        <McpToolCallsDisplay
                          key={`mcp-${index}`}
                          toolCalls={[part.info as any]}
                        />
                      ))
                  )}
                  {/* MCP工具调用 - 旧版方式 */}
                  {!isUser && (!message.contentParts || message.contentParts.length === 0) && message.mcp_tool_calls && message.mcp_tool_calls.length > 0 && (
                    <McpToolCallsDisplay toolCalls={message.mcp_tool_calls} />
                  )}
                  {/* 联网搜索 */}
                  {!isUser && message.search_results && (
                    <SearchDisplay content={message.search_results} />
                  )}
                  {/* 检索结果 */}
                  {!isUser && message.retrieval_chunks && (
                    <RetrievalDisplay content={message.retrieval_chunks} />
                  )}
                  {/* 思考过程 */}
                  {!isUser && message.reasoning_content && (
                    <ReasoningDisplay content={message.reasoning_content} />
                  )}

                  {/* 渲染图像消息或 Markdown 内容 */}
                  {message.content && (
                    isPendingImageMessage ? (
                      // 显示Skeleton占位
                      (() => {
                        try {
                          const parsed = JSON.parse(message.content);
                          const count = parsed.count || 1;
                          const aspectRatio = parsed.aspectRatio || '1:1';
                          // 支持两种格式: "16:9" 或 "1024×1024"
                          const separator = aspectRatio.includes('×') ? '×' : ':';
                          const [width, height] = aspectRatio.split(separator).map(Number);
                          const aspectRatioValue = width / height || 1;

                          // 固定高度 400px，宽度根据宽高比计算
                          const fixedHeight = 400;
                          const calculatedWidth = fixedHeight * aspectRatioValue;

                          return (
                            <div className="flex gap-4">
                              {Array.from({ length: count }).map((_, index) => (
                                <Skeleton
                                  key={index}
                                  className="shrink-0 rounded-lg"
                                  style={{
                                    height: `${fixedHeight}px`,
                                    width: `${calculatedWidth}px`,
                                  }}
                                />
                              ))}
                            </div>
                          );
                        } catch {
                          return <Skeleton className="h-64 w-64 rounded-lg" />;
                        }
                      })()
                    ) : isInterleavedMessage ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(message.content);
                          return (
                            <InterleavedContent
                              contentParts={parsed.contentParts || []}
                              aspectRatio={parsed.aspectRatio || '1:1'}
                            />
                          );
                        } catch {
                          return null;
                        }
                      })()
                    ) : isImageMessage ? (
                      <ImageMessageDisplay content={message.content} />
                    ) : (
                      <div className="prose prose-zinc text-xs max-w-none w-full dark:prose-invert leading-5">
                        {/* 优先使用 content，如果为空则尝试使用 contentParts 中的文本 */}
                        {message.content ? (
                          // 优先使用 content 渲染
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                            rehypePlugins={[
                              rehypeRaw,
                              [
                                rehypeSanitize,
                                {
                                  ...defaultSchema,
                                  attributes: {
                                    ...defaultSchema.attributes,
                                    code: [
                                      ...(defaultSchema.attributes?.code || []),
                                      ["className", /^language-./],
                                    ],
                                    span: [
                                      ...(defaultSchema.attributes?.span || []),
                                      ["className", /^math-inline|katex/],
                                    ],
                                    div: [
                                      ...(defaultSchema.attributes?.div || []),
                                      ["className", /^math-display|katex/],
                                    ],
                                  },
                                },
                              ],
                              [rehypeKatex, { output: "html" }],
                            ]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : message.contentParts && message.contentParts.length > 0 ? (
                          // 兜底：从 contentParts 中提取文本内容
                          message.contentParts
                            .filter(part => part.type === 'text')
                            .map((part, index) => {
                              let textContent: string | null = null;
                              if (typeof part.content === 'string') {
                                textContent = part.content;
                              } else if (typeof (part as any).text === 'string') {
                                textContent = (part as any).text;
                              } else if (part.content && typeof part.content === 'object' && typeof (part.content as any).text === 'string') {
                                textContent = (part.content as any).text;
                              }
                              if (!textContent) return null;
                              return (
                                <ReactMarkdown
                                  key={`text-${index}`}
                                  remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                                  rehypePlugins={[
                                    rehypeRaw,
                                    [
                                      rehypeSanitize,
                                      {
                                        ...defaultSchema,
                                        attributes: {
                                          ...defaultSchema.attributes,
                                          code: [
                                            ...(defaultSchema.attributes?.code || []),
                                            ["className", /^language-./],
                                          ],
                                          span: [
                                            ...(defaultSchema.attributes?.span || []),
                                            ["className", /^math-inline|katex/],
                                          ],
                                          div: [
                                            ...(defaultSchema.attributes?.div || []),
                                            ["className", /^math-display|katex/],
                                          ],
                                        },
                                      },
                                    ],
                                    [rehypeKatex, { output: "html" }],
                                  ]}
                                  components={markdownComponents}
                                >
                                  {textContent}
                                </ReactMarkdown>
                              );
                            })
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* 错误提示卡片 */}
              {message.error && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2.5 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-300">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <div className="text-[13px] leading-relaxed break-words overflow-hidden">
                    <span className="font-bold mr-1">{t("message.error" as any)}:</span>
                    {message.error}
                  </div>
                </div>
              )}

              {/* AI 消息的操作栏和元数据 */}
              {!isUser && (
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center gap-1.5 md:gap-3 h-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-mono select-none" title={message.model}>
                      {message.provider && !message.model?.includes('/') ? `${message.provider}/${message.model}` : message.model}
                    </span>

                    {/* Token 使用详情 - 图像消息不显示 */}
                    {!isImageMessage && (message.total_tokens || message.input_tokens || message.output_tokens) && (
                      <TokenUsageTooltip
                        inputTokens={message.input_tokens || 0}
                        outputTokens={message.output_tokens || 0}
                        inputCacheTokens={message.input_cache_tokens || 0}
                        outputCacheTokens={message.output_cache_tokens || 0}
                      >
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono select-none cursor-help">
                          <Coins size={12} className="text-muted-foreground/70" />
                          {message.total_tokens || (message.input_tokens || 0) + (message.output_tokens || 0) + (message.input_cache_tokens || 0) + (message.output_cache_tokens || 0)}
                        </span>
                      </TokenUsageTooltip>
                    )}

                    <BranchSwitcher
                      message={message}
                      messageMap={messageMap}
                      rootMessageIds={rootMessageIds}
                      setCurrentLeafId={setCurrentLeafId}
                    />

                    <div className="flex items-center gap-0.5 md:gap-1">
                      {/* 非图像消息显示复制按钮 */}
                      {!isImageMessage && (
                        <CopyButton content={message.content || ""} />
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => message.id && onRegenerate(message.id)}
                            className="size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                          >
                            <RotateCw size={16} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>{t("message.regenerate")}</p>
                        </TooltipContent>
                      </Tooltip>
                      {onFork && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => message.id && onFork(message.id)}
                              className="size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            >
                              <GitBranch size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{t("message.fork")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {onSpeak && !isImageMessage && message.content && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onSpeak(message.content || "")}
                              className="size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            >
                              <Volume2 size={16} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>{t("message.speak")}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 用户消息的操作栏 */}
            {isUser && !isEditing && (
              <div className="flex items-center gap-2 mt-1 px-1">
                <div className="flex items-center">
                  <BranchSwitcher
                    message={message}
                    messageMap={messageMap}
                    rootMessageIds={rootMessageIds}
                    setCurrentLeafId={setCurrentLeafId}
                  />
                </div>
                <div className="flex items-center gap-0.5 md:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-wrap">
                  <CopyButton content={message.content} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleEditStart}
                        className="size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <Pencil size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t("message.edit")}</p>
                    </TooltipContent>
                  </Tooltip>
                  {onSpeak && message.content && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onSpeak(message.content || "")}
                          className="size-8 p-1.5 rounded-sm text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          <Volume2 size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{t("message.speak")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧占位，保持视觉对称 - 移动端隐藏 */}
        <div className="shrink-0 w-0 md:w-8 mt-1.5 hidden md:block" />
      </div>
    </div>
  );
});

MessageRow.displayName = "MessageRow";
