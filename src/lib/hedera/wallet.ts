"use client";

/**
 * Hedera Wallet Integration — HashPack (HashConnect) & Blade Wallet
 */

import type { WalletProvider } from "@/types/wallet";
import { importWithChunkRetry } from "@/lib/utils/chunk-reload";

declare global {
  interface Window {
    hashpack?: {
      request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
      connect?: () => Promise<{ accountIds?: string[]; accountId?: string }>;
    };
    bladeWallet?: {
      connect: () => Promise<{ accountId: string }>;
    };
  }
}

async function loadHashConnect() {
  return importWithChunkRetry(() => import("./hashconnect-client"));
}

/** Warm the HashConnect lazy chunk after mount (client-only). */
export function preloadHashConnect(): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) return;
  void importWithChunkRetry(() => import("./hashconnect-client")).catch(() => {});
}

export function detectWallets(): { hashpack: boolean; blade: boolean } {
  if (typeof window === "undefined") {
    return { hashpack: false, blade: false };
  }
  return {
    hashpack: Boolean(window.hashpack?.request || window.hashpack?.connect),
    blade: typeof window.bladeWallet?.connect === "function",
  };
}

export function getAvailableWallets(): WalletProvider[] {
  if (typeof window === "undefined") return [];

  const detected = detectWallets();
  const available: WalletProvider[] = [];

  available.push("hashpack");
  if (detected.blade) available.push("blade");

  return available;
}

async function connectHashPackLegacy(): Promise<{ accountId: string; network: "testnet" | "mainnet" }> {
  const provider = window.hashpack;
  if (!provider) {
    throw new Error("HashPack extension not detected.");
  }

  const network =
    (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") || "testnet";

  if (provider.connect) {
    const result = await provider.connect();
    const id = result.accountIds?.[0] ?? result.accountId;
    if (!id) throw new Error("No accounts returned from HashPack");
    return { accountId: id, network };
  }

  if (provider.request) {
    const result = (await provider.request({
      method: "connect",
      params: { network },
    })) as { accountIds?: string[] };
    if (!result.accountIds?.[0]) throw new Error("No accounts found in HashPack");
    return { accountId: result.accountIds[0], network };
  }

  throw new Error("HashPack API not supported. Update the extension or use HashConnect.");
}

export async function connectHashPack(): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  if (typeof window === "undefined") {
    throw new Error("Wallet connection is only available in the browser.");
  }

  const detected = detectWallets();

  if (detected.hashpack) {
    try {
      return await connectHashPackLegacy();
    } catch (legacyError) {
      if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
        throw legacyError;
      }
    }
  }

  if (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    const { connectViaHashConnect } = await loadHashConnect();
    return connectViaHashConnect();
  }

  throw new Error(
    "WalletConnect Project ID is not configured. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to your environment (free at cloud.walletconnect.com) and ensure HashPack is installed."
  );
}

export async function connectBlade(): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  const provider = window.bladeWallet;
  if (!provider) {
    throw new Error("Blade Wallet not detected. Install the Blade browser extension.");
  }

  const network =
    (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") || "testnet";

  const result = await provider.connect();
  return { accountId: result.accountId, network };
}

export async function connectWallet(provider: WalletProvider): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  switch (provider) {
    case "hashpack":
      return connectHashPack();
    case "blade":
      return connectBlade();
    default:
      throw new Error(`Unsupported wallet: ${provider}`);
  }
}

export async function disconnectWallet(provider: WalletProvider): Promise<void> {
  if (provider === "hashpack" && process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    try {
      const { disconnectHashConnect } = await loadHashConnect();
      await disconnectHashConnect();
    } catch {
      // ignore
    }
  }

  if (provider === "hashpack" && window.hashpack?.request) {
    await window.hashpack.request({ method: "disconnect", params: {} }).catch(() => {});
  }
}

export async function restoreWalletSession(): Promise<{
  accountId: string;
  provider: WalletProvider;
} | null> {
  if (typeof window === "undefined") return null;

  if (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    try {
      const { restoreHashConnectSession } = await loadHashConnect();
      const accountId = await restoreHashConnectSession();
      if (accountId) return { accountId, provider: "hashpack" };
    } catch {
      // not configured
    }
  }

  return null;
}
