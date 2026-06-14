/**
 * Regional market config — retailers, currencies, and search URLs by country.
 */

import type { ProductCategory } from "@/types/product";
import type { RetailerOffer } from "@/types/product";
import { HBAR_USD_RATE } from "@/lib/utils/constants";

export type CountryCode =
  | "IN"
  | "US"
  | "GB"
  | "AE"
  | "CA"
  | "AU"
  | "DE"
  | "FR"
  | "JP"
  | "SG"
  | "BR"
  | "MX"
  | "KR"
  | "SA";

/** Used when country cannot be detected from browser or settings */
export const DEFAULT_COUNTRY: CountryCode = "US";

export interface MarketConfig {
  code: CountryCode;
  label: string;
  currency: string;
  locale: string;
  /** Approx USD → local currency for mock pricing */
  usdRate: number;
}

export const MARKETS: Record<CountryCode, MarketConfig> = {
  IN: { code: "IN", label: "India", currency: "INR", locale: "en-IN", usdRate: 83 },
  US: { code: "US", label: "United States", currency: "USD", locale: "en-US", usdRate: 1 },
  GB: { code: "GB", label: "United Kingdom", currency: "GBP", locale: "en-GB", usdRate: 0.79 },
  AE: { code: "AE", label: "United Arab Emirates", currency: "AED", locale: "en-AE", usdRate: 3.67 },
  CA: { code: "CA", label: "Canada", currency: "CAD", locale: "en-CA", usdRate: 1.36 },
  AU: { code: "AU", label: "Australia", currency: "AUD", locale: "en-AU", usdRate: 1.52 },
  DE: { code: "DE", label: "Germany", currency: "EUR", locale: "de-DE", usdRate: 0.92 },
  FR: { code: "FR", label: "France", currency: "EUR", locale: "fr-FR", usdRate: 0.92 },
  JP: { code: "JP", label: "Japan", currency: "JPY", locale: "ja-JP", usdRate: 150 },
  SG: { code: "SG", label: "Singapore", currency: "SGD", locale: "en-SG", usdRate: 1.34 },
  BR: { code: "BR", label: "Brazil", currency: "BRL", locale: "pt-BR", usdRate: 5.0 },
  MX: { code: "MX", label: "Mexico", currency: "MXN", locale: "es-MX", usdRate: 17.5 },
  KR: { code: "KR", label: "South Korea", currency: "KRW", locale: "ko-KR", usdRate: 1350 },
  SA: { code: "SA", label: "Saudi Arabia", currency: "SAR", locale: "ar-SA", usdRate: 3.75 },
};

interface RetailerDef {
  id: string;
  name: string;
  categories: ProductCategory[] | "all";
  searchUrl: (query: string, market: MarketConfig) => string;
  stockBias: number;
  priceFactor: number;
}

const ALL_CATEGORIES: ProductCategory[] = [
  "clothing",
  "shoes",
  "accessories",
  "electronics",
  "home",
  "beauty",
];

const FASHION: ProductCategory[] = ["clothing", "shoes", "accessories"];
const FASHION_BEAUTY: ProductCategory[] = [...FASHION, "beauty"];
const HOME_ELECTRONICS: ProductCategory[] = ["home", "electronics"];

function myntraSlug(q: string): string {
  const slug = decodeURIComponent(q)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.myntra.com/${slug || "search"}`;
}

const RETAILERS: Record<CountryCode, RetailerDef[]> = {
  IN: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.in/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "flipkart", name: "Flipkart", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.flipkart.com/search?q=${q}`, stockBias: 0.8, priceFactor: 0.92 },
    { id: "meesho", name: "Meesho", categories: ["home", "clothing", "accessories", "beauty"], searchUrl: (q) => `https://www.meesho.com/search?q=${q}`, stockBias: 0.78, priceFactor: 0.72 },
    { id: "myntra", name: "Myntra", categories: FASHION_BEAUTY, searchUrl: (q) => myntraSlug(q), stockBias: 0.75, priceFactor: 0.95 },
    { id: "ajio", name: "Ajio", categories: FASHION, searchUrl: (q) => `https://www.ajio.com/search/?text=${q}`, stockBias: 0.7, priceFactor: 0.93 },
    { id: "croma", name: "Croma", categories: HOME_ELECTRONICS, searchUrl: (q) => `https://www.croma.com/search/?q=${q}`, stockBias: 0.65, priceFactor: 1.05 },
    { id: "nykaa", name: "Nykaa", categories: ["beauty"], searchUrl: (q) => `https://www.nykaa.com/search/result/?q=${q}`, stockBias: 0.8, priceFactor: 0.98 },
  ],
  US: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.com/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "walmart", name: "Walmart", categories: ["home", "electronics", "beauty", "clothing"], searchUrl: (q) => `https://www.walmart.com/search?q=${q}`, stockBias: 0.75, priceFactor: 0.88 },
    { id: "target", name: "Target", categories: ["home", "clothing", "beauty", "accessories"], searchUrl: (q) => `https://www.target.com/s?searchTerm=${q}`, stockBias: 0.7, priceFactor: 0.9 },
    { id: "bestbuy", name: "Best Buy", categories: ["electronics"], searchUrl: (q) => `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`, stockBias: 0.7, priceFactor: 1.02 },
    { id: "nike", name: "Nike", categories: [...FASHION], searchUrl: (q) => `https://www.nike.com/w?q=${q}`, stockBias: 0.6, priceFactor: 1.1 },
    { id: "stockx", name: "StockX", categories: [...FASHION], searchUrl: (q) => `https://stockx.com/search?s=${q}`, stockBias: 0.55, priceFactor: 1.15 },
    { id: "ebay", name: "eBay", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.ebay.com/sch/i.html?_nkw=${q}`, stockBias: 0.65, priceFactor: 0.85 },
  ],
  GB: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.co.uk/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "asos", name: "ASOS", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.asos.com/search/?q=${q}`, stockBias: 0.7, priceFactor: 0.95 },
    { id: "argos", name: "Argos", categories: HOME_ELECTRONICS, searchUrl: (q) => `https://www.argos.co.uk/search/${encodeURIComponent(decodeURIComponent(q).replace(/\s+/g, "-"))}/`, stockBias: 0.65, priceFactor: 0.92 },
    { id: "currys", name: "Currys", categories: ["electronics", "home"], searchUrl: (q) => `https://www.currys.co.uk/search?q=${q}`, stockBias: 0.68, priceFactor: 0.97 },
    { id: "boots", name: "Boots", categories: ["beauty"], searchUrl: (q) => `https://www.boots.com/search?searchTerm=${q}`, stockBias: 0.72, priceFactor: 0.94 },
    { id: "johnlewis", name: "John Lewis", categories: ["home", "clothing", "electronics", "beauty"], searchUrl: (q) => `https://www.johnlewis.com/search?search-term=${q}`, stockBias: 0.7, priceFactor: 1.08 },
  ],
  AE: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.ae/s?k=${q}`, stockBias: 0.8, priceFactor: 1.0 },
    { id: "noon", name: "Noon", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.noon.com/uae-en/search/?q=${q}`, stockBias: 0.75, priceFactor: 0.93 },
    { id: "namshi", name: "Namshi", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.namshi.com/uae-en/search?q=${q}`, stockBias: 0.72, priceFactor: 0.96 },
    { id: "sharafdg", name: "Sharaf DG", categories: ["electronics", "home"], searchUrl: (q) => `https://uae.sharafdg.com/search?q=${q}`, stockBias: 0.65, priceFactor: 1.02 },
  ],
  CA: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.ca/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "walmart", name: "Walmart", categories: ["home", "electronics", "beauty", "clothing"], searchUrl: (q) => `https://www.walmart.ca/search?q=${q}`, stockBias: 0.75, priceFactor: 0.9 },
    { id: "bestbuy", name: "Best Buy", categories: ["electronics"], searchUrl: (q) => `https://www.bestbuy.ca/en-ca/search?search=${q}`, stockBias: 0.7, priceFactor: 1.03 },
    { id: "canadiantire", name: "Canadian Tire", categories: ["home", "electronics"], searchUrl: (q) => `https://www.canadiantire.ca/en/search-results.html?q=${q}`, stockBias: 0.68, priceFactor: 0.95 },
  ],
  AU: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.com.au/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "kmart", name: "Kmart", categories: ["home", "clothing", "beauty"], searchUrl: (q) => `https://www.kmart.com.au/search/?q=${q}`, stockBias: 0.72, priceFactor: 0.82 },
    { id: "jbhifi", name: "JB Hi-Fi", categories: ["electronics"], searchUrl: (q) => `https://www.jbhifi.com.au/search?query=${q}`, stockBias: 0.7, priceFactor: 1.04 },
    { id: "myer", name: "Myer", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.myer.com.au/search?query=${q}`, stockBias: 0.68, priceFactor: 1.06 },
    { id: "catch", name: "Catch", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.catch.com.au/search?query=${q}`, stockBias: 0.65, priceFactor: 0.88 },
  ],
  DE: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.de/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "zalando", name: "Zalando", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.zalando.de/catalog/?q=${q}`, stockBias: 0.75, priceFactor: 0.98 },
    { id: "otto", name: "Otto", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.otto.de/suche/${q}/`, stockBias: 0.7, priceFactor: 0.94 },
    { id: "mediamarkt", name: "MediaMarkt", categories: ["electronics", "home"], searchUrl: (q) => `https://www.mediamarkt.de/de/search.html?query=${q}`, stockBias: 0.68, priceFactor: 1.02 },
  ],
  FR: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.fr/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "cdiscount", name: "Cdiscount", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.cdiscount.com/search/10/${q}.html`, stockBias: 0.72, priceFactor: 0.9 },
    { id: "fnac", name: "Fnac", categories: ["electronics", "home", "beauty"], searchUrl: (q) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}`, stockBias: 0.7, priceFactor: 1.01 },
    { id: "zalando", name: "Zalando", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.zalando.fr/catalog/?q=${q}`, stockBias: 0.75, priceFactor: 0.98 },
  ],
  JP: [
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.co.jp/s?k=${q}`, stockBias: 0.85, priceFactor: 1.0 },
    { id: "rakuten", name: "Rakuten", categories: ALL_CATEGORIES, searchUrl: (q) => `https://search.rakuten.co.jp/search/mall/${q}/`, stockBias: 0.78, priceFactor: 0.95 },
    { id: "uniqlo", name: "Uniqlo", categories: FASHION, searchUrl: (q) => `https://www.uniqlo.com/jp/ja/search?q=${q}`, stockBias: 0.65, priceFactor: 0.92 },
    { id: "yodobashi", name: "Yodobashi", categories: ["electronics", "home"], searchUrl: (q) => `https://www.yodobashi.com/?word=${q}`, stockBias: 0.7, priceFactor: 1.03 },
  ],
  SG: [
    { id: "shopee", name: "Shopee", categories: ALL_CATEGORIES, searchUrl: (q) => `https://shopee.sg/search?keyword=${q}`, stockBias: 0.8, priceFactor: 0.88 },
    { id: "lazada", name: "Lazada", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.lazada.sg/catalog/?q=${q}`, stockBias: 0.78, priceFactor: 0.9 },
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.sg/s?k=${q}`, stockBias: 0.82, priceFactor: 1.0 },
    { id: "qoo10", name: "Qoo10", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.qoo10.sg/s/?keyword=${q}`, stockBias: 0.7, priceFactor: 0.85 },
  ],
  BR: [
    { id: "mercadolivre", name: "Mercado Livre", categories: ALL_CATEGORIES, searchUrl: (q) => `https://lista.mercadolivre.com.br/${q}`, stockBias: 0.82, priceFactor: 0.92 },
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.com.br/s?k=${q}`, stockBias: 0.8, priceFactor: 1.0 },
    { id: "magazineluiza", name: "Magazine Luiza", categories: HOME_ELECTRONICS, searchUrl: (q) => `https://www.magazineluiza.com.br/busca/${q}/`, stockBias: 0.75, priceFactor: 0.94 },
    { id: "americanas", name: "Americanas", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.americanas.com.br/busca/${q}`, stockBias: 0.72, priceFactor: 0.9 },
  ],
  MX: [
    { id: "mercadolibre", name: "Mercado Libre", categories: ALL_CATEGORIES, searchUrl: (q) => `https://listado.mercadolibre.com.mx/${q}`, stockBias: 0.82, priceFactor: 0.92 },
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.com.mx/s?k=${q}`, stockBias: 0.8, priceFactor: 1.0 },
    { id: "liverpool", name: "Liverpool", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.liverpool.com.mx/tienda?s=${q}`, stockBias: 0.72, priceFactor: 1.05 },
    { id: "coppel", name: "Coppel", categories: ["home", "electronics", "clothing"], searchUrl: (q) => `https://www.coppel.com/SearchDisplay?searchTerm=${q}`, stockBias: 0.68, priceFactor: 0.88 },
  ],
  KR: [
    { id: "coupang", name: "Coupang", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.coupang.com/np/search?q=${q}`, stockBias: 0.85, priceFactor: 0.95 },
    { id: "gmarket", name: "Gmarket", categories: ALL_CATEGORIES, searchUrl: (q) => `https://browse.gmarket.co.kr/search?keyword=${q}`, stockBias: 0.78, priceFactor: 0.92 },
    { id: "11st", name: "11Street", categories: ALL_CATEGORIES, searchUrl: (q) => `https://search.11st.co.kr/Search.tmall?kwd=${q}`, stockBias: 0.75, priceFactor: 0.9 },
    { id: "musinsa", name: "Musinsa", categories: FASHION, searchUrl: (q) => `https://www.musinsa.com/search/musinsa/goods?q=${q}`, stockBias: 0.7, priceFactor: 1.02 },
  ],
  SA: [
    { id: "noon", name: "Noon", categories: ALL_CATEGORIES, searchUrl: (q) => `https://www.noon.com/saudi-en/search/?q=${q}`, stockBias: 0.78, priceFactor: 0.93 },
    { id: "amazon", name: "Amazon", categories: "all", searchUrl: (q) => `https://www.amazon.sa/s?k=${q}`, stockBias: 0.82, priceFactor: 1.0 },
    { id: "extra", name: "Extra", categories: HOME_ELECTRONICS, searchUrl: (q) => `https://www.extra.com/en-sa/search/?text=${q}`, stockBias: 0.68, priceFactor: 1.01 },
    { id: "namshi", name: "Namshi", categories: FASHION_BEAUTY, searchUrl: (q) => `https://www.namshi.com/saudi-en/search?q=${q}`, stockBias: 0.72, priceFactor: 0.96 },
  ],
};

const CATEGORY_BASE_USD_CENTS: Record<ProductCategory, [number, number]> = {
  home: [1500, 8000],
  electronics: [5000, 50000],
  shoes: [4000, 15000],
  clothing: [2000, 12000],
  accessories: [1500, 10000],
  beauty: [800, 6000],
};

function seededUnit(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function toLocalMinor(usdCents: number, market: MarketConfig): number {
  if (market.currency === "USD") return usdCents;
  const localMajor = (usdCents / 100) * market.usdRate;
  // JPY/KRW have no fractional unit — round to whole yen/won
  if (market.currency === "JPY" || market.currency === "KRW") {
    return Math.round(localMajor);
  }
  return Math.round(localMajor * 100);
}

function inStockForRetailer(seed: string, retailerId: string, bias: number): boolean {
  const roll = (seededUnit(`${seed}:${retailerId}`) % 100) / 100;
  return roll < bias;
}

export function isCountryCode(code: string): code is CountryCode {
  return code in MARKETS;
}

export function resolveCountry(code?: string, fallback: CountryCode = DEFAULT_COUNTRY): CountryCode {
  return code && isCountryCode(code) ? code : fallback;
}

export function getMarket(country: CountryCode): MarketConfig {
  return MARKETS[country] ?? MARKETS[DEFAULT_COUNTRY];
}

export function getRetailersForCategory(
  country: CountryCode,
  category: ProductCategory
): RetailerDef[] {
  const list = RETAILERS[country] ?? RETAILERS[DEFAULT_COUNTRY];
  return list.filter(
    (r) => r.categories === "all" || r.categories.includes(category)
  );
}

export function getRetailerNamesForCountry(country: CountryCode): string[] {
  return (RETAILERS[country] ?? RETAILERS[DEFAULT_COUNTRY]).map((r) => r.name);
}

export function buildSearchQueryRaw(productName: string, brand: string): string {
  return [productName, brand !== "Unknown" && brand !== "Various" ? brand : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export function buildSearchQuery(productName: string, brand: string): string {
  return encodeURIComponent(buildSearchQueryRaw(productName, brand));
}

export function buildRegionalOffers(
  productName: string,
  brand: string,
  category: ProductCategory,
  country: CountryCode = DEFAULT_COUNTRY
): RetailerOffer[] {
  const market = getMarket(country);
  const retailers = getRetailersForCategory(country, category);
  const [minUsd, maxUsd] = CATEGORY_BASE_USD_CENTS[category] ?? [2000, 10000];
  const seed = `${productName}:${brand}:${category}:${country}`;
  const baseUsdCents = minUsd + (seededUnit(seed) % (maxUsd - minUsd));
  const query = buildSearchQuery(productName, brand);

  return retailers.map((retailer) => {
    const priceFactor =
      retailer.priceFactor * (0.95 + (seededUnit(`${seed}:${retailer.id}`) % 10) / 100);
    const price = Math.round(toLocalMinor(baseUsdCents, market) * priceFactor);
    const url = retailer.searchUrl(query, market);
    const minorDivisor =
      market.currency === "JPY" || market.currency === "KRW" ? 1 : 100;
    const usdMajor = price / minorDivisor / market.usdRate;
    const priceHbar = Math.floor(
      (usdMajor / HBAR_USD_RATE) * 100_000_000
    ).toString();

    return {
      retailerId: retailer.id,
      retailerName: retailer.name,
      price,
      priceHbar,
      currency: market.currency,
      inStock: inStockForRetailer(seed, retailer.id, retailer.stockBias),
      url,
      affiliateUrl: url,
      lastUpdated: new Date().toISOString(),
    };
  });
}

/** Timezone prefix → country */
const TZ_COUNTRY: [string, CountryCode][] = [
  ["Asia/Kolkata", "IN"],
  ["Asia/Calcutta", "IN"],
  ["Asia/Dubai", "AE"],
  ["Europe/London", "GB"],
  ["America/Toronto", "CA"],
  ["America/Vancouver", "CA"],
  ["Australia/", "AU"],
  ["Europe/Berlin", "DE"],
  ["Europe/Paris", "FR"],
  ["Asia/Tokyo", "JP"],
  ["Asia/Singapore", "SG"],
  ["America/Sao_Paulo", "BR"],
  ["America/Mexico_City", "MX"],
  ["Asia/Seoul", "KR"],
  ["Asia/Riyadh", "SA"],
  ["America/New_York", "US"],
  ["America/Los_Angeles", "US"],
  ["America/Chicago", "US"],
];

/** BCP-47 suffix → country */
const LANG_COUNTRY: [string, CountryCode][] = [
  ["-IN", "IN"],
  ["-AE", "AE"],
  ["-GB", "GB"],
  ["-CA", "CA"],
  ["-AU", "AU"],
  ["-DE", "DE"],
  ["-FR", "FR"],
  ["-JP", "JP"],
  ["-SG", "SG"],
  ["-BR", "BR"],
  ["-MX", "MX"],
  ["-KR", "KR"],
  ["-SA", "SA"],
  ["-US", "US"],
];

export function detectCountryCode(): CountryCode {
  if (typeof window === "undefined") return DEFAULT_COUNTRY;

  const stored = localStorage.getItem("dora_market_country");
  if (stored && isCountryCode(stored)) return stored;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const [prefix, code] of TZ_COUNTRY) {
    if (tz.includes(prefix)) return code;
  }

  const lang = navigator.language;
  for (const [suffix, code] of LANG_COUNTRY) {
    if (lang.endsWith(suffix)) return code;
  }

  return "US";
}

export const COUNTRY_OPTIONS = Object.values(MARKETS).map((m) => ({
  code: m.code,
  label: m.label,
  currency: m.currency,
}));
