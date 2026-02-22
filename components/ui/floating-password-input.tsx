"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

export interface FloatingPasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

const FloatingPasswordInput = React.forwardRef<HTMLInputElement, FloatingPasswordInputProps>(
  ({ className, label, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputId = id || React.useId()

    return (
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          className={cn(
            "peer flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 pr-10 text-sm placeholder:text-transparent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          id={inputId}
          placeholder=" "
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground transition-all duration-200 pointer-events-none",
            "peer-focus:top-0 peer-focus:left-3 peer-focus:text-xs peer-focus:bg-background peer-focus:px-1 peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1"
          )}
        >
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    )
  }
)
FloatingPasswordInput.displayName = "FloatingPasswordInput"

export { FloatingPasswordInput }
