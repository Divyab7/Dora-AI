"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/format";

// Mock orders for demonstration
const MOCK_ORDERS = [
  {
    txId: "0.0.12345@1234567890-000000000",
    productName: "Nike Air Max 90",
    retailer: "StockX",
    price: 11500,
    status: "completed",
    date: "2026-06-14T10:30:00Z",
    paymentMethod: "full",
  },
  {
    txId: "0.0.12345@1234567891-000000001",
    productName: "Adidas Ultra Boost",
    retailer: "Amazon",
    price: 9500,
    status: "pending_installments",
    date: "2026-06-13T14:00:00Z",
    paymentMethod: "payin3",
    installments: { paid: 1, total: 3 },
  },
];

export default function OrdersPage() {
  const router = useRouter();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Orders</h1>

      {MOCK_ORDERS.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-4">
          <div className="text-4xl">📋</div>
          <p className="text-[var(--text-secondary)]">No orders yet</p>
          <Button variant="accent" onClick={() => router.push("/scan")}>
            Start Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {MOCK_ORDERS.map((order) => (
            <Card
              key={order.txId}
              hover
              className="p-4"
              onClick={() => router.push(`/orders/${order.txId}`)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {order.productName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{order.retailer}</span>
                    <span>·</span>
                    <span>{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatPrice(order.price)}
                  </p>
                  <Badge
                    variant={order.status === "completed" ? "success" : "warning"}
                    size="sm"
                  >
                    {order.status === "completed"
                      ? "Completed"
                      : `${order.installments?.paid}/${order.installments?.total} Paid`}
                  </Badge>
                </div>
              </div>
              {order.paymentMethod === "payin3" && (
                <div className="mt-3 pt-3 border-t border-[var(--border)]">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i <= (order.installments?.paid || 0)
                            ? "bg-[var(--accent)]"
                            : "bg-[var(--surface-overlay)]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    PayIn3 · {order.installments?.paid || 0} of 3 installments paid
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
