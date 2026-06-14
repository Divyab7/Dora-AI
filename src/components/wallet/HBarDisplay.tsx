"use client";

import { useWallet } from "@/contexts/WalletContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function HBarDisplay() {
  const { balance, refreshBalance, isConnected } = useWallet();

  if (!isConnected) {
    return (
      <Card variant="glass" className="p-4">
        <p className="text-sm text-[var(--text-muted)] text-center">
          Connect wallet to view balance
        </p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
          Balance
        </p>
        <Button variant="ghost" size="sm" onClick={refreshBalance}>
          ↻
        </Button>
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)]">
          {balance ? Number(balance.hbar).toFixed(4) : "—"} ℏ
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          ~${balance ? balance.usd.toFixed(2) : "0.00"} USD
        </p>
      </div>
    </Card>
  );
}
