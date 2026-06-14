"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { CheckoutStage, PayIn3Installment, CheckoutResult } from "@/types/checkout";
import type { PaymentMethod } from "@/types/cart";

// ============================================
// Types
// ============================================

interface CheckoutState {
  stage: CheckoutStage;
  transactionId: string | null;
  scheduleId: string | null;
  escrowContractId: string | null;
  paymentMethod: PaymentMethod;
  payIn3Installments: PayIn3Installment[] | null;
  groupBuyDetails: {
    groupId: string;
    escrowContractId: string;
    totalAmountHbar: string;
    perPersonAmountHbar: string;
    participantCount: number;
    expiresAt: string;
  } | null;
  approvalTimestamp: string | null;
  cancellationWindowEnd: string | null;
  error: string | null;
}

type CheckoutAction =
  | { type: "START_CHECKOUT"; payload: PaymentMethod }
  | { type: "REQUEST_APPROVAL" }
  | { type: "APPROVED"; payload: string }
  | { type: "SIGNING_STARTED" }
  | { type: "PROCESSING" }
  | { type: "COMPLETE"; payload: CheckoutResult }
  | { type: "FAILED"; payload: string }
  | { type: "SET_CANCEL_WINDOW"; payload: string }
  | { type: "RESET" };

interface CheckoutContextValue extends CheckoutState {
  startCheckout: (method: PaymentMethod) => void;
  requestApproval: () => void;
  approve: () => void;
  signingStarted: () => void;
  processing: () => void;
  complete: (result: CheckoutResult) => void;
  fail: (error: string) => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: CheckoutState = {
  stage: "review",
  transactionId: null,
  scheduleId: null,
  escrowContractId: null,
  paymentMethod: "full",
  payIn3Installments: null,
  groupBuyDetails: null,
  approvalTimestamp: null,
  cancellationWindowEnd: null,
  error: null,
};

// ============================================
// Reducer
// ============================================

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "START_CHECKOUT":
      return {
        ...initialState,
        stage: "review",
        paymentMethod: action.payload,
      };
    case "REQUEST_APPROVAL":
      return { ...state, stage: "approval" };
    case "APPROVED":
      return {
        ...state,
        stage: "signing",
        approvalTimestamp: action.payload,
        cancellationWindowEnd: new Date(
          new Date(action.payload).getTime() + 24 * 60 * 60 * 1000
        ).toISOString(),
      };
    case "SIGNING_STARTED":
      return { ...state, stage: "signing" };
    case "PROCESSING":
      return { ...state, stage: "processing" };
    case "COMPLETE":
      return {
        ...state,
        stage: "complete",
        transactionId: action.payload.transactionId,
        scheduleId: action.payload.scheduleId || null,
        escrowContractId: action.payload.escrowContractId || null,
      };
    case "FAILED":
      return { ...state, stage: "failed", error: action.payload };
    case "SET_CANCEL_WINDOW":
      return { ...state, cancellationWindowEnd: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

export function CheckoutContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const startCheckout = useCallback((method: PaymentMethod) => {
    dispatch({ type: "START_CHECKOUT", payload: method });
  }, []);

  const requestApproval = useCallback(() => {
    dispatch({ type: "REQUEST_APPROVAL" });
  }, []);

  const approve = useCallback(() => {
    dispatch({ type: "APPROVED", payload: new Date().toISOString() });
  }, []);

  const signingStarted = useCallback(() => {
    dispatch({ type: "SIGNING_STARTED" });
  }, []);

  const processing = useCallback(() => {
    dispatch({ type: "PROCESSING" });
  }, []);

  const complete = useCallback((result: CheckoutResult) => {
    dispatch({ type: "COMPLETE", payload: result });
  }, []);

  const fail = useCallback((error: string) => {
    dispatch({ type: "FAILED", payload: error });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <CheckoutContext.Provider
      value={{
        ...state,
        startCheckout,
        requestApproval,
        approve,
        signingStarted,
        processing,
        complete,
        fail,
        reset,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be within CheckoutContextProvider");
  return ctx;
}
