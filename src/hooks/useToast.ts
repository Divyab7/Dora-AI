"use client";

import { useCallback } from "react";
import { useUI } from "@/contexts/UIContext";
import type { ToastProps } from "@/components/ui/Toast";

export function useToast() {
  const { addToast, dismissToast, toasts } = useUI();

  const toast = useCallback(
    (message: string, type: ToastProps["type"] = "info", duration = 4000) => {
      addToast({ message, type, duration });
    },
    [addToast]
  );

  return { toast, dismissToast, toasts };
}
