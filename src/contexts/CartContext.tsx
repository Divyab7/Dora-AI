"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { CartItem, CartSummary, PaymentMethod } from "@/types/cart";
import { FEES } from "@/lib/utils/constants";
import { loadCart, saveCart } from "@/lib/storage/cart";

// ============================================
// Types
// ============================================

interface CartState {
  items: CartItem[];
  selectedPaymentMethod: PaymentMethod;
  groupBuySplitCount: number;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: string }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; quantity: number } }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod }
  | { type: "SET_GROUP_BUY_SPLIT"; payload: number }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: CartState };

interface CartContextValue extends CartState {
  summary: CartSummary;
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setGroupBuySplit: (count: number) => void;
  clearCart: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: CartState = {
  items: [],
  selectedPaymentMethod: "full",
  groupBuySplitCount: 2,
};

// ============================================
// Reducer
// ============================================

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId && i.retailerId === action.payload.retailerId
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.cartItemId === existing.cartItemId
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.cartItemId !== action.payload),
      };
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((i) =>
          i.cartItemId === action.payload.id
            ? { ...i, quantity: action.payload.quantity }
            : i
        ),
      };
    case "SET_PAYMENT_METHOD":
      return { ...state, selectedPaymentMethod: action.payload };
    case "SET_GROUP_BUY_SPLIT":
      return { ...state, groupBuySplitCount: action.payload };
    case "CLEAR_CART":
      return { ...initialState, selectedPaymentMethod: state.selectedPaymentMethod };
    case "LOAD_CART":
      return action.payload;
    default:
      return state;
  }
}

// ============================================
// Helpers
// ============================================

function computeSummary(state: CartState): CartSummary {
  const subtotalUsd = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const subtotalHbar = state.items.reduce(
    (sum, item) => sum + BigInt(item.priceHbar) * BigInt(item.quantity),
    BigInt(0)
  );

  const txFeeBps = FEES.TRANSACTION_FEE_BPS;
  const payin3FeeBps = state.selectedPaymentMethod === "payin3" ? FEES.PAYIN3_FEE_BPS : 0;

  const transactionFee = Math.floor(subtotalUsd * txFeeBps / 10000);
  const payIn3Fee = Math.floor(subtotalUsd * payin3FeeBps / 10000);

  return {
    itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
    subtotalUsd,
    subtotalHbar: subtotalHbar.toString(),
    transactionFee,
    payIn3Fee,
    totalUsd: subtotalUsd + transactionFee + payIn3Fee,
    totalHbar: (
      subtotalHbar +
      (subtotalHbar * BigInt(txFeeBps + payin3FeeBps)) / BigInt(10000)
    ).toString(),
    paymentMethod: state.selectedPaymentMethod,
  };
}

// ============================================
// Context
// ============================================

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load persisted cart
  useEffect(() => {
    const saved = loadCart();
    if (saved.items.length > 0) {
      dispatch({ type: "LOAD_CART", payload: saved });
    }
  }, []);

  // Persist cart changes
  useEffect(() => {
    saveCart({
      ...state,
      lastUpdated: new Date().toISOString(),
    });
  }, [state]);

  const summary = computeSummary(state);

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD_ITEM", payload: item });
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: cartItemId });
  }, []);

  const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: cartItemId, quantity } });
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", payload: method });
  }, []);

  const setGroupBuySplit = useCallback((count: number) => {
    dispatch({ type: "SET_GROUP_BUY_SPLIT", payload: count });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  return (
    <CartContext.Provider
      value={{
        ...state,
        summary,
        addItem,
        removeItem,
        updateQuantity,
        setPaymentMethod,
        setGroupBuySplit,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be within CartContextProvider");
  return ctx;
}
