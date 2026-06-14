"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/format";
import { getApprovalOffset, getApprovalDelayMs } from "@/lib/security/approvals";

export interface ApprovalGateProps {
  open: boolean;
  title?: string;
  items: Array<{ name: string; price: number; retailer: string }>;
  totalUsd: number;
  totalHbar: string;
  fees: { transactionFee: number; payIn3Fee?: number };
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalGate({
  open,
  title = "Approve Purchase",
  items,
  totalUsd,
  totalHbar,
  fees,
  onApprove,
  onReject,
}: ApprovalGateProps) {
  const [canApprove, setCanApprove] = useState(false);
  const [offset] = useState(getApprovalOffset);
  const appearanceTime = useRef(Date.now());

  // Enforce minimum 2-second review period
  useEffect(() => {
    if (!open) {
      setCanApprove(false);
      return;
    }

    const delay = getApprovalDelayMs(appearanceTime.current);
    if (delay <= 0) {
      setCanApprove(true);
      return;
    }

    const timer = setTimeout(() => setCanApprove(true), delay);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-center">{title}</DialogTitle>
        <DialogDescription className="text-center">
          Human-in-the-loop confirmation required
        </DialogDescription>

        <div className="space-y-3 mt-2">
          {/* Item list */}
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-xs text-[var(--text-secondary)]"
              >
                <span>
                  {item.name} · {item.retailer}
                </span>
                <span>{formatPrice(item.price)}</span>
              </div>
            ))}
          </div>

          {/* Fee breakdown */}
          <div className="border-t border-[var(--border)] pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Transaction Fee (1%)</span>
              <span>{formatPrice(fees.transactionFee)}</span>
            </div>
            {fees.payIn3Fee ? (
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>PayIn3 Fee (2%)</span>
                <span>{formatPrice(fees.payIn3Fee)}</span>
              </div>
            ) : null}
          </div>

          {/* Total */}
          <div className="border-t border-[var(--border)] pt-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-[var(--text-primary)]">Total</span>
              <span className="text-[var(--accent)]">{formatPrice(totalUsd)}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] text-right">
              {Number(totalHbar).toLocaleString()} ℏ
            </p>
          </div>

          {/* Approval button with random offset (anti-clickjacking) */}
          <div
            className="pt-2"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          >
            <Button
              variant="accent"
              className="w-full"
              disabled={!canApprove}
              onClick={onApprove}
            >
              {canApprove ? "✓ Approve & Pay" : "Review details..."}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onReject}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
