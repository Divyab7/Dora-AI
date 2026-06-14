"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useWallet } from "@/contexts/WalletContext";
import { useSpendingLimit } from "@/contexts/SpendingLimitContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApprovalGate } from "@/components/shared/ApprovalGate";
import { formatPrice } from "@/lib/utils/format";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, summary, clearCart } = useCart();
  const { isConnected, connect } = useWallet();
  const { checkLimits, addSpent } = useSpendingLimit();
  const { stage, startCheckout, requestApproval, approve, processing, complete, fail, reset } = useCheckout();
  const [showApproval, setShowApproval] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleStartCheckout() {
    if (!isConnected) {
      connect("hashpack");
      return;
    }

    const limitCheck = checkLimits(Number(summary.totalHbar) / 100_000_000);
    if (!limitCheck.allowed) {
      fail(limitCheck.reason || "Spending limit exceeded");
      return;
    }

    startCheckout(summary.paymentMethod);
    requestApproval();
    setShowApproval(true);
  }

  async function handleApprove() {
    setShowApproval(false);
    approve();
    setIsProcessing(true);
    processing();

    try {
      // Simulate checkout API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const txId = `0.0.${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      complete({
        transactionId: txId,
        status: "success",
        timestamp: new Date().toISOString(),
        hcsSequenceNumber: Math.floor(Math.random() * 100000),
      });

      addSpent(Number(summary.totalHbar) / 100_000_000);
      clearCart();

      router.push(`/orders/${txId}`);
    } catch (error) {
      fail(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  }

  if (items.length === 0 && stage !== "complete") {
    router.push("/cart");
    return null;
  }

  if (stage === "complete") {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="glass-card p-8 space-y-4">
          <div className="text-5xl animate-success-check">✅</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Payment Successful!
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Your order has been placed and logged to Hedera.
          </p>
          <Button variant="accent" onClick={() => router.push("/orders")}>
            View Orders
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "failed") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <div className="glass-card p-8 space-y-4 text-center">
          <div className="text-4xl">❌</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Payment Failed
          </h1>
          <Button variant="accent" onClick={reset}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Checkout</h1>

      {/* Order summary */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Order Summary
        </h3>
        {items.map((item) => (
          <div key={item.cartItemId} className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">
              {item.productName} × {item.quantity}
            </span>
            <span className="text-[var(--text-primary)]">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Subtotal</span>
            <span>{formatPrice(summary.subtotalUsd)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Fee (1%)</span>
            <span>{formatPrice(summary.transactionFee)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-[var(--border)]">
            <span>Total</span>
            <span className="text-[var(--accent)]">
              {formatPrice(summary.totalUsd)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] text-right">
            ≈ {Number(summary.totalHbar).toLocaleString()} ℏ
          </p>
        </div>
      </Card>

      {/* Payment method badge */}
      <div className="flex items-center gap-2">
        <Badge variant="accent">
          {summary.paymentMethod === "full"
            ? "Pay in Full"
            : summary.paymentMethod === "payin3"
            ? "Pay in 3"
            : "Group Buy"}
        </Badge>
        {!isConnected && (
          <Badge variant="warning">Wallet not connected</Badge>
        )}
      </div>

      {/* Pay button */}
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={handleStartCheckout}
        loading={isProcessing}
      >
        {isConnected
          ? `Pay ${formatPrice(summary.totalUsd)}`
          : "Connect Wallet to Pay"}
      </Button>

      {/* Approval Gate (modal) */}
      <ApprovalGate
        open={showApproval}
        items={items.map((i) => ({
          name: i.productName,
          price: i.price * i.quantity,
          retailer: i.retailerName,
        }))}
        totalUsd={summary.totalUsd}
        totalHbar={summary.totalHbar}
        fees={{
          transactionFee: summary.transactionFee,
          payIn3Fee: summary.payIn3Fee || undefined,
        }}
        onApprove={handleApprove}
        onReject={() => {
          setShowApproval(false);
          reset();
        }}
      />
    </div>
  );
}
