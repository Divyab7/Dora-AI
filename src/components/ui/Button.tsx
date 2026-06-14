"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "accent" | "glass" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "glass", size = "md", loading, children, disabled, ...props }, ref) => {
    const variants: Record<string, string> = {
      accent: "btn-accent",
      glass: "btn-glass",
      ghost:
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-highlight)] rounded-xl px-4 py-2.5 transition-all duration-200",
      danger:
        "bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-4 py-2.5 hover:bg-red-500/20 transition-all duration-200",
    };

    const sizes: Record<string, string> = {
      sm: "text-xs px-3 py-1.5 rounded-lg",
      md: "text-sm px-4 py-2.5 rounded-xl",
      lg: "text-base px-6 py-3 rounded-xl",
    };

    const isAccentVariant = variant === "accent";

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
          isAccentVariant ? variants.accent : variants[variant],
          !isAccentVariant && sizes[size],
          loading && "opacity-70 cursor-wait",
          disabled && !isAccentVariant && "opacity-40 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
