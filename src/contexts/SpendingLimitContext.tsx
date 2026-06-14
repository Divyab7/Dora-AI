"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import { SPENDING } from "@/lib/utils/constants";
import { loadSpendingLimits, saveSpendingLimits } from "@/lib/storage/settings";
import type { SpendingLimitsConfig } from "@/lib/utils/validators";

// ============================================
// Types
// ============================================

interface SpendingLimitState extends SpendingLimitsConfig {
  dailySpent: number;
  lastResetDate: string;
  isOverDailyLimit: boolean;
}

type SpendingLimitAction =
  | { type: "SET_DAILY_LIMIT"; payload: number }
  | { type: "SET_PER_TRANSACTION_LIMIT"; payload: number }
  | { type: "ADD_SPENT"; payload: number }
  | { type: "RESET_DAILY_SPENT" }
  | { type: "SET_REQUIRES_APPROVAL_ABOVE"; payload: number }
  | { type: "LOAD_CONFIG"; payload: SpendingLimitsConfig };

interface SpendingLimitContextValue extends SpendingLimitState {
  setDailyLimit: (limit: number) => void;
  setPerTransactionLimit: (limit: number) => void;
  addSpent: (amount: number) => void;
  checkLimits: (amountHbar: number) => { allowed: boolean; reason?: string };
  setApprovalThreshold: (threshold: number) => void;
}

// ============================================
// Initial State
// ============================================

const initialState: SpendingLimitState = {
  dailyLimit: SPENDING.DEFAULT_DAILY_LIMIT_HBAR,
  dailySpent: 0,
  perTransactionLimit: SPENDING.DEFAULT_PER_TX_LIMIT_HBAR,
  requiresApprovalAbove: SPENDING.DEFAULT_APPROVAL_THRESHOLD_HBAR,
  lastResetDate: new Date().toISOString().split("T")[0],
  isOverDailyLimit: false,
};

// ============================================
// Reducer
// ============================================

function spendingReducer(state: SpendingLimitState, action: SpendingLimitAction): SpendingLimitState {
  switch (action.type) {
    case "SET_DAILY_LIMIT":
      return { ...state, dailyLimit: action.payload };
    case "SET_PER_TRANSACTION_LIMIT":
      return { ...state, perTransactionLimit: action.payload };
    case "ADD_SPENT": {
      const newSpent = state.dailySpent + action.payload;
      return {
        ...state,
        dailySpent: newSpent,
        isOverDailyLimit: newSpent > state.dailyLimit,
      };
    }
    case "RESET_DAILY_SPENT":
      return {
        ...state,
        dailySpent: 0,
        lastResetDate: new Date().toISOString().split("T")[0],
        isOverDailyLimit: false,
      };
    case "SET_REQUIRES_APPROVAL_ABOVE":
      return { ...state, requiresApprovalAbove: action.payload };
    case "LOAD_CONFIG":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const SpendingLimitContext = createContext<SpendingLimitContextValue | undefined>(undefined);

export function SpendingLimitContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(spendingReducer, initialState);

  // Load saved limits on mount
  useEffect(() => {
    const saved = loadSpendingLimits();
    dispatch({ type: "LOAD_CONFIG", payload: saved });
  }, []);

  // Reset daily spent at midnight
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (state.lastResetDate !== today) {
      dispatch({ type: "RESET_DAILY_SPENT" });
    }

    const msUntilMidnight =
      new Date(today + "T24:00:00").getTime() - Date.now();
    const timer = setTimeout(() => {
      dispatch({ type: "RESET_DAILY_SPENT" });
    }, msUntilMidnight + 1000);

    return () => clearTimeout(timer);
  }, [state.lastResetDate]);

  // Persist limits when changed
  useEffect(() => {
    saveSpendingLimits({
      dailyLimit: state.dailyLimit,
      perTransactionLimit: state.perTransactionLimit,
      requiresApprovalAbove: state.requiresApprovalAbove,
    });
  }, [state.dailyLimit, state.perTransactionLimit, state.requiresApprovalAbove]);

  const setDailyLimit = useCallback((limit: number) => {
    dispatch({ type: "SET_DAILY_LIMIT", payload: limit });
  }, []);

  const setPerTransactionLimit = useCallback((limit: number) => {
    dispatch({ type: "SET_PER_TRANSACTION_LIMIT", payload: limit });
  }, []);

  const addSpent = useCallback((amount: number) => {
    dispatch({ type: "ADD_SPENT", payload: amount });
  }, []);

  const checkLimits = useCallback(
    (amountHbar: number): { allowed: boolean; reason?: string } => {
      if (amountHbar > state.perTransactionLimit) {
        return {
          allowed: false,
          reason: `Exceeds per-transaction limit of ${state.perTransactionLimit} ℏ`,
        };
      }
      if (state.dailySpent + amountHbar > state.dailyLimit) {
        return {
          allowed: false,
          reason: `Daily limit of ${state.dailyLimit} ℏ would be exceeded`,
        };
      }
      return { allowed: true };
    },
    [state.perTransactionLimit, state.dailyLimit, state.dailySpent]
  );

  const setApprovalThreshold = useCallback((threshold: number) => {
    dispatch({ type: "SET_REQUIRES_APPROVAL_ABOVE", payload: threshold });
  }, []);

  return (
    <SpendingLimitContext.Provider
      value={{
        ...state,
        setDailyLimit,
        setPerTransactionLimit,
        addSpent,
        checkLimits,
        setApprovalThreshold,
      }}
    >
      {children}
    </SpendingLimitContext.Provider>
  );
}

export function useSpendingLimit(): SpendingLimitContextValue {
  const ctx = useContext(SpendingLimitContext);
  if (!ctx) throw new Error("useSpendingLimit must be within SpendingLimitContextProvider");
  return ctx;
}
