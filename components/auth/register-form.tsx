"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/ui/floating-input"
import { FloatingPasswordInput } from "@/components/ui/floating-password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/context"
import { getPasswordRequirementText } from "@/lib/auth/password-validation"

export function RegisterForm() {
  const { t } = useI18n()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const username = formData.get("username") as string
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"))
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // 优先显示服务器返回的详细错误信息
        let errorMessage = t("auth.registerError");

        // 根据HTTP状态码处理不同错误
        if (response.status === 409) {
          // 用户名已存在
          errorMessage = data.error || "该用户名已被使用，请选择其他用户名";
        } else if (response.status === 429) {
          // 频率限制
          errorMessage = data.error || "请求过于频繁，请稍后再试";
        } else if (data.error) {
          // 如果是字符串，直接使用
          if (typeof data.error === 'string') {
            errorMessage = data.error;
          }
          // 如果是对象（Zod 错误格式），提取错误信息
          else if (typeof data.error === 'object') {
            const errorMessages: string[] = [];
            if (data.error.username) {
              // 处理 username 错误：可能是字符串、数组或对象
              if (typeof data.error.username === 'string') {
                errorMessages.push(`用户名：${data.error.username}`);
              } else if (Array.isArray(data.error.username)) {
                errorMessages.push(`用户名：${data.error.username[0]}`);
              } else if (data.error.username._errors && Array.isArray(data.error.username._errors)) {
                errorMessages.push(`用户名：${data.error.username._errors[0]}`);
              } else if (typeof data.error.username === 'object') {
                errorMessages.push(`用户名：${String(data.error.username)}`);
              }
            }
            if (data.error.password) {
              // 处理 password 错误：可能是字符串、数组或对象
              if (typeof data.error.password === 'string') {
                errorMessages.push(`密码：${data.error.password}`);
              } else if (Array.isArray(data.error.password)) {
                errorMessages.push(`密码：${data.error.password.join('、')}`);
              } else if (data.error.password._errors && Array.isArray(data.error.password._errors)) {
                errorMessages.push(`密码：${data.error.password._errors.join('、')}`);
              } else if (typeof data.error.password === 'object') {
                errorMessages.push(`密码：${String(data.error.password)}`);
              }
            }
            if (data.error._errors && Array.isArray(data.error._errors)) {
              errorMessages.push(...data.error._errors);
            }
            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('；');
            }
          }
        } else if (data.message) {
          errorMessage = data.message;
        }

        setError(errorMessage)
      } else {
        router.push("/login?registered=true")
      }
    } catch {
      setError(t("auth.registerFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-[490px] border-0 shadow-none -mt-20">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{t("auth.createAccount")}</CardTitle>
        <CardDescription className="text-center">{t("auth.registerDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <div className="grid w-full items-center gap-5">
            <FloatingInput
              id="username"
              name="username"
              label={t("auth.username")}
              required
              minLength={3}
            />
            <FloatingPasswordInput
              id="password"
              name="password"
              label={t("auth.password")}
              required
              minLength={8}
            />
            <FloatingPasswordInput
              id="confirmPassword"
              name="confirmPassword"
              label={t("auth.confirmPassword")}
              required
              minLength={8}
            />

            <p className="text-xs text-muted-foreground -mt-2">
              {getPasswordRequirementText()}
            </p>

            {error && (
              <div className="text-sm text-red-500 font-medium">
                {error}
              </div>
            )}

            <Button className="w-full mt-2" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.registerButton")}
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-2">
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="text-foreground hover:underline font-medium">
                {t("auth.goLogin")}
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
