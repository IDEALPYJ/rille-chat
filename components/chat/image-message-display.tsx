"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface ImageMessageDisplayProps {
  content: string;
  className?: string;
}

// 固定高度 - 桌面端400px，手机端200px（一半）
const FIXED_HEIGHT = 400;
const MOBILE_FIXED_HEIGHT = 200;

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setActualSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setIsLoaded(true);
  }, []);

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
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
      )}
      <img
        src={url}
        alt={alt}
        className={cn(
          "w-full h-full object-cover rounded-lg block transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
        onLoad={handleImageLoad}
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
        return parsed;
      }
    } catch {
      // 不是 JSON 格式，返回 null
    }
    return null;
  }, [content]);

  if (!imageData) {
    return null;
  }

  const images = imageData.images || [];
  const aspectRatio = imageData.aspectRatio || '1:1';
  const isMultiple = images.length > 1;

  // 解析回退宽高比
  const [fallbackWidth, fallbackHeight] = aspectRatio.split(':').map(Number);
  const fallbackAspectRatio = (fallbackWidth / fallbackHeight) || 1;

  // 多张图片时使用gallery布局
  if (isMultiple) {
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
            {images.map((url: string, index: number) => (
              <DynamicSizeImage
                key={index}
                url={url}
                alt={`生成的图片 ${index + 1}`}
                fallbackAspectRatio={fallbackAspectRatio}
                onClick={() => setSelectedImage(url)}
                onDownload={(e) => {
                  e.stopPropagation();
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `image-${index + 1}.jpg`;
                  link.click();
                }}
              />
            ))}
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

  // 单张图片布局
  return (
    <>
      <div className={cn("flex flex-col gap-4 w-full", className)}>
        {images.map((url: string, index: number) => (
          <DynamicSizeImage
            key={index}
            url={url}
            alt={`生成的图片 ${index + 1}`}
            fallbackAspectRatio={fallbackAspectRatio}
            onClick={() => setSelectedImage(url)}
            onDownload={(e) => {
              e.stopPropagation();
              const link = document.createElement('a');
              link.href = url;
              link.download = `image-${index + 1}.jpg`;
              link.click();
            }}
          />
        ))}
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
