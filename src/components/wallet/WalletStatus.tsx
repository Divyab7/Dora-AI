"use client";

import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";

export function WalletStatus() {
  const { isConnected, accountId, balance, isConnecting, connect } =
    useWallet();

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        Connecting...
      </div>
    );
  }

  if (!isConnected || !accountId) {
    return (
      <Button variant="accent" size="sm" onClick={() => connect("hashpack")}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {balance && (
        <div className="hidden md:block text-sm text-right">
          <p className="text-[var(--text-primary)] font-medium">
            {Number(balance.hbar).toFixed(2)} ℏ
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            ~${balance.usd.toFixed(2)}
          </p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-xs text-[var(--text-muted)] font-mono hidden md:inline">
          {accountId.slice(0, 8)}...
        </span>
      </div>
    </div>
  );
}
