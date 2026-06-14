"use client";

import Image from "next/image";
import { useSearch } from "@/contexts/SearchContext";
import { useCart } from "@/contexts/CartContext";
import { useUI } from "@/contexts/UIContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils/format";
import { ROUTES } from "@/lib/utils/constants";

const categoryColors: Record<string, string> = {
  shoes: "#2d1f1f",
  clothing: "#1f2d2d",
  accessories: "#2d2d1f",
  electronics: "#1f1f2d",
  home: "#2d1f2d",
  beauty: "#2d1f1f",
};

const categoryIcons: Record<string, string> = {
  shoes: "👟",
  clothing: "👕",
  accessories: "👜",
  electronics: "🎧",
  home: "🏠",
  beauty: "💄",
};

function ProductImage({ name, category, brand }: { name: string; category: string; brand: string }) {
  const bgColor = categoryColors[category] || "#1a1a25";
  const icon = categoryIcons[category] || "📦";
  const initials = brand.slice(0, 2).toUpperCase();

  return (
    <div
      className="aspect-square flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bgColor}, #0a0a0f)` }}
    >
      <div
        className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-5"
        style={{ background: "var(--accent)" }}
      />
      <div
        className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider"
        style={{ background: "rgba(0,255,157,0.15)", color: "var(--accent)" }}
      >
        {initials}
      </div>
      <span className="text-5xl relative z-10">{icon}</span>
      <p className="text-[10px] text-[var(--text-muted)] mt-2 px-3 text-center line-clamp-2 relative z-10">
        {name}
      </p>
    </div>
  );
}

export default function ResultsPage() {
  const { results, stage, error, resetSearch, imagePreview, analysisResult } = useSearch();
  const { items: cartItems, addItem } = useCart();
  const { addToast } = useUI();
  const router = useRouter();

  const isInCart = (productId: string) =>
    cartItems.some((item) => item.productId === productId);

  function handleAddToCart(match: (typeof results)[0], e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    const retailer = match.allRetailers[0];
    if (!retailer) return;

    addItem({
      cartItemId: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: match.product.id,
      productName: match.product.name,
      brand: match.product.brand,
      imageCid: match.product.imageCid,
      retailerId: retailer.retailerId,
      retailerName: retailer.retailerName,
      price: match.lowestPrice,
      priceHbar: match.lowestPriceHbar,
      quantity: 1,
      affiliateUrl: retailer.affiliateUrl,
    });

    addToast({
      type: "success",
      message: `${match.product.brand} — added to cart`,
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
          <Button variant="accent" onClick={resetSearch}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6 text-center">
        <div className="glass-card p-8 space-y-4">
          <div className="text-4xl">🔍</div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">No Results</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            We couldn&apos;t find matching products. Try a different image.
          </p>
          <Button variant="accent" onClick={() => router.push(ROUTES.SCAN)}>
            New Search
          </Button>
        </div>
      </div>
    );
  }

  const visionConfidence = analysisResult
    ? Math.round(analysisResult.confidence * 100)
    : null;
  const identifiedLabel = analysisResult
    ? [
        analysisResult.detectedBrand,
        analysisResult.detectedCategory,
        analysisResult.detectedAttributes?.color,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Search Results</h1>
          <p className="text-sm text-[var(--text-secondary)]">{results.length} matches found</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.SCAN)}>
          New Search
        </Button>
      </div>

      {/* Cross-verify panel */}
      {imagePreview && analysisResult && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-0 sm:gap-4">
            <div className="relative h-36 sm:h-auto sm:min-h-[120px] bg-[var(--bg-secondary)]">
              <Image
                src={imagePreview}
                alt="Your uploaded photo"
                fill
                className="object-contain p-2"
                sizes="140px"
              />
            </div>
            <div className="p-4 sm:py-4 sm:pr-4 space-y-2 border-t sm:border-t-0 border-[var(--border)]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Your search
                </p>
                {visionConfidence !== null && (
                  <Badge
                    variant={
                      analysisResult.confidence >= 0.7
                        ? "success"
                        : analysisResult.confidence >= 0.5
                          ? "warning"
                          : "default"
                    }
                    size="sm"
                  >
                    {visionConfidence}% AI confidence
                  </Badge>
                )}
                {analysisResult.modelUsed && (
                  <Badge variant="default" size="sm">
                    {analysisResult.modelUsed}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {analysisResult.identifiedProductName || identifiedLabel || "Identified product"}
              </p>
              {analysisResult.sourceUrl && (
                <a
                  href={analysisResult.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View source link ↗
                </a>
              )}
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {analysisResult.gpt4vDescription}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2"
                onClick={() => router.push(ROUTES.VERIFY)}
              >
                Not right? Re-verify
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((match) => {
          const added = isInCart(match.product.id);
          const topRetailer = match.allRetailers[0];

          return (
            <Card
              key={match.product.id}
              hover
              className="overflow-hidden flex flex-col"
              onClick={() => router.push(`/product/${match.product.id}`)}
            >
              <ProductImage
                name={match.product.name}
                category={match.product.category}
                brand={match.product.brand}
              />

              <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="accent" size="sm">
                    {match.product.brand}
                  </Badge>
                  <Badge
                    variant={
                      match.confidence > 0.8
                        ? "success"
                        : match.confidence > 0.5
                          ? "warning"
                          : "default"
                    }
                    size="sm"
                  >
                    {(match.confidence * 100).toFixed(0)}% match
                  </Badge>
                </div>

                <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">
                  {match.product.name}
                </h3>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[var(--accent)]">
                      {formatPrice(match.lowestPrice)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">lowest</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {match.retailerCount} retailers
                  </p>
                </div>

                <div className="space-y-1 pt-2 border-t border-[var(--border)] flex-1">
                  {match.allRetailers.slice(0, 3).map((r) => (
                    <a
                      key={r.retailerId}
                      href={r.affiliateUrl || r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between text-xs group rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--accent-dim)] transition-colors"
                    >
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] flex items-center gap-1">
                        {r.retailerName}
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="opacity-60"
                        >
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </span>
                      <span className="text-[var(--text-primary)] font-mono">
                        {formatPrice(r.price)}
                        {!r.inStock && <span className="text-red-400 ml-1">OOS</span>}
                      </span>
                    </a>
                  ))}
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  {topRetailer && (
                    <a
                      href={topRetailer.affiliateUrl || topRetailer.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn-glass w-full text-center text-xs px-3 py-2 rounded-lg inline-flex items-center justify-center font-medium transition-all duration-200 hover:border-[var(--border-hover)]"
                    >
                      View on {topRetailer.retailerName} ↗
                    </a>
                  )}
                  <Button
                    variant={added ? "glass" : "accent"}
                    size="sm"
                    className="w-full"
                    disabled={added}
                    onClick={(e) => handleAddToCart(match, e)}
                  >
                    {added ? "✓ In Cart" : `Add to Cart · ${formatPrice(match.lowestPrice)}`}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
