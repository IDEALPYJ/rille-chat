"use client"

import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "@/components/chat/sidebar"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

// 这里的 user 类型定义应该复用，为了简单先 copy 一下
interface MobileSidebarProps {
    user: {
      name?: string | null
      email?: string | null
      image?: string | null
    }
}

export function MobileSidebar({ user }: MobileSidebarProps) {
  // 解决 Hydration Error (Sheet 组件在服务端渲染时可能会有问题)
  const [isMounted, setIsMounted] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setIsMounted(true)
    })
    return () => cancelAnimationFrame(rafId)
  }, [])
  if (!isMounted) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="sr-only">
          <SheetTitle>导航菜单</SheetTitle>
        </SheetHeader>
        <Sidebar user={user} sidebarId="mobile-sidebar" onMobileClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}