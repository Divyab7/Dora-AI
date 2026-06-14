"use client";

import { useEffect } from "react";
import { isChunkLoadError, reloadOnceForStaleChunk } from "@/lib/utils/chunk-reload";

/** Reload once when a stale JS chunk fails after a new deploy. */
export function ChunkErrorHandler() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (isChunkLoadError(event.error ?? event.message)) {
        reloadOnceForStaleChunk();
      }
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      if (isChunkLoadError(event.reason)) {
        reloadOnceForStaleChunk();
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
