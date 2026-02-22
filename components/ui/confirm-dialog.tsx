"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  cancelText?: string | null
  confirmText?: string
  onConfirm: (e: React.MouseEvent<HTMLButtonElement>) => void
  onCancel?: () => void
  variant?: "default" | "destructive"
  confirmButtonProps?: ButtonProps
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelText,
  confirmText = "确定",
  onConfirm,
  onCancel,
  variant = "default",
  confirmButtonProps
}: ConfirmDialogProps) {
  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    onConfirm(e)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent overlayClassName="bg-background/80 backdrop-blur-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="!justify-end">
          {cancelText != null && cancelText !== "" && (
            <AlertDialogCancel onClick={handleCancel} className="h-7 px-3 text-xs rounded-md">{cancelText}</AlertDialogCancel>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              "h-7 px-3 text-xs rounded-md",
              variant === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-foreground text-background hover:bg-foreground/90"
            )}
            {...confirmButtonProps}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}