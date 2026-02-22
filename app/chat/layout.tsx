import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ChatLayoutClient } from "@/components/chat/chat-layout-client"
import { ChatProvider } from "@/context/chat-context"
import { MobileHeaderProvider } from "@/context/mobile-header-context"
import { ToastNotification } from "@/components/ui/toast-notification"
import { SessionProvider } from "next-auth/react"
import { Providers } from "@/components/providers"

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // 构造用户对象
  const user = {
    name: session.user.username || session.user.name,
    email: session.user.email,
    image: session.user.image,
  }

  return (
    <SessionProvider session={session}>
      <Providers>
        <ChatProvider>
          <MobileHeaderProvider>
            <ChatLayoutClient user={user}>
              {children}
            </ChatLayoutClient>
            <ToastNotification />
          </MobileHeaderProvider>
        </ChatProvider>
      </Providers>
    </SessionProvider>
  )
}
