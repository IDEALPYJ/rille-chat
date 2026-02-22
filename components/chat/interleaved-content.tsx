"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { ContentPart } from "@/lib/types";

interface InterleavedContentProps {
  contentParts: ContentPart[];
  aspectRatio?: string;
  className?: string;
}

// 固定高度
const FIXED_HEIGHT = 400;

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

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setActualSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
    setIsLoaded(true);
  }, []);

  const aspectRatio = actualSize 
    ? actualSize.width / actualSize.height 
    : fallbackAspectRatio;
  const containerWidth = FIXED_HEIGHT * aspectRatio;

  return (
    <div
      className="relative shrink-0 inline-block rounded-lg cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
      onClick={onClick}
      style={{
        height: `${FIXED_HEIGHT}px`,
        width: `${containerWidth}px`,
        backgroundColor: '#f0f0f0',
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

// 图片画廊组件
interface ImageGalleryProps {
  images: string[];
  fallbackAspectRatio: number;
}

function ImageGallery({ images, fallbackAspectRatio }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

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
        className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide"
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
          {images.map((url, index) => (
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

// 单张图片组件
interface SingleImageProps {
  url: string;
  fallbackAspectRatio: number;
}

function SingleImage({ url, fallbackAspectRatio }: SingleImageProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <DynamicSizeImage
        url={url}
        alt="生成的图片"
        fallbackAspectRatio={fallbackAspectRatio}
        onClick={() => setSelectedImage(url)}
        onDownload={(e) => {
          e.stopPropagation();
          const link = document.createElement('a');
          link.href = url;
          link.download = 'image.jpg';
          link.click();
        }}
      />

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

export function InterleavedContent({ contentParts, aspectRatio = '1:1', className }: InterleavedContentProps) {
  // 解析宽高比
  const [fallbackWidth, fallbackHeight] = aspectRatio.split(':').map(Number);
  const fallbackAspectRatio = (fallbackWidth / fallbackHeight) || 1;

  // 分离文本和图片
  const textParts = contentParts.filter(part => part.type === 'text');
  const imageParts = contentParts.filter(part => part.type === 'image');
  const images = imageParts.map(part => part.image!).filter(Boolean);

  // 合并所有文本
  const fullText = textParts.map(part => part.text).join('');

  return (
    <div className={cn("flex flex-col gap-4 w-full", className)}>
      {/* 文本内容 - 始终在上 */}
      {fullText && (
        <div className="prose prose-zinc text-sm max-w-none w-full dark:prose-invert leading-6 space-y-2">
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
          >
            {fullText}
          </ReactMarkdown>
        </div>
      )}

      {/* 图片内容 - 始终在下 */}
      {images.length > 0 && (
        <div className="w-full">
          {images.length === 1 ? (
            <SingleImage url={images[0]} fallbackAspectRatio={fallbackAspectRatio} />
          ) : (
            <ImageGallery images={images} fallbackAspectRatio={fallbackAspectRatio} />
          )}
        </div>
      )}
    </div>
  );
}
