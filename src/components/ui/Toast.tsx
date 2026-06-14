"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface ToastProps {
  id?: string;
  type?: "success" | "error" | "info" | "warning";
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const toastIcons: Record<string, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const toastColors: Record<string, string> = {
  success: "border-[var(--accent)]/30 bg-[var(--accent-dim)]",
  error: "border-red-500/30 bg-red-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
  info: "border-blue-500/30 bg-blue-500/10",
};

const ToastItem = ({
  type = "info",
  message,
  onDismiss,
  className,
}: ToastProps) => {
  return (
    <div
      className={cn(
        "glass-card flex items-center gap-3 p-4 animate-slide-up border",
        toastColors[type],
        className
      )}
      role="alert"
    >
      <span className="text-lg flex-shrink-0">{toastIcons[type]}</span>
      <p className="text-sm text-[var(--text-primary)] flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
};

const ToastContainer = ({
  toasts,
  onDismiss,
}: {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}) => (
  <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 md:bottom-4 md:left-auto md:right-4 md:translate-x-0">
    {toasts.map((toast) => (
      <ToastItem
        key={toast.id}
        {...toast}
        onDismiss={() => toast.id && onDismiss(toast.id)}
      />
    ))}
  </div>
);

export { ToastItem, ToastContainer };
export type { ToastProps };
