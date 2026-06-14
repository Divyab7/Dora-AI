import type { VisionAnalysisResult, ProductMatch } from "@/types/search";
import type { RetailerListing } from "@/types/product";
import type { PendingAgentTransaction } from "@/lib/agent/types";

export type ChatMessageRole = "user" | "assistant";

export type ChatMessageKind =
  | "text"
  | "image"
  | "link"
  | "analysis"
  | "search_results"
  | "loading"
  | "wallet_prompt"
  | "mandate_prompt"
  | "unlock_prompt";

export interface ChatMessageBase {
  id: string;
  role: ChatMessageRole;
  kind: ChatMessageKind;
  createdAt: number;
}

export interface TextChatMessage extends ChatMessageBase {
  kind: "text";
  content: string;
}

export interface ImageChatMessage extends ChatMessageBase {
  kind: "image";
  previewUrl: string;
  caption?: string;
}

export interface LinkChatMessage extends ChatMessageBase {
  kind: "link";
  url: string;
  sourceLabel?: string;
}

export interface AnalysisChatMessage extends ChatMessageBase {
  kind: "analysis";
  analysis: VisionAnalysisResult;
  previewUrl?: string;
}

export interface SearchResultsChatMessage extends ChatMessageBase {
  kind: "search_results";
  productName: string;
  brand: string;
  productId: string;
  listings: RetailerListing[];
  summary?: string;
  hasExactMatch?: boolean;
}

export interface LoadingChatMessage extends ChatMessageBase {
  kind: "loading";
  label: string;
}

export interface WalletPromptChatMessage extends ChatMessageBase {
  kind: "wallet_prompt";
  reason: string;
}

export interface MandatePromptChatMessage extends ChatMessageBase {
  kind: "mandate_prompt";
  maxSpendHbar: string;
}

export interface UnlockPromptChatMessage extends ChatMessageBase {
  kind: "unlock_prompt";
}

export type ChatMessage =
  | TextChatMessage
  | ImageChatMessage
  | LinkChatMessage
  | AnalysisChatMessage
  | SearchResultsChatMessage
  | LoadingChatMessage
  | WalletPromptChatMessage
  | MandatePromptChatMessage
  | UnlockPromptChatMessage;

export interface ChatPayTarget {
  listing: RetailerListing;
  productId: string;
  productName: string;
  brand: string;
}

export interface ChatPendingPayment {
  tx: PendingAgentTransaction;
  amountHbar: string;
  label: string;
}

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseSearchToolResult(raw: unknown): SearchResultsChatMessage["listings"] | null {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed?.listings || !Array.isArray(parsed.listings)) return null;
    return parsed.listings.map(
      (l: {
        retailer: string;
        title: string;
        priceLocal: string;
        priceHbar: string;
        match: string;
        url: string;
      }) => ({
        retailerId: l.retailer.toLowerCase().replace(/\s+/g, "-"),
        retailerName: l.retailer,
        listingTitle: l.title,
        price: 0,
        priceHbar: l.priceHbar.replace(/[^\d]/g, "") || "0",
        currency: "USD",
        inStock: true,
        url: l.url,
        affiliateUrl: l.url,
        lastUpdated: new Date().toISOString(),
        matchQuality: l.match as "exact" | "close" | "alternative",
        matchScore: l.match === "exact" ? 0.95 : l.match === "close" ? 0.75 : 0.5,
      })
    );
  } catch {
    return null;
  }
}

export function productMatchToSearchMessage(
  match: ProductMatch,
  analysis?: VisionAnalysisResult | null
): Omit<SearchResultsChatMessage, "id" | "role" | "kind" | "createdAt"> {
  return {
    productName: analysis?.identifiedProductName || match.product.name,
    brand: match.product.brand,
    productId: match.product.id,
    listings: match.allRetailers,
    summary: match.matchSummary,
    hasExactMatch: match.exactMatchFound ?? match.allRetailers.some((l) => l.matchQuality === "exact"),
  };
}
