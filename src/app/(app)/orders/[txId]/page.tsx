"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatTimestamp } from "@/lib/utils/format";
import { isWithinCancellationWindow, getCancellationDeadline } from "@/lib/security/approvals";

const MOCK_DETAIL = {
  txId: "0.0.12345@1234567890-000000000",
  status: "completed",
  productName: "Nike Air Max 90",
  brand: "Nike",
  retailer: "StockX",
  price: 11500,
  priceHbar: "1437500000",
  quantity: 1,
  paymentMethod: "full" as const,
  transactionFee: 115,
  total: 11615,
  timestamp: "2026-06-14T10:30:00Z",
  hcsSequenceNumber: 42,
  installments: null as null | Array<{
    number: number;
    amountHbar: string;
    dueDate: string;
    status: "paid" | "scheduled";
    transactionId: string | null;
  }>,
};

export default function OrderDetailPage() {
  const [showCancel, setShowCancel] = useState(false);
  const order = MOCK_DETAIL; // In production, fetch by txId

  const canCancel = isWithinCancellationWindow(order.timestamp);
  const cancelDeadline = getCancellationDeadline(order.timestamp);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Order Details
        </h1>
        <Badge variant="success">{order.status}</Badge>
      </div>

      {/* Product info */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] flex items-center justify-center">
            📦
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {order.productName}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {order.brand} · {order.retailer}
            </p>
          </div>
        </div>
      </Card>

      {/* Payment details */}
      <Card variant="glass" className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Item Price</span>
          <span>{formatPrice(order.price)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Transaction Fee</span>
          <span>{formatPrice(order.transactionFee)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-2 border-t border-[var(--border)]">
          <span>Total</span>
          <span className="text-[var(--accent)]">{formatPrice(order.total)}</span>
        </div>
      </Card>

      {/* Transaction info */}
      <Card variant="flat" className="p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Transaction ID</span>
          <span className="text-[var(--text-primary)] font-mono">
            {order.txId.slice(0, 16)}...
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Date</span>
          <span>{formatTimestamp(order.timestamp)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">HCS Log</span>
          <span>Sequence #{order.hcsSequenceNumber}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">Payment Method</span>
          <span>
            {order.paymentMethod === "full"
              ? "Pay in Full"
              : order.paymentMethod === "payin3"
              ? "Pay in 3"
              : "Group Buy"}
          </span>
        </div>
      </Card>

      {/* Installment tracker (if PayIn3) */}
      {order.installments && (
        <Card variant="glass" className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            PayIn3 Installments
          </h3>
          {order.installments.map((inst) => (
            <div
              key={inst.number}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    inst.status === "paid"
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                  }`}
                >
                  {inst.status === "paid" ? "✓" : inst.number}
                </div>
                <span className="text-[var(--text-secondary)]">
                  Installment {inst.number}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[var(--text-primary)]">
                  {Number(inst.amountHbar).toLocaleString()} ℏ
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  {inst.status === "paid"
                    ? "Paid"
                    : `Due ${formatTimestamp(inst.dueDate)}`}
                </p>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Cancellation */}
      {canCancel && (
        <div>
          {!showCancel ? (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setShowCancel(true)}
            >
              Cancel Order
            </Button>
          ) : (
            <Card variant="glass" className="p-4 space-y-3 border border-red-500/20">
              <p className="text-sm text-red-400">
                Cancel this order? You have until{" "}
                {new Date(cancelDeadline).toLocaleString()} to cancel.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" className="flex-1">
                  Confirm Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowCancel(false)}
                >
                  Keep Order
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
