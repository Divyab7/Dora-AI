/**
 * Unified Catalog — enrich matches with per-retailer listings.
 */

import type { ProductMatch } from "@/types/search";
import type { ProductCategory } from "@/types/product";
import { type CountryCode, DEFAULT_COUNTRY } from "@/lib/commerce/market";
import { fetchRetailerListings, buildSearchSummary } from "@/lib/commerce/retailer-listings";

export async function enrichWithPrices(
  matches: ProductMatch[],
  country: CountryCode = DEFAULT_COUNTRY
): Promise<ProductMatch[]> {
  const enriched = await Promise.all(
    matches.map(async (match) => {
      const listings = await fetchRetailerListings(
        match.product.name,
        match.product.brand,
        match.product.category as ProductCategory,
        country
      );

      if (listings.length === 0) return match;

      const summary = buildSearchSummary(listings);
      const inStock = listings.filter((l) => l.inStock);
      const pool = inStock.length > 0 ? inStock : listings;
      const best = pool.reduce((a, b) => (a.price < b.price ? a : b), pool[0]);

      return {
        ...match,
        allRetailers: listings,
        lowestPrice: best?.price ?? match.lowestPrice,
        lowestPriceHbar: best?.priceHbar ?? match.lowestPriceHbar,
        retailerCount: listings.length,
        exactMatchFound: summary.exactMatchFound,
        matchSummary: summary.message,
      };
    })
  );

  return enriched;
}

/** @deprecated Use fetchRetailerListings from retailer-listings.ts */
export { fetchRetailerListings as fetchCrossRetailerPrices } from "@/lib/commerce/retailer-listings";
