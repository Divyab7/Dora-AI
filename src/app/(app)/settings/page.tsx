"use client";

import { useState } from "react";
import { useUI } from "@/contexts/UIContext";
import { useWallet } from "@/contexts/WalletContext";
import { useSpendingLimit } from "@/contexts/SpendingLimitContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";

export default function SettingsPage() {
  const { theme, setTheme } = useUI();
  const { isConnected, accountId, disconnect } = useWallet();
  const {
    dailyLimit,
    perTransactionLimit,
    setDailyLimit,
    setPerTransactionLimit,
    dailySpent,
    isOverDailyLimit,
  } = useSpendingLimit();

  const [dailyLimitLocal, setDailyLimitLocal] = useState(dailyLimit);
  const [perTxLimitLocal, setPerTxLimitLocal] = useState(perTransactionLimit);

  function handleSaveLimits() {
    setDailyLimit(dailyLimitLocal);
    setPerTransactionLimit(perTxLimitLocal);
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>

      {/* Theme */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-primary)]">Dark Mode</p>
            <p className="text-xs text-[var(--text-muted)]">
              Easier on the eyes, better for OLED
            </p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) =>
              setTheme(checked ? "dark" : "light")
            }
          />
        </div>
      </Card>

      {/* Wallet */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Wallet</h3>
        {isConnected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Connected</span>
              <span className="text-[var(--text-primary)] font-mono">
                {accountId?.slice(0, 12)}...
              </span>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={disconnect}>
              Disconnect Wallet
            </Button>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No wallet connected</p>
        )}
      </Card>

      {/* Spending Limits */}
      <Card variant="glass" className="p-4 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Spending Limits
        </h3>

        {isOverDailyLimit && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            Daily limit exceeded. New purchases blocked until reset.
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Daily Limit</span>
            <span className="text-[var(--text-primary)]">
              {dailyLimitLocal} ℏ
            </span>
          </div>
          <Slider
            value={[dailyLimitLocal]}
            onValueChange={([v]) => setDailyLimitLocal(v)}
            min={10}
            max={1000}
            step={10}
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)]">
            <span>10 ℏ</span>
            <span>
              Spent today: {dailySpent.toFixed(1)} ℏ
            </span>
            <span>1000 ℏ</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              Per-Transaction Limit
            </span>
            <span className="text-[var(--text-primary)]">
              {perTxLimitLocal} ℏ
            </span>
          </div>
          <Slider
            value={[perTxLimitLocal]}
            onValueChange={([v]) => setPerTxLimitLocal(v)}
            min={5}
            max={500}
            step={5}
          />
        </div>

        <Button variant="accent" size="sm" onClick={handleSaveLimits}>
          Save Limits
        </Button>
      </Card>

      {/* About */}
      <Card variant="flat" className="p-4 space-y-2 text-xs text-[var(--text-muted)]">
        <p>Dora-AI v0.1.0</p>
        <p>Powered by Hedera · OpenAI · IPFS</p>
        <p>All transactions logged to HCS · Human-in-the-loop safety</p>
      </Card>
    </div>
  );
}
