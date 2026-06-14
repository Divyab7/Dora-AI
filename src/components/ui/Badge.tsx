"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "accent" | "success" | "warning" | "error" | "default";
  size?: "sm" | "md";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", ...props }, ref) => {
    const variants: Record<string, string> = {
      accent:
        "bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/20",
      success:
        "bg-green-500/10 text-green-400 border border-green-500/20",
      warning:
        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      error: "bg-red-500/10 text-red-400 border border-red-500/20",
      default:
        "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)]",
    };

    const sizes: Record<string, string> = {
      sm: "text-xs px-2 py-0.5 rounded-full",
      md: "text-sm px-3 py-1 rounded-full",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
