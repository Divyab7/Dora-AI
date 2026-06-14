/**
 * Per-retailer product listings with match quality, images, and realistic local pricing.
 */

import type { ProductCategory, RetailerOffer } from "@/types/product";
import type { MatchQuality, RetailerListing } from "@/types/product";
import { HBAR_USD_RATE } from "@/lib/utils/constants";
import {
  DEFAULT_COUNTRY,
  type CountryCode,
  buildRegionalOffers,
  buildSearchQueryRaw,
  getMarket,
  getRetailersForCategory,
} from "@/lib/commerce/market";

/** Realistic price ranges in local minor units (paise, cents, etc.) */
const CATEGORY_PRICE_MINOR: Record<string, Partial<Record<ProductCategory, [number, number]>>> = {
  INR: {
    home: [49900, 199900],
    electronics: [99900, 499900],
    shoes: [79900, 499900],
    clothing: [39900, 299900],
    accessories: [29900, 149900],
    beauty: [19900, 99900],
  },
  USD: {
    home: [999, 7999],
    electronics: [2999, 49999],
    shoes: [3999, 19999],
    clothing: [1999, 14999],
    accessories: [999, 9999],
    beauty: [499, 5999],
  },
  GBP: {
    home: [799, 5999],
    electronics: [2499, 39999],
    shoes: [2999, 14999],
    clothing: [1499, 9999],
    accessories: [999, 7999],
    beauty: [399, 4999],
  },
  AED: {
    home: [1999, 14999],
    electronics: [9999, 99999],
    shoes: [9999, 49999],
    clothing: [4999, 29999],
    accessories: [2999, 19999],
    beauty: [999, 9999],
  },
};

/** Alternative product templates when retailer likely has a different item */
const ALTERNATIVE_TITLES: Partial<Record<ProductCategory, string[]>> = {
  home: [
    "Multi-Purpose Kitchen Soap Dispenser Scrubber",
    "Manual Salad Spinner with Drain Basket",
    "Silicone Sink Caddy Organizer Set",
    "Stainless Steel Vegetable Peeler 3-in-1",
  ],
  beauty: [
    "Similar Skincare Gift Set",
    "Daily Use Face Cleanser Combo",
  ],
};

function seededUnit(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getPriceRange(currency: string, category: ProductCategory): [number, number] {
  const byCurrency = CATEGORY_PRICE_MINOR[currency] ?? CATEGORY_PRICE_MINOR.USD!;
  return byCurrency[category] ?? byCurrency.home ?? [999, 9999];
}

function wordOverlapScore(query: string, title: string): number {
  const stop = new Set(["the", "and", "for", "with", "a", "an", "in", "on", "of"]);
  const qWords = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  if (qWords.length === 0) return 0.5;

  const titleLower = title.toLowerCase();
  let hits = 0;
  for (const w of qWords) {
    if (titleLower.includes(w)) hits++;
  }
  return hits / qWords.length;
}

function qualityFromScore(score: number): MatchQuality {
  if (score >= 0.75) return "exact";
  if (score >= 0.45) return "close";
  return "alternative";
}

function pickImage(category: ProductCategory, seed: string): string {
  const slug = `${category}-${seededUnit(seed)}`;
  return `https://picsum.photos/seed/dora-${slug}/400/400`;
}

function listingPrice(
  currency: string,
  category: ProductCategory,
  seed: string,
  factor: number,
  slot: "low" | "mid" | "high"
): number {
  const [min, max] = getPriceRange(currency, category);
  const range = max - min;
  const slotOffset = slot === "low" ? 0 : slot === "mid" ? 0.35 : 0.65;
  const base = min + (seededUnit(seed) % Math.floor(range * 0.4)) + Math.floor(range * slotOffset);
  return Math.round(base * factor);
}

/** Retailers that often carry close matches for this category */
const STRONG_MATCH_RETAILERS: Partial<Record<CountryCode, Partial<Record<ProductCategory, string[]>>>> = {
  IN: {
    home: ["amazon", "flipkart"],
    electronics: ["amazon", "flipkart", "croma"],
    shoes: ["amazon", "flipkart", "myntra", "ajio"],
    clothing: ["myntra", "ajio", "flipkart", "amazon"],
    beauty: ["nykaa", "amazon", "flipkart"],
  },
};

function isStrongMatchRetailer(
  country: CountryCode,
  category: ProductCategory,
  retailerId: string
): boolean {
  const list = STRONG_MATCH_RETAILERS[country]?.[category] ?? ["amazon"];
  return list.includes(retailerId);
}

function buildListingTitle(
  productName: string,
  retailerId: string,
  category: ProductCategory,
  country: CountryCode,
  seed: string
): { title: string; matchQuality: MatchQuality; matchScore: number } {
  const strong = isStrongMatchRetailer(country, category, retailerId);

  // Budget retailers more often show alternatives for niche kitchen items
  const forceAlternative =
    !strong ||
    (retailerId === "meesho" && category === "home" && seededUnit(`${seed}:alt`) % 100 > 35);

  if (forceAlternative) {
    const alts = ALTERNATIVE_TITLES[category] ?? ALTERNATIVE_TITLES.home!;
    const title = alts[seededUnit(`${seed}:title`) % alts.length];
    const score = wordOverlapScore(productName, title);
    return {
      title,
      matchQuality: "alternative",
      matchScore: Math.max(0.15, Math.min(0.4, score)),
    };
  }

  // Close / exact — use identified product name with optional retailer suffix
  const suffixes: Record<string, string> = {
    amazon: "",
    flipkart: " — Free Delivery",
    croma: " (Official)",
  };
  const title = `${productName}${suffixes[retailerId] ?? ""}`.trim();
  const score = wordOverlapScore(productName, title);
  const matchQuality = qualityFromScore(score);

  return { title, matchQuality, matchScore: Math.max(score, matchQuality === "exact" ? 0.8 : 0.55) };
}

function enrichOfferToListing(
  offer: RetailerOffer,
  productName: string,
  category: ProductCategory,
  country: CountryCode,
  seed: string
): RetailerListing {
  const { title, matchQuality, matchScore } = buildListingTitle(
    productName,
    offer.retailerId,
    category,
    country,
    seed
  );

  const priceSlot =
    matchQuality === "exact" ? "low" : matchQuality === "close" ? "mid" : "high";
  const price = listingPrice(
    offer.currency,
    category,
    `${seed}:${offer.retailerId}`,
    offer.retailerId === "meesho" ? 0.55 : 1.0,
    priceSlot
  );

  const imageSeed = `${seed}:${offer.retailerId}:${matchQuality}`;
  const productImageUrl = pickImage(category, imageSeed);

  const market = getMarket(country);
  const minorDivisor = market.currency === "JPY" || market.currency === "KRW" ? 1 : 100;
  const localMajor = price / minorDivisor;
  const usdMajor = localMajor / market.usdRate;
  const priceHbar = Math.floor((usdMajor / HBAR_USD_RATE) * 100_000_000).toString();

  return {
    ...offer,
    price,
    priceHbar,
    listingTitle: title,
    productImageUrl,
    matchQuality,
    matchScore,
    inStock: matchQuality === "alternative" ? seededUnit(`${seed}:stock`) % 100 > 15 : offer.inStock,
  };
}

export interface RetailerSearchSummary {
  exactMatchFound: boolean;
  closeMatchCount: number;
  alternativeCount: number;
  message: string;
}

export function buildSearchSummary(listings: RetailerListing[]): RetailerSearchSummary {
  const exact = listings.filter((l) => l.matchQuality === "exact").length;
  const close = listings.filter((l) => l.matchQuality === "close").length;
  const alternative = listings.filter((l) => l.matchQuality === "alternative").length;
  const exactMatchFound = exact > 0;

  let message: string;
  if (exactMatchFound && alternative === 0) {
    message = "We found matching listings for your item across retailers.";
  } else if (exact > 0 || close > 0) {
    message =
      "The exact item may not be on every store. Below are the closest matches and similar options we found.";
  } else {
    message =
      "We couldn't find this exact product, but here are related options you can explore on each retailer.";
  }

  return {
    exactMatchFound,
    closeMatchCount: close,
    alternativeCount: alternative,
    message,
  };
}

/**
 * Build per-retailer listings with images, titles, match quality, and local pricing.
 * Sync — no network I/O (live retailer APIs can be added later).
 */
export function buildRetailerListings(
  productName: string,
  brand: string,
  category: ProductCategory,
  country: CountryCode = DEFAULT_COUNTRY
): RetailerListing[] {
  const seed = `${productName}:${brand}:${category}:${country}`;
  const offers = buildRegionalOffers(productName, brand, category, country);

  const listings = offers.map((offer) =>
    enrichOfferToListing(offer, productName, category, country, seed)
  );

  const qualityOrder: Record<MatchQuality, number> = {
    exact: 0,
    close: 1,
    alternative: 2,
  };

  return listings.sort((a, b) => {
    const q = qualityOrder[a.matchQuality] - qualityOrder[b.matchQuality];
    if (q !== 0) return q;
    return a.price - b.price;
  });
}

export async function fetchRetailerListings(
  productName: string,
  brand: string,
  category: ProductCategory,
  country: CountryCode = DEFAULT_COUNTRY
): Promise<RetailerListing[]> {
  return buildRetailerListings(productName, brand, category, country);
}

export function listingsToProductMatch(
  productName: string,
  brand: string,
  category: ProductCategory,
  description: string,
  listings: RetailerListing[]
): {
  listings: RetailerListing[];
  summary: RetailerSearchSummary;
  lowestPrice: number;
  lowestPriceHbar: string;
} {
  const summary = buildSearchSummary(listings);
  const inStock = listings.filter((l) => l.inStock);
  const pool = inStock.length > 0 ? inStock : listings;
  const best = pool.reduce((a, b) => (a.price < b.price ? a : b), pool[0]);

  return {
    listings,
    summary,
    lowestPrice: best?.price ?? 0,
    lowestPriceHbar: best?.priceHbar ?? "0",
  };
}

export { buildSearchQueryRaw, getMarket, getRetailersForCategory };
