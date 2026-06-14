"use client";

import { HashConnect, HashConnectConnectionState } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";

let instance: HashConnect | null = null;
let initPromise: Promise<HashConnect> | null = null;

function getProjectId(): string {
  const id = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!id?.trim()) {
    throw new Error(
      "WalletConnect Project ID is not configured. Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to .env.local (create free at cloud.walletconnect.com), then restart the dev server."
    );
  }
  return id.trim();
}

function getLedgerId(): LedgerId {
  const net = process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet";
  return net === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
}

function getAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function getHashConnect(): Promise<HashConnect> {
  if (instance) return instance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const hc = new HashConnect(
      getLedgerId(),
      getProjectId(),
      {
        name: "Dora AI",
        description: "Visual shopping with HBAR",
        icons: [`${getAppOrigin()}/favicon.ico`],
        url: getAppOrigin(),
      },
      false
    );
    await hc.init();
    instance = hc;
    return hc;
  })();

  return initPromise;
}

export async function connectViaHashConnect(): Promise<{
  accountId: string;
  network: "testnet" | "mainnet";
}> {
  const hc = await getHashConnect();
  const network =
    (process.env.NEXT_PUBLIC_HEDERA_NETWORK as "testnet" | "mainnet") || "testnet";

  if (hc.connectedAccountIds.length > 0) {
    return { accountId: hc.connectedAccountIds[0].toString(), network };
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Wallet connection timed out. Open HashPack and approve the connection."));
    }, 120_000);

    let settled = false;
    const finish = (accountId: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ accountId, network });
    };

    hc.pairingEvent.on((session) => {
      const id =
        session.accountIds?.[0]?.toString() ?? hc.connectedAccountIds[0]?.toString();
      if (id) finish(id);
    });

    hc.connectionStatusChangeEvent.on((status) => {
      if (
        status === HashConnectConnectionState.Paired &&
        hc.connectedAccountIds.length > 0
      ) {
        finish(hc.connectedAccountIds[0].toString());
      }
    });

    hc.openPairingModal("dark").catch((err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}

export async function restoreHashConnectSession(): Promise<string | null> {
  try {
    const hc = await getHashConnect();
    if (hc.connectedAccountIds.length > 0) {
      return hc.connectedAccountIds[0].toString();
    }
  } catch {
    // Project ID not configured or init failed
  }
  return null;
}

export async function disconnectHashConnect(): Promise<void> {
  if (instance) {
    await instance.disconnect();
  }
}
