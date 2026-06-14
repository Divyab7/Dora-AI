// ============================================
// Search Types
// ============================================

import type { Product, ProductCategory, ProductAttributes, RetailerOffer } from "./product";

export interface VisionLabel {
  description: string;
  score: number;
  topicality: number;
}

export type AnalysisStatus = "success" | "low_confidence" | "failed";

export type UrlSourceType = "youtube" | "instagram" | "tiktok" | "web";

export interface ImageClassifierMeta {
  imageType: string;
  itemCount: number;
  mainFocus: string;
  hasBrandLogo: boolean;
  hasText: boolean;
  hasMultipleItems: boolean;
  imageQuality: "high" | "medium" | "low";
}

export interface VisionAnalysisResult {
  labels: VisionLabel[];
  gpt4vDescription: string;
  detectedBrand: string | null;
  detectedCategory: ProductCategory | null;
  detectedAttributes: Partial<ProductAttributes>;
  confidence: number; // 0-1
  embedding: number[]; // 1536-dim
  modelUsed?: string;
  identifiedProductName?: string;
  imageType?: string;
  imageQuality?: ImageClassifierMeta["imageQuality"];
  analysisStatus?: AnalysisStatus;
  retrySuggestions?: string[];
  pipelineAttempts?: string[];
  sourceUrl?: string;
  sourceType?: UrlSourceType | "upload";
  /** Server-returned preview for URL extractions */
  imageDataUrl?: string;
}

export interface ProductMatch {
  product: Product;
  confidence: number; // 0-1 cosine similarity
  lowestPrice: number;
  lowestPriceHbar: string;
  retailerCount: number;
  allRetailers: RetailerOffer[];
}

export interface SearchHistoryEntry {
  id: string;
  imageCid: string;
  imagePreview?: string; // local blob URL (not persisted)
  query: string;
  resultsCount: number;
  topMatch: string;
  timestamp: string;
}

export type SearchStage =
  | "idle"
  | "capturing"
  | "uploading"
  | "analyzing"
  | "verify"
  | "searching"
  | "results"
  | "error";
