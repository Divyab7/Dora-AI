// ============================================
// Product Types
// ============================================

export type ProductCategory =
  | "clothing"
  | "shoes"
  | "accessories"
  | "electronics"
  | "home"
  | "beauty";

export interface ProductAttributes {
  color?: string;
  material?: string;
  size?: string[];
  style?: string;
  season?: string;
  gender?: "men" | "women" | "unisex" | "kids";
}

export type MatchQuality = "exact" | "close" | "alternative";

export interface RetailerOffer {
  retailerId: string;
  retailerName: string;
  price: number; // smallest currency unit (paise, cents, etc.)
  priceHbar: string; // tinybar as string (BigInt safe)
  currency: string;
  inStock: boolean;
  url: string;
  affiliateUrl: string;
  lastUpdated: string; // ISO 8601
}

/** A specific product listing found on a retailer */
export interface RetailerListing extends RetailerOffer {
  listingTitle: string;
  productImageUrl?: string;
  matchQuality: MatchQuality;
  matchScore: number; // 0–1
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  imageCid: string; // IPFS CID
  attributes: ProductAttributes;
  embedding: number[]; // 1536-dim Pinecone vector
  retailers: RetailerOffer[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryPoint {
  timestamp: string;
  price: number;
  priceHbar: string;
  retailerId: string;
}
