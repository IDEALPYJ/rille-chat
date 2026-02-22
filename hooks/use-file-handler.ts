"use client";

import { useRef, useEffect } from "react";
import { Message } from "@/lib/types";
import { Attachment as APIAttachment } from "@/lib/types";
import { Attachment as UIAttachment } from "@/hooks/use-file-upload";
import { UI } from "@/lib/constants";

/**
 * 管理文件附件的 Object URL 创建、清理和内存管理
 * 防止内存泄漏
 */
export function useFileHandler(
  messages: Message[],
  allMessages: Message[]
) {
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // 定期清理未使用的 Object URL
  useEffect(() => {
    const cleanup = () => {
      if (objectUrlsRef.current.size === 0) return;

      const activeUrls = new Set<string>();
      
      // 收集当前消息中正在使用的 blob URL
      // 注意：这里我们检查 messages 而不是 allMessages，因为只有当前显示的才需要保留预览
      // 如果切换分支，之前的预览重新加载时可能会需要重新生成 URL (如果逻辑是那样的话)，
      // 但通常 attachment.url 会被替换为服务器 URL。
      // 如果 attachment.url 仍然是 blob: URL，说明尚未替换或就是本地预览。
      // 为了安全起见，我们检查 allMessages，以免切换分支时丢失图片
      const messagesToCheck = allMessages.length > 0 ? allMessages : messages;
      
      messagesToCheck.forEach(msg => {
        msg.attachments?.forEach((att) => {
          if (att.url?.startsWith('blob:')) {
            activeUrls.add(att.url);
          }
        });
      });
      
      const urlsToRemove: string[] = [];
      objectUrlsRef.current.forEach(url => {
        if (!activeUrls.has(url)) {
          URL.revokeObjectURL(url);
          urlsToRemove.push(url);
        }
      });
      
      if (urlsToRemove.length > 0) {
        urlsToRemove.forEach(url => objectUrlsRef.current.delete(url));
      }
    };

    // 定期清理未使用的 Object URL
    const timer = setInterval(cleanup, UI.OBJECT_URL_CLEANUP_INTERVAL);
    
    // 组件卸载时清理所有
    return () => {
      clearInterval(timer);
      const urls = objectUrlsRef.current;
      urls.forEach(url => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, [allMessages, messages]);

  /**
   * 处理附件 URL，创建 Object URL 如果需要
   */
  const processAttachments = (attachments?: UIAttachment[]): APIAttachment[] | undefined => {
    if (!attachments) return undefined;

    return attachments.map(a => {
      let url = a.url;
      if (!url && a.file) {
        url = URL.createObjectURL(a.file);
        objectUrlsRef.current.add(url);
      }
      return {
        id: a.id,
        name: a.name,
        url: url || "",
        type: a.type,
        size: a.size
      };
    });
  };

  return {
    processAttachments,
  };
}

