// ============================================
// Wallet Types
// ============================================

export type WalletProvider = "hashpack" | "blade";

export interface WalletConnection {
  provider: WalletProvider;
  accountId: string;
  network: "testnet" | "mainnet";
  connectedAt: string;
}

export interface HbarBalance {
  tinybar: string;
  hbar: string;
  usd: number; // approximate
}

export interface MandateRecord {
  mandateId: string;
  purpose: string;
  maxSpendHbar: string;
  expiresAt: string | null; // null = no expiry
  signedAt: string;
  signature: string; // cryptographic signature
}
