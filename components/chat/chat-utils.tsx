import React from "react";
import { File, FileText, FileCode, FileArchive, FileImage, FileAudio, FileVideo } from "lucide-react";

/**
 * 根据文件 MIME 类型获取对应的图标组件
 * @param type 文件 MIME 类型
 * @returns Lucide 图标组件
 */
export const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (type.startsWith('video/')) return <FileVideo className="h-5 w-5 text-purple-500" />;
  if (type.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-pink-500" />;
  if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return <FileArchive className="h-5 w-5 text-orange-500" />;
  if (type.includes('javascript') || type.includes('typescript') || type.includes('html') || type.includes('css') || type.includes('json')) return <FileCode className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
};
