"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatTimestamp } from "@/lib/utils/format";

const MOCK_DETAIL = {
  groupId: "gb-001",
  productName: "Nike Air Max 90",
  productImageCid: "bafybeig...",
  escrowContractId: "0.0.5000001",
  totalAmountHbar: "15000000000",
  perPersonAmountHbar: "5000000000",
  participantCount: 3,
  currentContributors: 1,
  currentContributionsHbar: "5000000000",
  status: "funding" as const,
  fullyFunded: false,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  participants: [
    { accountId: "0.0.1234567", contributed: true, amountHbar: "5000000000", contributedAt: new Date().toISOString() },
    { accountId: "0.0.7654321", contributed: false, amountHbar: "0", contributedAt: null },
    { accountId: "0.0.9876543", contributed: false, amountHbar: "0", contributedAt: null },
  ],
};

export default function GroupBuyDetailPage() {
  const [isContributing, setIsContributing] = useState(false);
  const group = MOCK_DETAIL;

  const progress =
    (Number(group.currentContributionsHbar) / Number(group.totalAmountHbar)) * 100;

  async function handleContribute() {
    setIsContributing(true);
    // In production: sign transaction via wallet, call escrow contract
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsContributing(false);
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Group Buy
      </h1>

      {/* Product */}
      <Card variant="glass" className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] flex items-center justify-center">
            📦
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {group.productName}
            </p>
            <Badge variant={group.status === "funding" ? "warning" : "success"} size="sm">
              {group.status}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Funding progress */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Funding Progress
        </h3>
        <div className="h-3 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {Number(group.currentContributionsHbar).toLocaleString()} ℏ raised
          </span>
          <span className="text-[var(--text-primary)]">
            {Number(group.totalAmountHbar).toLocaleString()} ℏ goal
          </span>
        </div>
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>
            {group.currentContributors}/{group.participantCount} contributors
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
      </Card>

      {/* Contributors */}
      <Card variant="flat" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Contributors
        </h3>
        {group.participants.map((p, i) => (
          <div
            key={p.accountId}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  p.contributed ? "bg-[var(--accent)]" : "bg-[var(--text-muted)]"
                }`}
              />
              <span className="text-[var(--text-secondary)] font-mono">
                {p.accountId}
              </span>
              {i === 0 && (
                <Badge variant="default" size="sm">
                  Creator
                </Badge>
              )}
            </div>
            <span className="text-[var(--text-primary)]">
              {p.contributed ? "✓" : "—"}
            </span>
          </div>
        ))}
      </Card>

      {/* Info */}
      <Card variant="flat" className="p-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Per Person</span>
          <span>{Number(group.perPersonAmountHbar).toLocaleString()} ℏ</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Escrow Contract</span>
          <span className="font-mono">{group.escrowContractId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">Expires</span>
          <span>{formatTimestamp(group.expiresAt)}</span>
        </div>
      </Card>

      {/* Contribute */}
      {group.status === "funding" && (
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          loading={isContributing}
          onClick={handleContribute}
        >
          Contribute {Number(group.perPersonAmountHbar).toLocaleString()} ℏ
        </Button>
      )}

      {/* Share invite */}
      <Button
        variant="glass"
        className="w-full"
        onClick={() =>
          navigator.clipboard.writeText(
            `https://dora.ai/groupbuy/${group.groupId}`
          )
        }
      >
        📋 Copy Invite Link
      </Button>
    </div>
  );
}
