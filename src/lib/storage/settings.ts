/**
 * User settings persistence.
 */

import { getItem, setItem } from "./local";
import type { SpendingLimitsConfig } from "@/lib/utils/validators";

const SETTINGS_KEY = "settings";
const SPENDING_LIMITS_KEY = "spending_limits";

export interface UserSettings {
  theme: "dark" | "light";
  notificationsEnabled: boolean;
  preferredWallet: "hashpack" | "blade" | null;
}

export function loadSettings(): UserSettings {
  return getItem<UserSettings>(SETTINGS_KEY, {
    theme: "dark",
    notificationsEnabled: true,
    preferredWallet: null,
  });
}

export function saveSettings(settings: UserSettings): boolean {
  return setItem(SETTINGS_KEY, settings);
}

export function loadSpendingLimits(): SpendingLimitsConfig {
  return getItem<SpendingLimitsConfig>(SPENDING_LIMITS_KEY, {
    dailyLimit: 10000, // $100 in USD cents
    perTransactionLimit: 5000, // $50
    requiresApprovalAbove: 0, // Always require approval
  });
}

export function saveSpendingLimits(limits: SpendingLimitsConfig): boolean {
  return setItem(SPENDING_LIMITS_KEY, limits);
}
