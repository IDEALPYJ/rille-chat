"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  KeyRound,
  Loader2,
  RefreshCcw,
  Check,
  Camera,
  Edit2,
  ChevronLeft,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { AvatarCropDialog } from "@/components/chat/settings/avatar-crop-dialog"
import { useI18n } from "@/lib/i18n/context"
import { cn } from "@/lib/utils"
import { useProfileContext } from "./profile-context"

export default function ProfilePage() {
  const { t } = useI18n()
  const { onBack } = useProfileContext()
  const { data: session, update: updateSession } = useSession()

  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState("")
  const [passwordSuccess, setPasswordSuccess] = React.useState(false)
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })

  const [isEditingName, setIsEditingName] = React.useState(false)
  const [newName, setNewName] = React.useState(session?.user?.username || session?.user?.name || "")
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const [profileError, setProfileError] = React.useState("")
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false)
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null)

  React.useEffect(() => {
    const name = session?.user?.username || session?.user?.name
    if (name) {
      setNewName(name)
    }
  }, [session?.user?.username, session?.user?.name])

  const handleUpdateProfile = async (updates: { name?: string, image?: string }) => {
    setProfileError("")
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("profile.updateFailed"))
      }

      await updateSession()
      setIsEditingName(false)
    } catch (error: any) {
      setProfileError(error.message)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setProfileError(t("profile.fileTooLarge"))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string
      setImageToCrop(imageSrc)
      setCropDialogOpen(true)
    }
    reader.onerror = () => {
      setProfileError(t("profile.readFileFailed"))
    }
    reader.readAsDataURL(file)

    e.target.value = ""
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true)
    setProfileError("")
    setCropDialogOpen(false)
    setImageToCrop(null)

    try {
      const formData = new FormData()
      const file = new File([croppedBlob], "avatar.png", { type: "image/png" })
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })

      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error || t("profile.uploadFailed"))
      }

      const uploadData = await uploadRes.json()
      await handleUpdateProfile({ image: uploadData.url })
    } catch (error: any) {
      setProfileError(error.message)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess(false)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"))
      return
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || t("profile.changeFailed"))
      }

      setPasswordSuccess(true)
      setIsChangingPassword(false)
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      setPasswordError(error.message)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-8">
        <div className="h-14 border-b flex items-center gap-2 px-5 md:px-0 shrink-0 mb-6 md:mb-6">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 -ml-2 shrink-0"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-1.5 bg-muted dark:bg-muted rounded-lg shrink-0">
              <User className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">个人资料</h2>
          </div>
        </div>

        <div className="space-y-6">
          {/* 头像设置 */}
          <div className="group flex items-center gap-4 md:gap-6 p-4 rounded-xl border bg-card/50">
            <div className="relative">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-card shadow-sm transition-transform group-hover:scale-105">
                <AvatarImage src={session?.user?.image || ""} />
                <AvatarFallback className="bg-primary/5 text-primary text-xl">
                  {(session?.user?.username || session?.user?.name)?.[0]?.toUpperCase() || <User />}
                </AvatarFallback>
              </Avatar>
              <label className={cn(
                "absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full transition-opacity cursor-pointer",
                isUploadingAvatar ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}>
                {isUploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-end gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 w-full">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                      onClick={() => handleUpdateProfile({ name: newName })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => {
                        setIsEditingName(false)
                        setNewName(session?.user?.username || session?.user?.name || "")
                      }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Input
                      autoFocus
                      className="h-8 text-base font-bold flex-1 bg-background"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateProfile({ name: newName })
                        if (e.key === "Escape") {
                          setIsEditingName(false)
                          setNewName(session?.user?.username || session?.user?.name || "")
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <h3 className="text-xl font-bold tracking-tight text-right">
                      {session?.user?.username || session?.user?.name || t("profile.notSet")}
                    </h3>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-right">{session?.user?.email}</p>
            </div>
          </div>

          {profileError && (
            <div className="p-3 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg">
              {profileError}
            </div>
          )}

          {/* 密码设置 */}
          <div className="pt-4">
            <div className="p-4 rounded-xl border bg-card/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">{t("profile.password")}</h4>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  {isChangingPassword ? t("profile.cancelChange") : t("profile.changePassword")}
                </Button>
              </div>

              {passwordSuccess && (
                <div className="text-xs text-green-600 font-medium">{t("profile.passwordChanged")}</div>
              )}

              {isChangingPassword && (
                <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-dashed border-border">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-medium">{t("profile.currentPassword")}</Label>
                    <Input
                      type="password"
                      className="h-8 text-xs"
                      value={passwordForm.currentPassword}
                      onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-medium">{t("profile.newPassword")}</Label>
                      <Input
                        type="password"
                        className="h-8 text-xs"
                        value={passwordForm.newPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-medium">{t("profile.confirmPassword")}</Label>
                      <Input
                        type="password"
                        className="h-8 text-xs"
                        value={passwordForm.confirmPassword}
                        onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  {passwordError && (
                    <div className="text-xs text-red-500 font-medium">{passwordError}</div>
                  )}
                  <Button type="submit" size="sm" className="text-xs w-full">{t("profile.confirmChange")}</Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <AvatarCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={imageToCrop || ""}
        onCrop={handleCropComplete}
      />
    </div>
  )
}
