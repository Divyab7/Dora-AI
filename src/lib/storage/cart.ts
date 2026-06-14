/**
 * Cart-specific storage helpers.
 * Persists cart state to LocalStorage for session survival.
 */

import { getItem, setItem, removeItem } from "./local";
import type { CartItem } from "@/types/cart";

const CART_KEY = "cart";
const PAYMENT_METHOD_KEY = "payment_method";
const GROUPBUY_SPLIT_KEY = "groupbuy_split";

export interface PersistedCart {
  items: CartItem[];
  selectedPaymentMethod: "full" | "payin3" | "groupbuy";
  groupBuySplitCount: number;
  lastUpdated: string;
}

export function loadCart(): PersistedCart {
  return getItem<PersistedCart>(CART_KEY, {
    items: [],
    selectedPaymentMethod: "full",
    groupBuySplitCount: 2,
    lastUpdated: new Date().toISOString(),
  });
}

export function saveCart(cart: PersistedCart): boolean {
  return setItem(CART_KEY, { ...cart, lastUpdated: new Date().toISOString() });
}

export function clearCartStorage(): void {
  removeItem(CART_KEY);
  removeItem(PAYMENT_METHOD_KEY);
  removeItem(GROUPBUY_SPLIT_KEY);
}
