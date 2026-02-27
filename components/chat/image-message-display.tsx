"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageMessageDisplayProps {
  content: string;
  className?: string;
}

// 固定高度 - 桌面端400px，手机端200px（一半）
const FIXED_HEIGHT = 400;
const MOBILE_FIXED_HEIGHT = 200;

// 图片项类型
interface ImageItem {
  url: string;
  status: 'completed' | 'pending' | 'error';
  error?: string;
}

// 动态尺寸图片组件
interface DynamicSizeImageProps {
  url: string;
  alt: string;
  fallbackAspectRatio: number;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
}

function DynamicSizeImage({ url, alt, fallbackAspectRatio, onClick, onDownload }: DynamicSizeImageProps) {
  const [actualSize, setActualSize] = useState<{ width: number; height: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 重置状态当 URL 改变时
  useEffect(() => {
    setIsLoaded(false);
    setIsError(false);
    setActualSize(null);
  }, [url]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setActualSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setIsLoaded(true);
    setIsError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoaded(true); // 停止显示骨架屏
    setIsError(true);
    console.error('Failed to load image:', url);
  }, [url]);

  // 计算容器尺寸：固定高度，宽度根据实际图片比例或回退比例
  // 手机端使用一半高度
  const currentHeight = isMobile ? MOBILE_FIXED_HEIGHT : FIXED_HEIGHT;
  const aspectRatio = actualSize 
    ? actualSize.width / actualSize.height 
    : fallbackAspectRatio;
  const containerWidth = currentHeight * aspectRatio;

  return (
    <div
      className="relative shrink-0 inline-block rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
      onClick={onClick}
      style={{
        height: `${currentHeight}px`,
        width: `${containerWidth}px`,
        backgroundColor: '#f0f0f0', // 加载前的占位背景
      }}
      onTouchStart={(e) => {
        const button = e.currentTarget.querySelector('.download-button') as HTMLElement;
        if (button) button.style.opacity = '1';
      }}
      onTouchEnd={(e) => {
        setTimeout(() => {
          const button = e.currentTarget.querySelector('.download-button') as HTMLElement;
          if (button) button.style.opacity = '0';
        }, 2000);
      }}
      onMouseEnter={(e) => {
        const button = e.currentTarget.querySelector('.download-button') as HTMLElement;
        if (button) button.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        const button = e.currentTarget.querySelector('.download-button') as HTMLElement;
        if (button) button.style.opacity = '0';
      }}
    >
      {/* 骨架屏，图片加载完成前显示 */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
      )}
      
      {/* 错误提示 */}
      {isError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-8 w-8 text-gray-400" />
          <span className="text-xs text-gray-500">加载失败</span>
        </div>
      )}
      
      <img
        src={url}
        alt={alt}
        className={cn(
          "w-full h-full object-cover rounded-lg block transition-opacity duration-300",
          isLoaded && !isError ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      <button
        onClick={onDownload}
        className="download-button absolute top-2 left-2 p-2 rounded-md bg-black/50 hover:bg-black/70 text-white opacity-0 transition-opacity pointer-events-auto"
        style={{ opacity: 0 }}
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

// Skeleton 占位组件
interface SkeletonPlaceholderProps {
  fallbackAspectRatio: number;
}

function SkeletonPlaceholder({ fallbackAspectRatio }: SkeletonPlaceholderProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentHeight = isMobile ? MOBILE_FIXED_HEIGHT : FIXED_HEIGHT;
  const containerWidth = currentHeight * fallbackAspectRatio;

  return (
    <Skeleton
      className="shrink-0 rounded-lg"
      style={{
        height: `${currentHeight}px`,
        width: `${containerWidth}px`,
      }}
    />
  );
}

// 错误占位组件
interface ErrorPlaceholderProps {
  error?: string;
  fallbackAspectRatio: number;
}

function ErrorPlaceholder({ error, fallbackAspectRatio }: ErrorPlaceholderProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentHeight = isMobile ? MOBILE_FIXED_HEIGHT : FIXED_HEIGHT;
  const containerWidth = currentHeight * fallbackAspectRatio;

  return (
    <div
      className="shrink-0 rounded-lg border border-destructive/20 bg-destructive/5 flex flex-col items-center justify-center gap-2"
      style={{
        height: `${currentHeight}px`,
        width: `${containerWidth}px`,
      }}
    >
      <AlertCircle className="h-8 w-8 text-destructive/60" />
      <span className="text-xs text-destructive/80 text-center px-4">
        {error || "生成失败"}
      </span>
    </div>
  );
}

export function ImageMessageDisplay({ content, className }: ImageMessageDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const imageData = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'image_generation' && parsed.images && Array.isArray(parsed.images)) {
        // 兼容旧格式：如果 images 是字符串数组，转换为对象数组
        const normalizedImages = parsed.images.map((img: any) => {
          if (typeof img === 'string') {
            return { url: img, status: 'completed' as const };
          }
          return img;
        });
        return {
          ...parsed,
          images: normalizedImages,
        };
      }
    } catch {
      // 不是 JSON 格式，返回 null
    }
    return null;
  }, [content]);

  if (!imageData) {
    return null;
  }

  const images: ImageItem[] = imageData.images || [];
  const aspectRatio = imageData.aspectRatio || '1:1';

  // 解析回退宽高比
  const [fallbackWidth, fallbackHeight] = aspectRatio.split(':').map(Number);
  const fallbackAspectRatio = (fallbackWidth / fallbackHeight) || 1;

  // 拖拽和滚动处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!galleryRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - galleryRef.current.offsetLeft);
    setScrollLeft(galleryRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !galleryRef.current) return;
    e.preventDefault();
    const x = e.pageX - galleryRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    galleryRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!galleryRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - galleryRef.current.offsetLeft);
    setScrollLeft(galleryRef.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !galleryRef.current) return;
    e.preventDefault();
    const x = e.touches[0].pageX - galleryRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    galleryRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!galleryRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    galleryRef.current.scrollLeft += e.deltaY;
  };

  // 渲染单个图片项
  const renderImageItem = (item: ImageItem, index: number) => {
    if (item.status === 'pending') {
      return (
        <SkeletonPlaceholder
          key={`pending-${index}`}
          fallbackAspectRatio={fallbackAspectRatio}
        />
      );
    }

    if (item.status === 'error') {
      return (
        <ErrorPlaceholder
          key={`error-${index}`}
          error={item.error}
          fallbackAspectRatio={fallbackAspectRatio}
        />
      );
    }

    return (
      <DynamicSizeImage
        key={`completed-${index}`}
        url={item.url}
        alt={`生成的图片 ${index + 1}`}
        fallbackAspectRatio={fallbackAspectRatio}
        onClick={() => setSelectedImage(item.url)}
        onDownload={(e) => {
          e.stopPropagation();
          const link = document.createElement('a');
          link.href = item.url;
          link.download = `image-${index + 1}.jpg`;
          link.click();
        }}
      />
    );
  };

  return (
    <>
      <div
        ref={galleryRef}
        className={cn(
          "w-full overflow-x-auto overflow-y-hidden",
          "scrollbar-hide",
          className
        )}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x',
        }}
      >
        <div className="flex gap-4" style={{ width: 'max-content' }}>
          {images.map((item, index) => renderImageItem(item, index))}
        </div>
      </div>

      {/* 图片放大Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent 
          className="max-w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none [&>button]:hidden !shadow-none cursor-pointer"
          overlayClassName="bg-background/80 backdrop-blur-sm cursor-pointer"
          onOverlayClick={() => setSelectedImage(null)}
          onClick={() => setSelectedImage(null)}
        >
          <DialogTitle className="sr-only">查看图片</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="放大的图片"
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
