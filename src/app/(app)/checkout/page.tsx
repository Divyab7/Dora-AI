"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useWallet } from "@/contexts/WalletContext";
import { useMarket } from "@/contexts/MarketContext";
import { useSpendingLimit } from "@/contexts/SpendingLimitContext";
import { useCheckout } from "@/contexts/CheckoutContext";
import { useUI } from "@/contexts/UIContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApprovalGate } from "@/components/shared/ApprovalGate";
import { formatPrice, formatHbar } from "@/lib/utils/format";
import { ROUTES } from "@/lib/utils/constants";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, summary, clearCart } = useCart();
  const { isConnected, connect, connectionError } = useWallet();
  const { market } = useMarket();
  const { addToast } = useUI();
  const { checkLimits, addSpent } = useSpendingLimit();
  const { stage, startCheckout, requestApproval, approve, processing, complete, fail, reset } = useCheckout();
  const [showApproval, setShowApproval] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const currency = summary.currency || market.currency;

  async function handleStartCheckout() {
    if (!isConnected) {
      try {
        await connect("hashpack");
      } catch {
        router.push(ROUTES.CONNECT);
        addToast({
          type: "info",
          message: "Connect your Hedera wallet to complete payment",
          duration: 4000,
        });
        return;
      }
    }

    const totalHbar = Number(summary.totalHbar) / 100_000_000;
    const limitCheck = checkLimits(totalHbar);
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
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Payment Successful!</h1>
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
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Payment Failed</h1>
          <Button variant="accent" onClick={reset}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Checkout</h1>

      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Order Summary</h3>
        <p className="text-xs text-[var(--text-muted)]">Prices in {currency} · {market.label}</p>
        {items.map((item) => (
          <div key={item.cartItemId} className="flex justify-between text-sm gap-2">
            <span className="text-[var(--text-secondary)] line-clamp-1">
              {item.productName} × {item.quantity}
            </span>
            <span className="text-[var(--text-primary)] flex-shrink-0">
              {formatPrice(item.price * item.quantity, item.currency || currency)}
            </span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Subtotal</span>
            <span>{formatPrice(summary.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Fee (1%)</span>
            <span>{formatPrice(summary.transactionFee, currency)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--text-muted)]">You pay</p>
              <p className="text-2xl font-bold text-[var(--accent)]">
                {formatHbar(summary.totalHbar)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">≈ {currency}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatPrice(summary.total, currency)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="accent">
          {summary.paymentMethod === "full" ? "Pay in Full" : summary.paymentMethod}
        </Badge>
        {!isConnected && <Badge variant="warning">Wallet not connected</Badge>}
      </div>

      {connectionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {connectionError}
        </div>
      )}

      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={handleStartCheckout}
        loading={isProcessing}
      >
        {isConnected
          ? `Pay ${formatHbar(summary.totalHbar)}`
          : "Connect Wallet to Pay"}
      </Button>

      <ApprovalGate
        open={showApproval}
        items={items.map((i) => ({
          name: i.productName,
          price: i.price * i.quantity,
          retailer: i.retailerName,
        }))}
        currency={currency}
        total={summary.total}
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
