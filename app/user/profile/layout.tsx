"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, User, BarChart3, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { ProfileContentWrapper } from "./profile-context"

const menuItems = [
  { id: "profile", label: "个人资料", icon: User, path: "/user/profile" },
  { id: "stats", label: "统计数据", icon: BarChart3, path: "/user/profile/stats" },
  { id: "data", label: "数据管理", icon: Database, path: "/user/profile/data" },
]

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [showContent, setShowContent] = React.useState(false)

  // 当路径改变时，如果是直接访问某个页面，显示内容区域
  React.useEffect(() => {
    // 在移动端，如果直接访问子页面，需要显示内容区域
    const isDirectAccess = pathname !== "/user/profile" || window.innerWidth >= 768
    if (isDirectAccess) {
      setShowContent(true)
    }
  }, [pathname])

  const activeMenu = menuItems.find(item => item.path === pathname)?.id || "profile"

  const handleMenuClick = (path: string) => {
    router.push(path)
    setShowContent(true)
  }

  const handleBack = () => {
    setShowContent(false)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* 左侧边栏 - 菜单列表 */}
      <div className={cn(
        "absolute inset-0 md:relative md:inset-auto w-full md:w-56 border-r bg-muted/50 dark:bg-muted/30 flex flex-col transition-transform duration-300 shrink-0 z-10",
        showContent ? "-translate-x-full md:translate-x-0 md:!translate-x-0" : "translate-x-0"
      )}>
        <div className="h-14 border-b flex items-center gap-2 px-5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground -ml-2 mr-1"
            onClick={() => router.push("/chat")}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
          </Button>
          <h2 className="text-lg font-bold">个人账户</h2>
        </div>
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeMenu === item.id ? "secondary" : "ghost"}
                className="w-full justify-start h-7 text-xs"
                onClick={() => handleMenuClick(item.path)}
              >
                <Icon className="mr-2 h-3.5 w-3.5" />
                {item.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className={cn(
        "absolute inset-0 md:relative md:inset-auto flex-1 flex flex-col min-w-0 overflow-hidden transition-transform duration-300 bg-background",
        showContent ? "translate-x-0" : "translate-x-full md:!translate-x-0"
      )}>
        {/* 将 onBack 回调通过 context 或 cloneElement 传递给子组件 */}
        <ProfileContentWrapper onBack={handleBack}>
          {children}
        </ProfileContentWrapper>
      </div>
    </div>
  )
}
