"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

interface AlertToastProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
}

export function AlertToast({ open, onOpenChange, title, message }: AlertToastProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent 
        overlayClassName="bg-background/80 backdrop-blur-sm"
      >
        <AlertDialogHeader>
          {title ? (
            <AlertDialogTitle>{title}</AlertDialogTitle>
          ) : (
            <VisuallyHidden>
              <AlertDialogTitle>提示</AlertDialogTitle>
            </VisuallyHidden>
          )}
          <AlertDialogDescription className="text-base">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button onClick={() => onOpenChange(false)} className="h-7 px-3 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90">确定</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
