"use client";

import { useCart } from "@/contexts/CartContext";
import { useMarket } from "@/contexts/MarketContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatHbar } from "@/lib/utils/format";

const categoryIcons: Record<string, string> = {
  shoes: "👟", clothing: "👕", accessories: "👜",
  electronics: "🎧", home: "🏠", beauty: "💄",
};

const categoryColors: Record<string, string> = {
  shoes: "#2d1f1f", clothing: "#1f2d2d", accessories: "#2d2d1f",
  electronics: "#1f1f2d", home: "#2d1f2d", beauty: "#2d1f1f",
};

function CartItemImage({ brand, category }: { brand: string; category: string }) {
  const bg = categoryColors[category] || "#1a1a25";
  const icon = categoryIcons[category] || "📦";

  return (
    <div
      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bg}, #0a0a0f)` }}
    >
      <span className="text-xl relative z-10">{icon}</span>
      <span className="text-[8px] text-[var(--accent)] font-bold absolute bottom-1">
        {brand.slice(0, 3).toUpperCase()}
      </span>
    </div>
  );
}

export default function CartPage() {
  const { items, summary, removeItem, updateQuantity, setPaymentMethod, selectedPaymentMethod, clearCart } = useCart();
  const { market } = useMarket();
  const router = useRouter();
  const currency = market.currency;

  if (items.length === 0) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6 text-center">
        <div className="glass-card p-8 space-y-4">
          <div className="text-4xl">🛒</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Your Cart is Empty</h1>
          <p className="text-sm text-[var(--text-secondary)]">Start scanning to find products you love</p>
          <Button variant="accent" onClick={() => router.push("/scan")}>Start Scanning</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Cart</h1>

      {/* Cart items */}
      <div className="space-y-3">
        {items.map((item) => (
          <Card key={item.cartItemId} variant="flat" className="p-4 space-y-3">
            <div className="flex gap-4">
              <CartItemImage brand={item.brand} category={item.productName} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {item.brand} · Sold by {item.retailerName}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1 flex-shrink-0"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>

                {/* Price + Qty */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 rounded-lg bg-[var(--surface-elevated)] text-xs hover:bg-[var(--surface-overlay)]"
                    >−</button>
                    <span className="text-sm text-[var(--text-primary)] w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, Math.min(10, item.quantity + 1))}
                      className="w-6 h-6 rounded-lg bg-[var(--surface-elevated)] text-xs hover:bg-[var(--surface-overlay)]"
                    >+</button>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--accent)]">
                      {formatHbar(
                        (BigInt(item.priceHbar) * BigInt(item.quantity)).toString()
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatPrice(item.price * item.quantity, item.currency || currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification link — open retailer in new tab */}
            <a
              href={item.affiliateUrl || `https://${item.retailerName.toLowerCase()}.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline pt-1 border-t border-[var(--border)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Verify on {item.retailerName} ↗
            </a>
          </Card>
        ))}
      </div>

      {/* Payment method selector */}
      <Card variant="glass" className="p-4 space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Payment Method</h3>
        <div className="grid grid-cols-3 gap-2">
          {(["full", "payin3", "groupbuy"] as const).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`p-3 rounded-xl text-center text-xs transition-all ${
                selectedPaymentMethod === method
                  ? "bg-[var(--accent-dim)] border border-[var(--accent)] text-[var(--accent)]"
                  : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
              }`}
            >
              {method === "full" && "Pay in Full"}
              {method === "payin3" && "Pay in 3"}
              {method === "groupbuy" && "Group Buy"}
            </button>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Subtotal ({summary.itemCount} items)</span>
          <span className="text-[var(--text-primary)]">{formatPrice(summary.subtotal, currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--text-secondary)]">Transaction Fee (1%)</span>
          <span className="text-[var(--text-primary)]">{formatPrice(summary.transactionFee, currency)}</span>
        </div>
        {summary.payIn3Fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">PayIn3 Fee (2%)</span>
            <span className="text-[var(--text-primary)]">{formatPrice(summary.payIn3Fee, currency)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-3 border-t border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total in HBAR</p>
            <p className="text-xl font-bold text-[var(--accent)]">
              {formatHbar(summary.totalHbar)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">≈ {currency}</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {formatPrice(summary.total, currency)}
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button variant="accent" size="lg" className="w-full" onClick={() => router.push("/checkout")}>
          Pay {formatHbar(summary.totalHbar)} · Checkout
        </Button>
        <Button variant="ghost" size="sm" className="w-full" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>
    </div>
  );
}
