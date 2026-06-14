const SEARCH_UNLOCK_KEY = "dora_search_unlocked_until";

/** Unlock search for 24h after successful unlock payment */
export function markSearchUnlocked(): void {
  if (typeof window === "undefined") return;
  const until = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(SEARCH_UNLOCK_KEY, String(until));
}

export function isSearchUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(SEARCH_UNLOCK_KEY);
  if (!raw) return false;
  return Date.now() < Number(raw);
}
