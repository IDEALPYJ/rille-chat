import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Virtuoso, VirtuosoHandle, FollowOutput } from "react-virtuoso";
import { Message } from "@/lib/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatScrollMap } from "./chat-scroll-map";
import { MessageRow } from "./message-row";

interface ChatListProps {
  messages: Message[]; // 当前分支要显示的消息
  allMessages: Message[]; // 所有节点，用于上下文和分支查找
  currentLeafId: string | null;
  setCurrentLeafId: (id: string) => void;
  isLoading: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectArtifact: (artifact: { code: string; language: string }) => void;
  onRegenerate: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onFork?: (messageId: string) => void;
  onSpeak?: (text: string) => void;
  bottomPadding?: number;
}

/**
 * 聊天列表组件，使用虚拟列表（react-virtuoso）高效渲染大量对话。
 * 负责处理滚动逻辑、自动吸底、编辑状态管理以及分支对话的上下文映射。
 */
export function ChatList({
  messages,
  allMessages,
  setCurrentLeafId,
  isLoading,
  hasMore,
  onLoadMore,
  onSelectArtifact,
  onRegenerate,
  onEdit,
  onFork,
  onSpeak,
  bottomPadding = 120,
}: ChatListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  
  // 追踪是否在底部，用于控制自动滚动
  const isAtBottomRef = useRef(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // 追踪用户是否正在主动滚动（如果主动往上滚，则停止跟随新输出）
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 滚动到特定消息项
   */
  const handleScrollToItem = (index: number) => {
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "start",
      behavior: "smooth",
    });
  };

  /**
   * 滚动到底部
   */
  const handleScrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length]);
  
  // 维护一个消息 Map 以便快速查找
  const messageMap = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of allMessages) {
      if (m.id) map.set(m.id, m);
    }
    return map;
  }, [allMessages]);

  // 提取根消息 ID 列表
  const rootMessageIds = useMemo(() => {
    return allMessages.filter(m => !m.parentId && m.id).map(m => m.id as string);
  }, [allMessages]);

  // 处理底部状态变化
  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    isAtBottomRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, []);

  /**
   * 智能跟随输出逻辑：实现新内容出现时平滑滚动
   */
  const handleFollowOutput = useCallback((isAtBottom: boolean): FollowOutput => {
    // 如果用户正在主动向上滚动，不跟随
    if (userScrollingRef.current) {
      return false;
    }

    if (isAtBottom && isLoading) {
      return 'smooth';
    }
    return false;
  }, [isLoading]);

  // 使用 ResizeObserver 监听最后一条消息的高度变化
  const lastItemRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isLoading || !lastItemRef.current) return;

    const observer = new ResizeObserver(() => {
      // 只有在底部时，内容高度变化才触发滚动
      if (isAtBottomRef.current && !userScrollingRef.current) {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: "end",
          behavior: "auto", // 高度微调使用 auto 更及时
        });
      }
    });

    observer.observe(lastItemRef.current);
    return () => observer.disconnect();
  }, [isLoading, messages.length]);

  /**
   * 当用户发送新消息时，强制平滑滚动到底部一次
   */
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user") {
        userScrollingRef.current = false;
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: "end",
          behavior: "smooth",
        });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  /**
   * 检测用户主动滚动行为
   */
  const lastScrollTopRef = useRef(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    const target = e.currentTarget;
    const currentScrollTop = target.scrollTop;
    
    // 如果正在加载且用户向上滚动，标记为用户主动滚动并停止自动跟随
    if (isLoading && currentScrollTop < lastScrollTopRef.current - 2) {
      if (!userScrollingRef.current) {
        userScrollingRef.current = true;
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
    
    // 如果用户滑到了最底部，恢复自动跟随
    const isAtBottomNow = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    if (isAtBottomNow && userScrollingRef.current) {
      userScrollingRef.current = false;
    }
    
    lastScrollTopRef.current = currentScrollTop;
  }, [isLoading]);

  // 当加载结束时，重置用户滚动状态
  useEffect(() => {
    if (!isLoading) {
      userScrollingRef.current = false;
    }
  }, [isLoading]);

  // 编辑状态管理
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleEditStart = useCallback((id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  const handleEditSave = useCallback((id: string, content: string) => {
    const message = messages.find(m => m.id === id);
    if (content.trim() && content !== message?.content) {
      onEdit(id, content);
    }
    setEditingMessageId(null);
    setEditContent("");
  }, [messages, onEdit]);

  /**
   * 虚拟列表项渲染函数
   */
  const itemContent = useCallback((index: number, message: Message) => {
    const isEditing = editingMessageId === message.id;
    const isLast = index === messages.length - 1;
    return (
      <div ref={isLast ? lastItemRef : null}>
      <MessageRow
        message={message}
        _onEdit={onEdit}
        onRegenerate={onRegenerate}
        onFork={onFork}
        _onSelectArtifact={onSelectArtifact}
        messageMap={messageMap}
        rootMessageIds={rootMessageIds}
        setCurrentLeafId={setCurrentLeafId}
        isEditing={isEditing}
        editContent={isEditing ? editContent : ""}
        onEditStart={handleEditStart}
        onEditCancel={handleEditCancel}
        onEditSave={handleEditSave}
        onEditContentChange={setEditContent}
        isLast={isLast}
        isLoading={isLoading}
        onSpeak={onSpeak}
      />
    </div>
    );
  }, [onEdit, onRegenerate, onFork, onSelectArtifact, messageMap, rootMessageIds, setCurrentLeafId, editingMessageId, editContent, handleEditStart, handleEditCancel, handleEditSave, isLoading, messages.length, onSpeak]);

  const components = useMemo(() => ({
    Header: () => (
      <div className="flex flex-col items-center">
        {hasMore && (
          <div className="py-4">
             <div className="h-4 w-4 border-2 border-border border-t-foreground/60 rounded-full animate-spin" />
          </div>
        )}
        <div className="h-4" />
      </div>
    ), // 顶部留白及加载指示器
    Footer: () => <div style={{ height: `${bottomPadding + 40}px` }} />, // 底部留白，防止输入框遮挡
  }), [bottomPadding, hasMore]);

  return (
    <TooltipProvider delayDuration={1000}>
      <div className="h-full w-full relative">
        <Virtuoso
          className="no-scrollbar"
          ref={virtuosoRef}
          data={messages}
          itemContent={itemContent}
          initialTopMostItemIndex={messages.length - 1} // 初始定位到底部
          components={components}
          onScroll={handleScroll}
          startReached={onLoadMore} // 滚动到顶部时触发
          followOutput={handleFollowOutput as any}
          atBottomStateChange={handleAtBottomStateChange}
          atBottomThreshold={50}
          overscan={500}
          increaseViewportBy={500}
        />
        <ChatScrollMap
          messages={messages}
          onItemClick={handleScrollToItem}
          isAtBottom={isAtBottom}
          onScrollToBottom={handleScrollToBottom}
        />
      </div>
    </TooltipProvider>
  );
}
