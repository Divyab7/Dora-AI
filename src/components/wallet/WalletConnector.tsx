"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { WalletProvider } from "@/types/wallet";
import { getAvailableWallets } from "@/lib/hedera/wallet";

/**
 * Polls for wallet extensions every second.
 * HashPack and Blade inject into window asynchronously,
 * so we need to keep checking until they appear.
 */
function useWalletDetection() {
  const [available, setAvailable] = useState<WalletProvider[]>([]);
  const [checking, setChecking] = useState(true);

  const detect = useCallback(() => {
    const found = getAvailableWallets();
    setAvailable(found);
    return found;
  }, []);

  useEffect(() => {
    // Check immediately
    const found = detect();
    if (found.length > 0) {
      setChecking(false);
    }

    // Poll every 1s for 10s until wallets found
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const foundNow = detect();
      if (foundNow.length > 0 || attempts >= 10) {
        clearInterval(interval);
        setChecking(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [detect]);

  return { available, checking };
}

export function WalletConnector() {
  const { connect, isConnecting, connectionError, isConnected, accountId, disconnect } = useWallet();
  const { available, checking } = useWalletDetection();
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider | null>(null);

  async function handleConnect(provider: WalletProvider) {
    setSelectedProvider(provider);
    try {
      await connect(provider);
    } catch {
      // Error handled by context
    }
    setSelectedProvider(null);
  }

  // Connected state
  if (isConnected && accountId) {
    return (
      <Card variant="glass" className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[var(--accent)] animate-pulse-green" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Wallet Connected</p>
            <p className="text-xs text-[var(--text-muted)] font-mono">{accountId}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={disconnect}>
          Disconnect
        </Button>
      </Card>
    );
  }

  // Checking for wallets
  if (checking && available.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-[var(--text-muted)]">
          <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          Detecting wallet extensions...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {connectionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {connectionError}
        </div>
      )}

      {/* No wallets found */}
      {available.length === 0 && !checking && (
        <div className="p-5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-3 text-center">
          <p className="text-sm text-yellow-400 font-medium">Wallet setup required</p>
          {!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ? (
            <p className="text-xs text-yellow-400/80 text-left">
              Add <code className="text-yellow-200">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> to{" "}
              <code className="text-yellow-200">.env.local</code> (free at cloud.walletconnect.com), then
              restart the dev server. Also install the HashPack extension.
            </p>
          ) : (
            <p className="text-xs text-yellow-400/70">
              Install HashPack or Blade wallet extension, then refresh this page.
            </p>
          )}
          <div className="flex gap-2 justify-center pt-1">
            <a
              href="https://www.hashpack.app/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-xl bg-white/10 text-[var(--text-primary)] hover:bg-white/20 transition-colors"
            >
              Install HashPack →
            </a>
            <a
              href="https://www.bladewallet.io/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-xl bg-white/10 text-[var(--text-primary)] hover:bg-white/20 transition-colors"
            >
              Install Blade →
            </a>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            🔄 Refresh after installing
          </Button>
        </div>
      )}

      {/* HashPack */}
      {available.includes("hashpack") && (
        <button
          onClick={() => handleConnect("hashpack")}
          disabled={isConnecting}
          className="w-full glass-card p-4 flex items-center gap-4 hover:border-[var(--border-hover)] transition-all duration-200 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
            🦊
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">HashPack</p>
            <p className="text-xs text-[var(--text-muted)]">Popular Hedera wallet</p>
          </div>
          {isConnecting && selectedProvider === "hashpack" ? (
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[var(--accent)] text-sm font-medium">Connect →</span>
          )}
        </button>
      )}

      {/* Blade */}
      {available.includes("blade") && (
        <button
          onClick={() => handleConnect("blade")}
          disabled={isConnecting}
          className="w-full glass-card p-4 flex items-center gap-4 hover:border-[var(--border-hover)] transition-all duration-200 disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
            ⚔️
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">Blade Wallet</p>
            <p className="text-xs text-[var(--text-muted)]">Web3 Hedera wallet</p>
          </div>
          {isConnecting && selectedProvider === "blade" ? (
            <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="text-[var(--accent)] text-sm font-medium">Connect →</span>
          )}
        </button>
      )}
    </div>
  );
}
