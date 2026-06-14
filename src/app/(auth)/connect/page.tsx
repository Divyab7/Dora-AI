"use client";

import { WalletConnector } from "@/components/wallet/WalletConnector";

export default function ConnectPage() {
  return (
    <div className="glass-card p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Connect Wallet
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Choose your Hedera wallet to start shopping with HBAR
        </p>
      </div>
      <WalletConnector />
    </div>
  );
}
