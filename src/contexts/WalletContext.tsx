"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import type { WalletProvider, HbarBalance, MandateRecord } from "@/types/wallet";
import { connectWallet, disconnectWallet, getAvailableWallets } from "@/lib/hedera/wallet";
import { loadMandates, addMandate as saveMandate, revokeMandate as removeMandate } from "@/lib/storage/mandates";

// ============================================
// Types
// ============================================

interface WalletState {
  provider: WalletProvider | null;
  accountId: string | null;
  balance: HbarBalance | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: "testnet" | "mainnet";
  connectionError: string | null;
  mandates: MandateRecord[];
  availableWallets: WalletProvider[];
}

type WalletAction =
  | { type: "CONNECT_START"; payload: WalletProvider }
  | { type: "CONNECT_SUCCESS"; payload: { accountId: string; network: "testnet" | "mainnet"; provider: WalletProvider } }
  | { type: "CONNECT_ERROR"; payload: string }
  | { type: "DISCONNECT" }
  | { type: "UPDATE_BALANCE"; payload: HbarBalance }
  | { type: "ADD_MANDATE"; payload: MandateRecord }
  | { type: "REVOKE_MANDATE"; payload: string }
  | { type: "LOAD_MANDATES"; payload: MandateRecord[] }
  | { type: "SET_NETWORK"; payload: "testnet" | "mainnet" };

interface WalletContextValue extends WalletState {
  connect: (provider: WalletProvider) => Promise<void>;
  disconnect: () => void;
  signMandate: (purpose: string, maxSpendHbar: string) => void;
  revokeMandate: (mandateId: string) => void;
  refreshBalance: () => Promise<void>;
}

// ============================================
// Initial State
// ============================================

const initialState: WalletState = {
  provider: null,
  accountId: null,
  balance: null,
  isConnected: false,
  isConnecting: false,
  network: (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") || "testnet",
  connectionError: null,
  mandates: [],
  availableWallets: [],
};

// ============================================
// Reducer
// ============================================

function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "CONNECT_START":
      return {
        ...state,
        isConnecting: true,
        provider: action.payload,
        connectionError: null,
      };

    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnected: true,
        isConnecting: false,
        accountId: action.payload.accountId,
        network: action.payload.network,
        provider: action.payload.provider,
        connectionError: null,
      };

    case "CONNECT_ERROR":
      return {
        ...state,
        isConnecting: false,
        isConnected: false,
        connectionError: action.payload,
      };

    case "DISCONNECT":
      return {
        ...state,
        isConnected: false,
        accountId: null,
        balance: null,
        provider: null,
      };

    case "UPDATE_BALANCE":
      return { ...state, balance: action.payload };

    case "ADD_MANDATE":
      return { ...state, mandates: [...state.mandates, action.payload] };

    case "REVOKE_MANDATE":
      return {
        ...state,
        mandates: state.mandates.filter((m) => m.mandateId !== action.payload),
      };

    case "LOAD_MANDATES":
      return { ...state, mandates: action.payload };

    case "SET_NETWORK":
      return { ...state, network: action.payload };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Detect available wallets on mount
  useEffect(() => {
    getAvailableWallets(); // Side-effect: verifies wallet extensions are present
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load persisted mandates
  useEffect(() => {
    const mandates = loadMandates();
    dispatch({ type: "LOAD_MANDATES", payload: mandates });
  }, []);

  const connect = useCallback(async (provider: WalletProvider) => {
    dispatch({ type: "CONNECT_START", payload: provider });

    try {
      const { accountId, network } = await connectWallet(provider);
      dispatch({
        type: "CONNECT_SUCCESS",
        payload: { accountId, network, provider },
      });

      // TODO: Fetch initial balance from mirror node
    } catch (error) {
      dispatch({
        type: "CONNECT_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to connect wallet",
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (state.provider) {
      disconnectWallet(state.provider);
    }
    dispatch({ type: "DISCONNECT" });
  }, [state.provider]);

  const signMandate = useCallback(
    (purpose: string, maxSpendHbar: string) => {
      if (!state.accountId) return;

      const mandate: MandateRecord = {
        mandateId: `mandate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        purpose,
        maxSpendHbar,
        expiresAt: null, // No expiry by default
        signedAt: new Date().toISOString(),
        signature: `signed-by-${state.accountId}`, // Placeholder — real signature from wallet in production
      };

      saveMandate(mandate);
      dispatch({ type: "ADD_MANDATE", payload: mandate });
    },
    [state.accountId]
  );

  const revokeMandateCallback = useCallback((mandateId: string) => {
    removeMandate(mandateId);
    dispatch({ type: "REVOKE_MANDATE", payload: mandateId });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!state.accountId) return;

    try {
      const mirrorUrl =
        state.network === "mainnet"
          ? "https://mainnet-public.mirrornode.hedera.com"
          : "https://testnet.mirrornode.hedera.com";

      const response = await fetch(
        `${mirrorUrl}/api/v1/accounts/${state.accountId}`
      );
      const data = await response.json();

      const tinybar = data.balance?.balance ?? "0";
      const hbar = (BigInt(tinybar) / BigInt(100_000_000)).toString();
      const usd = Number(hbar) * 0.08; // Approximate HBAR→USD

      dispatch({
        type: "UPDATE_BALANCE",
        payload: { tinybar, hbar, usd },
      });
    } catch (error) {
      console.error("Failed to refresh balance:", error);
    }
  }, [state.accountId, state.network]);

  const value: WalletContextValue = {
    ...state,
    availableWallets: getAvailableWallets(),
    connect,
    disconnect,
    signMandate,
    revokeMandate: revokeMandateCallback,
    refreshBalance,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletContextProvider");
  }
  return context;
}

export { WalletContext };
