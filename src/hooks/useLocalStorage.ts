"use client";

import { useState, useCallback, useEffect } from "react";
import { getItem, setItem, removeItem } from "@/lib/storage/local";

/**
 * React hook for type-safe LocalStorage access.
 * Syncs state with localStorage and across tabs via storage event.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() =>
    getItem<T>(key, initialValue)
  );

  // Listen for changes from other tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === `dora:${key}` && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // Ignore parse errors from other tabs
        }
      } else if (e.key === `dora:${key}` && e.newValue === null) {
        setStoredValue(initialValue);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, initialValue]);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          value instanceof Function ? value(prev) : value;
        setItem(key, nextValue);
        return nextValue;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
