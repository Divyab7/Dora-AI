"use client";

import { useEffect, useState } from "react";

/** True after the client has mounted — use to gate browser-only UI and avoid hydration mismatches. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
