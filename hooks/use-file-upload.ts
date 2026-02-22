"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";

export interface Attachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "completed" | "error";
  progress?: number;
  url?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 20;

export function useFileUpload(projectId?: string) {
  const { t } = useI18n();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = (attachmentId: string, fileToUpload: File) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", fileToUpload);
    if (projectId) {
      formData.append("projectId", projectId);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setAttachments((prev) =>
          prev.map((a) => (a.id === attachmentId ? { ...a, progress } : a))
        );
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachmentId
                ? {
                    ...a,
                    status: "completed",
                    progress: 100,
                    url: response.url,
                    id: response.id || a.id,
                  }
                : a
            )
          );
        } catch {
          // JSON解析失败，标记为错误
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachmentId ? { ...a, status: "error" } : a
            )
          );
        }
      } else {
        // HTTP状态码不是200，标记为错误
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachmentId ? { ...a, status: "error" } : a
          )
        );
      }
    });

    xhr.addEventListener("error", () => {
      // 网络错误，标记为错误
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachmentId ? { ...a, status: "error" } : a
        )
      );
    });

    xhr.addEventListener("abort", () => {
      // 请求被中止，标记为错误
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachmentId ? { ...a, status: "error" } : a
        )
      );
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  };

  const uploadFiles = (files: FileList | File[]) => {
    const currentFilesCount = attachments.length;
    const newFilesArray = Array.from(files);

    if (currentFilesCount + newFilesArray.length > MAX_FILES) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return {
        success: false,
        message: t("errors.maxFiles", { count: MAX_FILES.toString() }),
      };
    }

    // 分别处理每个文件，大小超过限制的文件标记为错误但不阻止其他文件上传
    const newAttachments: Attachment[] = [];
    const errors: string[] = [];
    
    for (const file of newFilesArray) {
      const id = Math.random().toString(36).substring(7);
      
      if (file.size > MAX_FILE_SIZE) {
        // 文件太大，立即创建错误状态的附件
        newAttachments.push({
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
          progress: 0,
        });
        errors.push(`${file.name}: ${t("errors.fileTooLarge")}`);
      } else {
        // 正常文件，开始上传（每个文件独立上传，互不影响）
        uploadFile(id, file);
        newAttachments.push({
          id,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "uploading",
          progress: 0,
        });
      }
    }

    if (newAttachments.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return { success: false, message: "" };
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // 如果有错误，返回错误信息，但不阻止其他文件的上传
    if (errors.length > 0) {
      return {
        success: true,
        message: errors.join('; '),
      };
    }
    
    return { success: true, message: "" };
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAttachments = () => {
    setAttachments([]);
  };

  // 从文件ID创建附件（用于拖拽已上传的文件）
  const addFileById = (fileId: string, fileName: string, fileUrl: string, fileType: string, fileSize: number = 0) => {
    // 创建一个虚拟File对象用于Attachment接口
    const virtualFile = new File([], fileName, { type: fileType });
    const attachment: Attachment = {
      id: fileId,
      file: virtualFile,
      name: fileName,
      size: fileSize,
      type: fileType,
      status: "completed",
      progress: 100,
      url: fileUrl,
    };
    setAttachments((prev) => [...prev, attachment]);
  };

  return {
    attachments,
    fileInputRef,
    uploadFiles,
    removeAttachment,
    clearAttachments,
    addFileById,
  };
}

