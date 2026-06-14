/**
 * Pinecone Vector Search
 *
 * Searches the product catalog for items matching the user's image.
 * Returns ranked results with confidence scores.
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { AI } from "@/lib/utils/constants";
import { buildRetailerListings, buildSearchSummary } from "@/lib/commerce/retailer-listings";
import { type CountryCode, DEFAULT_COUNTRY } from "@/lib/commerce/market";
import type { ProductMatch, VisionAnalysisResult } from "@/types/search";
import type { Product, ProductCategory, RetailerListing } from "@/types/product";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

function getPineconeClient(): Pinecone | null {
  if (!PINECONE_API_KEY) {
    console.warn("[Pinecone] API key not configured — using mock results");
    return null;
  }
  return new Pinecone({ apiKey: PINECONE_API_KEY });
}

/**
 * Query Pinecone for products similar to the embedding.
 */
export async function searchSimilarProducts(
  embedding: number[],
  analysis: VisionAnalysisResult,
  options?: {
    topK?: number;
    categoryFilter?: ProductCategory;
    minConfidence?: number;
    country?: CountryCode;
  }
): Promise<ProductMatch[]> {
  const country = options?.country ?? DEFAULT_COUNTRY;
  const pinecone = getPineconeClient();

  if (!pinecone) {
    return getMockResults(analysis, country);
  }

  try {
    const index = pinecone.index(AI.PINECONE_INDEX);

    const queryResponse = await index.query({
      vector: embedding,
      topK: options?.topK ?? AI.PINECONE_TOP_K,
      includeMetadata: true,
      filter: options?.categoryFilter
        ? { category: options.categoryFilter }
        : undefined,
    });

    const minConfidence = options?.minConfidence ?? AI.MIN_CONFIDENCE_SCORE;

    const pineconeResults = queryResponse.matches
      .filter((match) => (match.score ?? 0) >= minConfidence)
      .map((match) => {
        const metadata = match.metadata as Record<string, unknown> | undefined;
        const product = metadataToProduct(metadata, match.id);
        const retailers = (metadata?.retailers as RetailerListing[]) ?? [];

        return {
          product,
          confidence: match.score ?? 0,
          lowestPrice: Math.min(...(retailers.length > 0 ? retailers.map((r) => r.price) : [9999])),
          lowestPriceHbar:
            retailers.length > 0
              ? retailers.reduce((min, r) =>
                  BigInt(r.priceHbar) < BigInt(min.priceHbar) ? r : min
                ).priceHbar
              : "0",
          retailerCount: retailers.length,
          allRetailers: retailers,
        };
      });

    // If Pinecone index is empty, supplement with mock results using actual AI analysis
    if (pineconeResults.length === 0) {
      console.log("[Pinecone] Index empty — supplementing with mock results from AI analysis");
      return getMockResults(analysis, country);
    }

    return pineconeResults;
  } catch (error) {
    console.error("[Pinecone] Search error:", error);
    return getMockResults(analysis, country);
  }
}

function metadataToProduct(
  metadata: Record<string, unknown> | undefined,
  id: string
): Product {
  return {
    id,
    name: (metadata?.name as string) ?? "Unknown Product",
    brand: (metadata?.brand as string) ?? "Unknown",
    category: (metadata?.category as ProductCategory) ?? "clothing",
    description: (metadata?.description as string) ?? "",
    imageCid: (metadata?.imageCid as string) ?? "",
    attributes: (metadata?.attributes as Product["attributes"]) ?? {},
    embedding: [], // Not needed for results
    retailers: (metadata?.retailers as RetailerListing[]) ?? [],
    createdAt: (metadata?.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (metadata?.updatedAt as string) ?? new Date().toISOString(),
  };
}

/**
 * Generate relevant mock results from the AI vision analysis.
 * Uses the actual detected brand, category, and description to build
 * realistic-looking product matches with prices across retailers.
 */
function getMockResults(analysis: VisionAnalysisResult, country: CountryCode = DEFAULT_COUNTRY): ProductMatch[] {
  const brand = analysis.detectedBrand ?? "Unknown";
  const category = (analysis.detectedCategory ?? "accessories") as ProductCategory;
  const productName =
    analysis.identifiedProductName ??
    `${brand !== "Unknown" ? brand + " " : ""}${analysis.detectedAttributes?.color ? analysis.detectedAttributes.color + " " : ""}${category}`;
  const desc = analysis.gpt4vDescription || productName;

  const listings = buildRetailerListings(productName, brand, category, country);
  const summary = buildSearchSummary(listings);
  const inStock = listings.filter((l) => l.inStock);
  const pool = inStock.length > 0 ? inStock : listings;
  const best = pool.reduce((a, b) => (a.price < b.price ? a : b), pool[0]);

  return [
    {
      product: {
        id: `match-${Date.now()}`,
        name: productName,
        brand: brand !== "Unknown" ? brand : "Various",
        category,
        description: desc,
        imageCid: "",
        attributes: analysis.detectedAttributes,
        embedding: [],
        retailers: listings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      confidence: 0.82,
      lowestPrice: best?.price ?? 0,
      lowestPriceHbar: best?.priceHbar ?? "0",
      retailerCount: listings.length,
      allRetailers: listings,
      exactMatchFound: summary.exactMatchFound,
      matchSummary: summary.message,
    },
  ];
}
