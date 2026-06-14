/**
 * Type-safe LocalStorage wrapper with JSON serialization.
 * Includes error handling for SSR (where localStorage is unavailable)
 * and quota exceeded scenarios.
 */

const STORAGE_PREFIX = "dora:";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getItem<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[Storage] Failed to read "${key}":`, error);
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;

  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(STORAGE_PREFIX + key, serialized);
    return true;
  } catch (error) {
    console.warn(`[Storage] Failed to write "${key}":`, error);
    return false;
  }
}

export function removeItem(key: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.warn(`[Storage] Failed to remove "${key}":`, error);
  }
}

export function getAllKeys(): string[] {
  if (!isBrowser()) return [];

  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .map((k) => k.slice(STORAGE_PREFIX.length));
  } catch {
    return [];
  }
}

export function clearAll(): void {
  if (!isBrowser()) return;

  try {
    getAllKeys().forEach((key) => removeItem(key));
  } catch (error) {
    console.warn("[Storage] Failed to clear:", error);
  }
}

/**
 * Get estimated storage usage in bytes (approximate).
 */
export function getUsageBytes(): number {
  if (!isBrowser()) return 0;

  try {
    return getAllKeys().reduce((total, key) => {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return total + (raw ? raw.length * 2 : 0); // UTF-16 = 2 bytes per char
    }, 0);
  } catch {
    return 0;
  }
}
