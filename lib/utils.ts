import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const truncateFileName = (name: string, limit: number = 20) => {
  if (name.length <= limit) return name;
  const extension = name.includes('.') ? name.split('.').pop() : '';
  const nameWithoutExtension = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
  
  if (extension) {
    return nameWithoutExtension.substring(0, limit - extension.length - 3) + '...' + extension;
  }
  return name.substring(0, limit) + '...';
};
