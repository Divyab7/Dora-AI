"use client";

import { useSearch } from "@/contexts/SearchContext";
import { useCart } from "@/contexts/CartContext";
import { useUI } from "@/contexts/UIContext";
import { useMarket } from "@/contexts/MarketContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatHbar } from "@/lib/utils/format";
import { ROUTES } from "@/lib/utils/constants";
import type { RetailerListing, MatchQuality } from "@/types/product";

const MATCH_LABELS: Record<MatchQuality, { label: string; variant: "success" | "warning" | "default" }> = {
  exact: { label: "Exact match", variant: "success" },
  close: { label: "Close match", variant: "warning" },
  alternative: { label: "Similar option", variant: "default" },
};

function MatchBadge({ quality }: { quality: MatchQuality }) {
  const { label, variant } = MATCH_LABELS[quality];
  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

export default function ResultsPage() {
  const { results, stage, error, resetSearch, analysisResult } = useSearch();
  const { items: cartItems, addItem } = useCart();
  const { addToast } = useUI();
  const { market } = useMarket();
  const router = useRouter();

  const currency = market.currency;
  const primaryMatch = results[0];

  const isInCart = (productId: string, retailerId: string) =>
    cartItems.some(
      (item) => item.productId === productId && item.retailerId === retailerId
    );

  function handleAddToCart(
    listing: RetailerListing,
    productId: string,
    productName: string,
    brand: string,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    addItem({
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId,
      productName: listing.listingTitle,
      brand,
      imageCid: "",
      retailerId: listing.retailerId,
      retailerName: listing.retailerName,
      price: listing.price,
      currency: listing.currency,
      priceHbar: listing.priceHbar,
      quantity: 1,
      affiliateUrl: listing.url,
    });
    addToast({
      type: "success",
      message: `Added from ${listing.retailerName}`,
      duration: 2500,
    });
  }

  if (stage === "error") {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6 text-center">
        <div className="glass-card p-8 space-y-4">
          <div className="text-4xl">😕</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Search Error</h1>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <Button variant="accent" onClick={resetSearch}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!primaryMatch) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6 text-center">
        <div className="glass-card p-8 space-y-4">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">No Results</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            We couldn&apos;t find matching products. Try a different image.
          </p>
          <Button variant="accent" onClick={() => router.push(ROUTES.SCAN)}>New Search</Button>
        </div>
      </div>
    );
  }

  const listings = primaryMatch.allRetailers;
  const productName = primaryMatch.product.name;
  const hasExact = primaryMatch.exactMatchFound ?? listings.some((l) => l.matchQuality === "exact");
  const summaryText =
    primaryMatch.matchSummary ??
    (hasExact
      ? "We found matching listings for your item."
      : "The exact item may not be on every store — here are the closest options we found.");

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Retailer Options</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {listings.length} stores · {market.label} · Pay in HBAR
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.SCAN)}>
          New Search
        </Button>
      </div>

      <Card className="p-4 space-y-1">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
          You searched for
        </p>
        <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">
          {analysisResult?.identifiedProductName || productName}
        </p>
        {analysisResult && (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
            {analysisResult.gpt4vDescription}
          </p>
        )}
      </Card>

      <div
        className={`p-4 rounded-xl border text-sm ${
          hasExact
            ? "bg-[var(--accent-dim)] border-[var(--accent)]/30 text-[var(--text-primary)]"
            : "bg-amber-500/10 border-amber-500/25 text-amber-100"
        }`}
      >
        <p className="font-medium mb-1">
          {hasExact ? "✓ Matches found" : "⚠ Exact item not on all stores"}
        </p>
        <p className="text-xs opacity-90 leading-relaxed">{summaryText}</p>
      </div>

      <div className="space-y-3">
        {listings.map((listing) => {
          const added = isInCart(primaryMatch.product.id, listing.retailerId);
          return (
            <Card key={`${listing.retailerId}-${listing.listingTitle}`} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide">
                    {listing.retailerName}
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                    {listing.listingTitle}
                  </p>
                </div>
                <MatchBadge quality={listing.matchQuality} />
              </div>

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold text-[var(--accent)]">
                  {formatHbar(listing.priceHbar)}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  ({formatPrice(listing.price, listing.currency)})
                </span>
                {!listing.inStock && (
                  <span className="text-xs text-red-400">Out of stock</span>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glass text-xs px-3 py-2 rounded-lg inline-flex flex-col items-start gap-0.5 font-medium"
                >
                  <span>Search on {listing.retailerName} ↗</span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    Opens {listing.retailerName} results for this item
                  </span>
                </a>
                <Button
                  variant={added ? "glass" : "accent"}
                  size="sm"
                  disabled={added || !listing.inStock}
                  onClick={(e) =>
                    handleAddToCart(
                      listing,
                      primaryMatch.product.id,
                      productName,
                      primaryMatch.product.brand,
                      e
                    )
                  }
                >
                  {added ? "✓ In Cart" : "Add to Cart"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {listings.every((l) => l.matchQuality === "alternative") && (
        <p className="text-xs text-center text-[var(--text-muted)] px-4">
          None of these are an exact match. Tap a retailer to browse similar items on their site.
        </p>
      )}
    </div>
  );
}
