/**
 * Hedera Wallet Integration — HashPack & Blade Wallet
 *
 * Both wallets are browser extensions that inject a provider
 * into the window object. This module abstracts the connection
 * and signing flows for both providers.
 */

import type { WalletProvider } from "@/types/wallet";

// ============================================
// Provider Detection
// ============================================

export interface HashPackProvider {
  request(args: { method: string; params: unknown }): Promise<unknown>;
}

export interface BladeProvider {
  connect(): Promise<{ accountId: string }>;
  signAndExecuteTransaction(
    transaction: Uint8Array
  ): Promise<{ transactionId: string }>;
}

declare global {
  interface Window {
    hashpack?: HashPackProvider;
    bladeWallet?: BladeProvider;
  }
}

export function detectWallets(): {
  hashpack: boolean;
  blade: boolean;
} {
  if (typeof window === "undefined") {
    return { hashpack: false, blade: false };
  }

  return {
    hashpack: typeof window.hashpack !== "undefined",
    blade: typeof window.bladeWallet !== "undefined",
  };
}

export function getAvailableWallets(): WalletProvider[] {
  const detected = detectWallets();
  const available: WalletProvider[] = [];
  if (detected.hashpack) available.push("hashpack");
  if (detected.blade) available.push("blade");
  return available;
}

// ============================================
// HashPack Connection
// ============================================

export async function connectHashPack(): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  const provider = window.hashpack;
  if (!provider) {
    throw new Error(
      "HashPack wallet not detected. Please install the HashPack browser extension."
    );
  }

  try {
    const network =
      (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") ||
      "testnet";

    const result = (await provider.request({
      method: "connect",
      params: { network },
    })) as { accountIds: string[]; network: string };

    if (!result.accountIds || result.accountIds.length === 0) {
      throw new Error("No accounts found in HashPack wallet");
    }

    return {
      accountId: result.accountIds[0],
      network: result.network as "testnet" | "mainnet",
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to connect to HashPack wallet");
  }
}

// ============================================
// Blade Wallet Connection
// ============================================

export async function connectBlade(): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  const provider = window.bladeWallet;
  if (!provider) {
    throw new Error(
      "Blade Wallet not detected. Please install the Blade Wallet browser extension."
    );
  }

  try {
    const network =
      (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") ||
      "testnet";

    const result = await provider.connect();

    return {
      accountId: result.accountId,
      network,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to connect to Blade Wallet");
  }
}

// ============================================
// Unified Connection
// ============================================

export async function connectWallet(
  provider: WalletProvider
): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  switch (provider) {
    case "hashpack":
      return connectHashPack();
    case "blade":
      return connectBlade();
    default:
      throw new Error(`Unsupported wallet provider: ${provider}`);
  }
}

// ============================================
// Transaction Signing
// ============================================

export async function signTransaction(
  provider: WalletProvider,
  transactionBytes: Uint8Array
): Promise<Uint8Array> {
  switch (provider) {
    case "hashpack": {
      const hp = window.hashpack;
      if (!hp) throw new Error("HashPack not connected");

      const result = (await hp.request({
        method: "signTransaction",
        params: { transaction: transactionBytes },
      })) as { signedTransaction: Uint8Array };

      return result.signedTransaction;
    }

    case "blade": {
      const blade = window.bladeWallet;
      if (!blade) throw new Error("Blade Wallet not connected");

      // Blade signs AND executes in one call
      await blade.signAndExecuteTransaction(transactionBytes);
      // Return empty — Blade already submitted
      return new Uint8Array();
    }

    default:
      throw new Error(`Unsupported wallet provider: ${provider}`);
  }
}

// ============================================
// Disconnect
// ============================================

export function disconnectWallet(provider: WalletProvider): void {
  // HashPack: disconnect via request
  if (provider === "hashpack" && window.hashpack) {
    window.hashpack
      .request({ method: "disconnect", params: {} })
      .catch(console.error);
  }
  // Blade: no explicit disconnect — clear local state
}
