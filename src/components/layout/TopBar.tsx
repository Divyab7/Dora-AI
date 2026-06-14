"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { useCart } from "@/contexts/CartContext";
import { useUI } from "@/contexts/UIContext";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const router = useRouter();
  const { isConnected, accountId, balance } = useWallet();
  const { summary } = useCart();
  const { theme, setTheme } = useUI();

  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--glass-border)] backdrop-blur-xl">
      <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#00FF9D" strokeWidth="2" />
              <circle cx="20" cy="20" r="3" fill="#00FF9D" />
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)] hidden sm:inline">
            Dora<span className="text-[var(--accent)]">AI</span>
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Wallet status */}
          {isConnected ? (
            <button
              onClick={() => router.push("/wallet")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-overlay)] transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
              <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">
                {accountId?.slice(0, 6)}...{accountId?.slice(-4)}
              </span>
              {balance && (
                <span className="text-xs text-[var(--text-primary)] font-medium hidden md:inline">
                  {Number(balance.hbar).toFixed(2)} ℏ
                </span>
              )}
            </button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => router.push("/connect")}>
              Connect
            </Button>
          )}

          {/* Cart */}
          <button
            onClick={() => router.push("/cart")}
            className="relative p-2 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {summary.itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--accent)] text-[10px] font-bold text-black flex items-center justify-center px-1">
                {summary.itemCount}
              </span>
            )}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-xl hover:bg-[var(--surface-elevated)] transition-colors text-[var(--text-muted)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
