"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatHbar, formatPrice } from "@/lib/utils/format";
import type { RetailerListing, MatchQuality } from "@/types/product";
import type { ChatPayTarget } from "@/types/agent-chat";

const MATCH_LABELS: Record<MatchQuality, { label: string; variant: "success" | "warning" | "default" }> = {
  exact: { label: "Exact match", variant: "success" },
  close: { label: "Close match", variant: "warning" },
  alternative: { label: "Similar", variant: "default" },
};

interface ChatProductResultsProps {
  productName: string;
  brand: string;
  productId: string;
  listings: RetailerListing[];
  summary?: string;
  hasExactMatch?: boolean;
  onPay: (target: ChatPayTarget) => void;
  payingListingId?: string | null;
}

export function ChatProductResults({
  productName,
  brand,
  productId,
  listings,
  summary,
  hasExactMatch,
  onPay,
  payingListingId,
}: ChatProductResultsProps) {
  const exact = hasExactMatch ?? listings.some((l) => l.matchQuality === "exact");

  return (
    <div className="space-y-3 w-full max-w-md">
      <div className="space-y-1">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Results for</p>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{productName}</p>
        {brand && brand !== "unknown" && (
          <p className="text-xs text-[var(--text-secondary)]">{brand}</p>
        )}
      </div>

      <div
        className={`text-xs p-3 rounded-xl border ${
          exact
            ? "bg-[var(--accent-dim)] border-[var(--accent)]/25 text-[var(--text-primary)]"
            : "bg-amber-500/10 border-amber-500/20 text-amber-100"
        }`}
      >
        {summary ||
          (exact
            ? "Found matching listings at nearby stores."
            : "Exact item may vary — here are the closest options.")}
      </div>

      {listings.slice(0, 6).map((listing) => {
        const match = MATCH_LABELS[listing.matchQuality];
        const listingKey = `${listing.retailerId}-${listing.listingTitle}`;
        const isPaying = payingListingId === listingKey;

        return (
          <Card key={listingKey} className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[var(--accent)] uppercase">
                  {listing.retailerName}
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                  {listing.listingTitle}
                </p>
              </div>
              <Badge variant={match.variant} size="sm">
                {match.label}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg font-bold text-[var(--accent)]">
                {formatHbar(listing.priceHbar)}
              </span>
              {listing.price > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  ({formatPrice(listing.price, listing.currency)})
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                View on {listing.retailerName} ↗
              </a>
              <Button
                variant="accent"
                size="sm"
                disabled={!listing.inStock || isPaying}
                onClick={() =>
                  onPay({ listing, productId, productName, brand })
                }
              >
                {isPaying ? "Preparing…" : "Pay with HBAR"}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
