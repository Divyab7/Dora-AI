"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatHbar } from "@/lib/utils/format";
import { getApprovalOffset, getApprovalDelayMs } from "@/lib/security/approvals";

export interface ApprovalGateProps {
  open: boolean;
  title?: string;
  items: Array<{ name: string; price: number; retailer: string }>;
  currency: string;
  total: number;
  totalHbar: string;
  fees: { transactionFee: number; payIn3Fee?: number };
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalGate({
  open,
  title = "Approve Purchase",
  items,
  currency,
  total,
  totalHbar,
  fees,
  onApprove,
  onReject,
}: ApprovalGateProps) {
  const [canApprove, setCanApprove] = useState(false);
  const [offset] = useState(getApprovalOffset);
  const appearanceTime = useRef(Date.now());

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
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between text-xs text-[var(--text-secondary)] gap-2"
              >
                <span className="line-clamp-1">
                  {item.name} · {item.retailer}
                </span>
                <span className="flex-shrink-0">{formatPrice(item.price, currency)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border)] pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Transaction Fee (1%)</span>
              <span>{formatPrice(fees.transactionFee, currency)}</span>
            </div>
            {fees.payIn3Fee ? (
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>PayIn3 Fee (2%)</span>
                <span>{formatPrice(fees.payIn3Fee, currency)}</span>
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Payment amount</p>
            <p className="text-2xl font-bold text-[var(--accent)] text-center">
              {formatHbar(totalHbar)}
            </p>
            <p className="text-xs text-[var(--text-muted)] text-center mt-1">
              ≈ {formatPrice(total, currency)}
            </p>
          </div>

          <div
            className="pt-2"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          >
            <Button
              variant="accent"
              className="w-full"
              disabled={!canApprove}
              onClick={onApprove}
            >
              {canApprove ? `✓ Approve & Pay ${formatHbar(totalHbar)}` : "Review details..."}
            </Button>
          </div>

          <Button variant="ghost" size="sm" className="w-full" onClick={onReject}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
