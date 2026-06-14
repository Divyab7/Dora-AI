"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const router = useRouter();
  const { isConnected, balance } = useWallet();

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Welcome to Dora<span className="text-[var(--accent)]">AI</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Snap any product. Compare prices. Pay with HBAR.
            </p>
          </div>
          {isConnected && balance && (
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">Balance</p>
              <p className="text-lg font-bold text-[var(--accent)]">
                {Number(balance.hbar).toFixed(2)} ℏ
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card hover className="p-4 text-center space-y-2" onClick={() => router.push("/agent")}>
          <span className="text-3xl">💬</span>
          <p className="text-sm font-medium text-[var(--text-primary)]">Dora Agent</p>
          <p className="text-xs text-[var(--text-muted)]">Chat & pay in HBAR</p>
        </Card>
        <Card hover className="p-4 text-center space-y-2" onClick={() => router.push("/scan")}>
          <span className="text-3xl">📸</span>
          <p className="text-sm font-medium text-[var(--text-primary)]">Visual Search</p>
          <p className="text-xs text-[var(--text-muted)]">Snap & find any item</p>
        </Card>
        <Card hover className="p-4 text-center space-y-2" onClick={() => router.push("/cart")}>
          <span className="text-3xl">🛒</span>
          <p className="text-sm font-medium text-[var(--text-primary)]">Cart</p>
          <p className="text-xs text-[var(--text-muted)]">View & checkout</p>
        </Card>
        <Card hover className="p-4 text-center space-y-2" onClick={() => router.push("/orders")}>
          <span className="text-3xl">📋</span>
          <p className="text-sm font-medium text-[var(--text-primary)]">Orders</p>
          <p className="text-xs text-[var(--text-muted)]">Track purchases</p>
        </Card>
        <Card hover className="p-4 text-center space-y-2" onClick={() => router.push("/groupbuy")}>
          <span className="text-3xl">👥</span>
          <p className="text-sm font-medium text-[var(--text-primary)]">Group Buy</p>
          <p className="text-xs text-[var(--text-muted)]">Split with friends</p>
        </Card>
      </div>

      {/* Wallet prompt */}
      {!isConnected && (
        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Connect your wallet</p>
              <p className="text-xs text-[var(--text-muted)]">Pay with HBAR in seconds</p>
            </div>
            <Button variant="accent" size="sm" onClick={() => router.push("/connect")}>
              Connect
            </Button>
          </div>
        </Card>
      )}

      {/* Features */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-3"><p className="text-xs text-[var(--text-muted)]">⚡ Pay in 3</p></div>
        <div className="p-3"><p className="text-xs text-[var(--text-muted)]">🔒 Escrow protected</p></div>
        <div className="p-3"><p className="text-xs text-[var(--text-muted)]">📡 HCS logged</p></div>
      </div>
    </div>
  );
}
