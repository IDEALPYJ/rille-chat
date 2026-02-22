"use client"

import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: number
  showText?: boolean
}

export function Logo({ className, size = 24, showText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src="/imgs/logo-black.png"
        alt="Rille Chat Logo"
        className="object-contain dark:hidden"
        style={{ width: size, height: size }}
      />
      <img
        src="/imgs/logo-white.png"
        alt="Rille Chat Logo"
        className="object-contain hidden dark:block"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight text-foreground dark:text-foreground/70">
          Rille Chat
        </span>
      )}
    </div>
  )
}
