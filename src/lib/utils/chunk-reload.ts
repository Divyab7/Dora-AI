/** Detect webpack / Next.js lazy-chunk load failures (often after a new deploy). */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("loading chunk") ||
    msg.includes("chunkloaderror") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed")
  );
}

const RELOAD_KEY = "dora_chunk_reload";

export function clearChunkReloadFlag(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RELOAD_KEY);
}

export function hasAlreadyReloadedForChunk(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(RELOAD_KEY) === "1";
}

/** Reload once per session when a stale chunk is detected. */
export function reloadOnceForStaleChunk(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(RELOAD_KEY)) return false;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

/** Dynamic import with one automatic reload on stale chunk errors. */
export async function importWithChunkRetry<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    if (isChunkLoadError(error) && reloadOnceForStaleChunk()) {
      await new Promise(() => {});
    }
    throw error;
  }
}

/** Preload a lazy module so connect clicks don't hit a cold chunk fetch. */
export function preloadModule(loader: () => Promise<unknown>): void {
  if (typeof window === "undefined") return;
  loader().catch(() => {
    // Best-effort preload; connect flow will retry.
  });
}
