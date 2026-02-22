import { Message } from "./types";
import { logger } from "./logger";

/**
 * 从叶子节点向上追踪，获取完整的消息分支
 */
export function getMessageBranch(allMessages: Message[], leafId: string | null): Message[] {
  if (!leafId) return [];

  const messageMap = new Map<string, Message>();
  for (const m of allMessages) {
    if (m.id) {
      messageMap.set(m.id, m);
    }
  }
  const branch: Message[] = [];
  let currentId: string | null | undefined = leafId;

  while (currentId) {
    const message = messageMap.get(currentId);
    if (message) {
      branch.unshift(message);
      currentId = message.parentId;
    } else {
      break;
    }
  }
  return branch;
}

/**
 * 在所有消息中寻找最新的叶子节点
 */
export function findLatestLeaf(messages: Message[]): string | null {
  if (messages.length === 0) return null;

  let latestLeaf: Message | null = null;
  for (const msg of messages) {
    // 叶子节点是没有子节点的节点
    if (!msg.childrenIds || msg.childrenIds.length === 0) {
      if (
        !latestLeaf || 
        !latestLeaf.createdAt || 
        (msg.createdAt && new Date(msg.createdAt) > new Date(latestLeaf.createdAt))
      ) {
        latestLeaf = msg;
      }
    }
  }

  return latestLeaf ? (latestLeaf.id ?? null) : (messages[messages.length - 1].id ?? null);
}

/**
 * 更新消息树，添加新消息并更新其父节点的子节点列表
 */
export function addMessageToTree(
  allMessages: Message[],
  newMessage: Message
): Message[] {
  // 检查消息ID是否已存在，避免重复添加
  if (newMessage.id && allMessages.some(m => m.id === newMessage.id)) {
    logger.warn("Message already exists, skipping add", { messageId: newMessage.id });
    return allMessages;
  }

  if (!newMessage.parentId) {
    return [...allMessages, newMessage];
  }

  const parentIndex = allMessages.findIndex((m) => m.id === newMessage.parentId);
  
  if (parentIndex === -1) {
    return [...allMessages, newMessage];
  }

  const updatedMessages = [...allMessages];
  const parent = updatedMessages[parentIndex];
  
  // 检查子节点ID是否已存在，避免重复添加
  if (newMessage.id) {
    const existingChildrenIds = parent.childrenIds || [];
    if (!existingChildrenIds.includes(newMessage.id)) {
      updatedMessages[parentIndex] = {
        ...parent,
        childrenIds: [...existingChildrenIds, newMessage.id],
      };
    }
  }
  
  updatedMessages.push(newMessage);
  return updatedMessages;
}

/**
 * 更新树中的特定消息内容
 */
export function updateMessageInTree(
  allMessages: Message[],
  messageId: string,
  updates: Partial<Message>
): Message[] {
  return allMessages.map((m) => (m.id === messageId ? { ...m, ...updates } : m));
}

/**
 * 安全地查找给定节点的叶子节点（最深的子节点）
 * 避免环路和无限递归，限制最大深度
 * @param messageMap 消息ID到消息的映射
 * @param startId 起始节点ID
 * @param maxDepth 最大深度限制，默认1000
 * @returns 叶子节点ID，如果检测到环路或超过深度限制，则返回当前节点
 */
export function findLeafNode(
  messageMap: Map<string, Message>,
  startId: string,
  maxDepth: number = 1000
): string {
  let currentId = startId;
  const visited = new Set<string>();
  let depth = 0;

  while (depth < maxDepth) {
    if (visited.has(currentId)) {
      // 检测到环路，返回当前节点作为安全结果
      logger.warn("Detected cycle while finding leaf node", { currentId, visited: Array.from(visited) });
      return currentId;
    }
    visited.add(currentId);

    const node = messageMap.get(currentId);
    if (!node) {
      // 节点不存在，返回当前ID
      return currentId;
    }

    if (!node.childrenIds || node.childrenIds.length === 0) {
      // 叶子节点
      return currentId;
    }

    // 默认选择最新的子节点（最后一个）
    const lastChildId = node.childrenIds[node.childrenIds.length - 1];
    currentId = lastChildId;
    depth++;
  }

  // 超过最大深度，返回当前节点
  logger.warn("Exceeded max depth while finding leaf node", { currentId, maxDepth });
  return currentId;
}
