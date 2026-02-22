"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface VoicePlayButtonProps {
  isPlaying: boolean
  progress: number
  onClick: (e: React.MouseEvent) => void
  className?: string
}

export function VoicePlayButton({ isPlaying, progress, onClick, className }: VoicePlayButtonProps) {
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <button
      data-play-button
      type="button"
      className={cn(
        "relative flex-shrink-0 p-0 m-0 border-none bg-transparent outline-none transition-transform active:scale-95",
        "w-5 h-5", // 容器必须严格等于 20px
        className
      )}
      onClick={onClick}
    >
      {/*
        统一坐标系：所有元素都放在一个 20x20 的 SVG 内
        这是解决错位的终极方案
      */}
      <svg
        width="20" height="20" viewBox="0 0 20 20"
        className="block fill-none"
      >
        {/* 层 1: 底层静止圆环 */}
        <circle
          cx="10"
          cy="10"
          r={radius}
          strokeWidth="1.5"
          stroke="currentColor"
          className="text-black/10 dark:text-white/10"
        />

        {/* 层 2: 动态进度圆环 */}
        <circle
          cx="10"
          cy="10"
          r={radius}
          strokeWidth="1.5"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeLinecap="round"
          className={cn(
            "transition-opacity duration-200 text-primary",
            isPlaying ? "opacity-100" : "opacity-0"
          )}
          style={{
            strokeDashoffset: isPlaying ? strokeDashoffset : circumference,
            transform: 'rotate(-90deg)',
            transformOrigin: '10px 10px',
            // 移除 transition，使用直接同步，确保完全同步
            transition: "none"
          }}
        />

        {/* 层 3: 图标 - 直接在 20x20 坐标系中手写位置 */}
        {isPlaying ? (
          /* 暂停状态：小方块，中心点对齐 10,10 */
          <rect
            x="7.5" y="7.5" width="5" height="5" rx="1"
            fill="currentColor"
            className="text-primary"
          />
        ) : (
          /* 播放状态：三角形，根据视觉重心稍微向右偏移 0.5px (x=8.5) */
          <path
            d="M8.5 6.5V13.5L14 10L8.5 6.5Z"
            fill="currentColor"
            className="text-foreground/80 group-hover:text-foreground"
          />
        )}
      </svg>
    </button>
  )
}
