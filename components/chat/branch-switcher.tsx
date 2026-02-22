import React, { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Message } from "@/lib/types";
import { findLeafNode } from "@/lib/tree-utils";

interface BranchSwitcherProps {
  message: Message;
  messageMap: Map<string, Message>;
  rootMessageIds: string[];
  setCurrentLeafId: (id: string) => void;
}

/**
 * 分支切换组件，允许用户在同一层级的不同对话分支之间切换
 */
export const BranchSwitcher = memo(({
  message,
  messageMap,
  rootMessageIds,
  setCurrentLeafId
}: BranchSwitcherProps) => {
  let siblings: string[] = [];
  
  // 查找当前消息的所有兄弟节点
  if (message.parentId) {
    const parent = messageMap.get(message.parentId);
    if (parent && parent.childrenIds) {
      siblings = parent.childrenIds;
    }
  } else {
    // 如果没有父节点，则它是根节点之一
    siblings = rootMessageIds;
  }

  // 如果没有兄弟节点，不需要显示切换器
  if (siblings.length <= 1) {
    return null;
  }

  const currentIndex = message.id ? siblings.indexOf(message.id) : -1;

  /**
   * 处理分支切换逻辑
   * @param direction 切换方向：上一个或下一个
   */
  const handleSwitch = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < siblings.length) {
      const targetId = siblings[newIndex];
      // 安全地查找叶子节点，并切换当前显示的对话路径
      const leafId = findLeafNode(messageMap, targetId);
      setCurrentLeafId(leafId);
    }
  };

  return (
    <div className="flex items-center text-xs text-muted-foregroundgap-2">
      <button
        onClick={() => handleSwitch('prev')}
        disabled={currentIndex === 0}
        className="disabled:opacity-30 hover:text-foregroundtransition-colors"
        aria-label="Previous branch"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="select-none">{`${currentIndex + 1} / ${siblings.length}`}</span>
      <button
        onClick={() => handleSwitch('next')}
        disabled={currentIndex === siblings.length - 1}
        className="disabled:opacity-30 hover:text-foregroundtransition-colors"
        aria-label="Next branch"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
});

BranchSwitcher.displayName = "BranchSwitcher";
