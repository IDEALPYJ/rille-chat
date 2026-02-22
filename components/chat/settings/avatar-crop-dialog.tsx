"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AvatarCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageSrc: string
  onCrop: (croppedImageBlob: Blob) => void
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCrop
}: AvatarCropDialogProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [cropArea, setCropArea] = React.useState({ x: 0, y: 0, size: 200 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageSize, setImageSize] = React.useState({ width: 0, height: 0 })

  // 加载图片
  React.useEffect(() => {
    if (!imageSrc) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      setImageLoaded(true)
      
      // 计算初始裁剪区域（居中，取较小的边）
      const minSize = Math.min(img.width, img.height)
      const initialSize = Math.min(minSize, 400) // 最大400px
      const initialX = (img.width - initialSize) / 2
      const initialY = (img.height - initialSize) / 2
      
      setCropArea({
        x: initialX,
        y: initialY,
        size: initialSize
      })
    }
    img.src = imageSrc
    imageRef.current = img
  }, [imageSrc])

  // 绘制裁剪预览
  React.useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !imageLoaded) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // 设置canvas尺寸
    const displaySize = 400
    canvas.width = displaySize
    canvas.height = displaySize

    // 计算缩放比例
    const scale = displaySize / Math.max(imageSize.width, imageSize.height)
    const scaledWidth = imageSize.width * scale
    const scaledHeight = imageSize.height * scale
    const offsetX = (displaySize - scaledWidth) / 2
    const offsetY = (displaySize - scaledHeight) / 2

    // 绘制图片
    ctx.drawImage(
      imageRef.current,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight
    )

    // 绘制裁剪框
    const cropX = offsetX + cropArea.x * scale
    const cropY = offsetY + cropArea.y * scale
    const cropSize = cropArea.size * scale

    // 绘制遮罩
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, displaySize, displaySize)
    
    // 清除裁剪区域
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillRect(cropX, cropY, cropSize, cropSize)
    
    // 绘制裁剪框边框
    ctx.globalCompositeOperation = "source-over"
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropSize, cropSize)

    // 绘制四个角的控制点
    const cornerSize = 10
    ctx.fillStyle = "#fff"
    // 左上
    ctx.fillRect(cropX - cornerSize / 2, cropY - cornerSize / 2, cornerSize, cornerSize)
    // 右上
    ctx.fillRect(cropX + cropSize - cornerSize / 2, cropY - cornerSize / 2, cornerSize, cornerSize)
    // 左下
    ctx.fillRect(cropX - cornerSize / 2, cropY + cropSize - cornerSize / 2, cornerSize, cornerSize)
    // 右下
    ctx.fillRect(cropX + cropSize - cornerSize / 2, cropY + cropSize - cornerSize / 2, cornerSize, cornerSize)
  }, [imageSrc, imageLoaded, cropArea, imageSize])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const displaySize = 400
    const scale = displaySize / Math.max(imageSize.width, imageSize.height)
    const scaledWidth = imageSize.width * scale
    const scaledHeight = imageSize.height * scale
    const offsetX = (displaySize - scaledWidth) / 2
    const offsetY = (displaySize - scaledHeight) / 2
    
    const cropX = offsetX + cropArea.x * scale
    const cropY = offsetY + cropArea.y * scale
    const cropSize = cropArea.size * scale
    
    // 检查是否在裁剪框内
    if (x >= cropX && x <= cropX + cropSize && y >= cropY && y <= cropY + cropSize) {
      setIsDragging(true)
      setDragStart({
        x: x - cropX,
        y: y - cropY
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const displaySize = 400
    const scale = displaySize / Math.max(imageSize.width, imageSize.height)
    const scaledWidth = imageSize.width * scale
    const scaledHeight = imageSize.height * scale
    const offsetX = (displaySize - scaledWidth) / 2
    const offsetY = (displaySize - scaledHeight) / 2
    
    const newCropX = (x - dragStart.x - offsetX) / scale
    const newCropY = (y - dragStart.y - offsetY) / scale
    
    // 限制在图片范围内
    const maxX = imageSize.width - cropArea.size
    const maxY = imageSize.height - cropArea.size
    
    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(newCropX, maxX)),
      y: Math.max(0, Math.min(newCropY, maxY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? -10 : 10
    const newSize = Math.max(50, Math.min(
      Math.min(imageSize.width, imageSize.height),
      cropArea.size + delta
    ))
    
    // 调整位置以保持中心点
    const maxX = imageSize.width - newSize
    const maxY = imageSize.height - newSize
    
    setCropArea({
      x: Math.max(0, Math.min(cropArea.x, maxX)),
      y: Math.max(0, Math.min(cropArea.y, maxY)),
      size: newSize
    })
  }

  const handleCrop = async () => {
    if (!imageRef.current || !canvasRef.current) return
    
    setIsProcessing(true)
    
    try {
      // 创建临时canvas用于裁剪
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = cropArea.size
      tempCanvas.height = cropArea.size
      const tempCtx = tempCanvas.getContext("2d")
      
      if (!tempCtx) return
      
      // 绘制裁剪后的图片
      tempCtx.drawImage(
        imageRef.current,
        cropArea.x,
        cropArea.y,
        cropArea.size,
        cropArea.size,
        0,
        0,
        cropArea.size,
        cropArea.size
      )
      
      // 转换为blob
      tempCanvas.toBlob((blob) => {
        if (blob) {
          onCrop(blob)
          onOpenChange(false)
        } else {
          setIsProcessing(false)
        }
      }, "image/png", 1.0)
    } catch (error) {
      console.error("裁剪失败:", error)
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>裁剪头像</DialogTitle>
          <DialogDescription>
            调整裁剪框位置和大小（滚动鼠标滚轮调整大小），裁剪框比例为1:1
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div
            ref={containerRef}
            className="relative w-full h-[400px] bg-muted dark:bg-cardrounded-lg overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              取消
            </Button>
            <Button
              onClick={handleCrop}
              disabled={isProcessing || !imageLoaded}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认裁剪"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

