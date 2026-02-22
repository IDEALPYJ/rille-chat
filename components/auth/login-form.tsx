"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/ui/floating-input"
import { FloatingPasswordInput } from "@/components/ui/floating-password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useI18n } from "@/lib/i18n/context"

// 动态导入 signIn 以避免服务端渲染问题
import { signIn } from "next-auth/react"

export function LoginForm() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const registered = searchParams.get("registered")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        // NextAuth 会将错误信息放在 error 字段中
        // 优先使用服务器返回的详细错误信息
        let errorMessage = t("auth.loginError");
        
        if (result.error.includes("用户名不存在")) {
          errorMessage = "用户名不存在，请检查用户名或前往注册";
        } else if (result.error.includes("密码错误")) {
          errorMessage = "密码错误，请检查后重试";
        } else if (result.error.includes("输入验证失败") || result.error.includes("不能为空")) {
          errorMessage = result.error;
        } else if (result.error.includes("数据库查询错误")) {
          errorMessage = "登录失败，数据库连接错误，请稍后重试";
        } else if (result.error.includes("密码验证错误")) {
          errorMessage = "登录失败，密码验证错误，请稍后重试";
        } else if (result.error.includes("发生未知错误")) {
          errorMessage = "登录失败，发生未知错误，请稍后重试";
        } else if (result.error === "CredentialsSignin") {
          // 默认的 NextAuth 错误，使用通用提示
          errorMessage = "用户名或密码错误，请检查后重试";
        } else if (result.error) {
          // 尝试直接使用错误信息（如果是自定义错误消息）
          errorMessage = result.error;
        }
        
        setError(errorMessage)
      } else if (result?.ok) {
        router.push("/chat")
        router.refresh()
      } else {
        setError(t("auth.loginError"))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("auth.loginFailed");
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-[490px] border-0 shadow-none -mt-20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{t("auth.loginTitle")}</CardTitle>
        <CardDescription className="text-center">{t("auth.loginDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="grid w-full items-center gap-5">
            <FloatingInput
              id="username"
              name="username"
              label={t("auth.username")}
              required
            />
            <FloatingPasswordInput
              id="password"
              name="password"
              label={t("auth.password")}
              required
            />
            
            {error && (
              <div className="text-sm text-red-500 font-medium">
                {error}
              </div>
            )}

            {registered && !error && (
              <div className="text-sm text-green-600 font-medium">
                {t("auth.registerSuccess")}
              </div>
            )}
            
            <Button className="w-full mt-2" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.loginButton")}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-2">
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="text-foreground hover:underline font-medium">
                {t("auth.goRegister")}
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}