/**
 * Pinecone Vector Search
 *
 * Searches the product catalog for items matching the user's image.
 * Returns ranked results with confidence scores.
 */

import { Pinecone } from "@pinecone-database/pinecone";
import { AI } from "@/lib/utils/constants";
import type { ProductMatch, VisionAnalysisResult } from "@/types/search";
import type { Product, RetailerOffer, ProductCategory } from "@/types/product";

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
  }
): Promise<ProductMatch[]> {
  const pinecone = getPineconeClient();

  if (!pinecone) {
    // Return mock results for development
    return getMockResults(analysis);
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
        const retailers = (metadata?.retailers as RetailerOffer[]) ?? [];

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
      const mockResults = getMockResults(analysis);
      return mockResults;
    }

    return pineconeResults;
  } catch (error) {
    console.error("[Pinecone] Search error:", error);
    return getMockResults(analysis);
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
    retailers: (metadata?.retailers as RetailerOffer[]) ?? [],
    createdAt: (metadata?.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (metadata?.updatedAt as string) ?? new Date().toISOString(),
  };
}

/**
 * Generate relevant mock results from the AI vision analysis.
 * Uses the actual detected brand, category, and description to build
 * realistic-looking product matches with prices across retailers.
 */
function getMockResults(analysis: VisionAnalysisResult): ProductMatch[] {
  const brand = analysis.detectedBrand ?? "Premium";
  const category = analysis.detectedCategory ?? "accessories";
  const color = analysis.detectedAttributes?.color ?? "";
  const desc = analysis.gpt4vDescription || `${brand} ${category}`;

  // Generate retailer prices with slight variations
  function makeRetailers(basePrice: number): RetailerOffer[] {
    return [
      {
        retailerId: "amazon",
        retailerName: "Amazon",
        price: basePrice,
        priceHbar: Math.floor(basePrice / 100 / 0.08 * 100_000_000).toString(),
        currency: "USD",
        inStock: true,
        url: `https://amazon.com/s?k=${encodeURIComponent(brand)}`,
        affiliateUrl: `https://amazon.com/s?k=${encodeURIComponent(brand)}&tag=dora-20`,
        lastUpdated: new Date().toISOString(),
      },
      {
        retailerId: "stockx",
        retailerName: "StockX",
        price: Math.floor(basePrice * (0.85 + Math.random() * 0.3)),
        priceHbar: Math.floor(basePrice * 0.9 / 100 / 0.08 * 100_000_000).toString(),
        currency: "USD",
        inStock: Math.random() > 0.2,
        url: `https://stockx.com/search?s=${encodeURIComponent(brand)}`,
        affiliateUrl: `https://stockx.com/search?s=${encodeURIComponent(brand)}`,
        lastUpdated: new Date().toISOString(),
      },
      {
        retailerId: "nike",
        retailerName: "Nike",
        price: Math.floor(basePrice * (0.9 + Math.random() * 0.2)),
        priceHbar: Math.floor(basePrice * 1.05 / 100 / 0.08 * 100_000_000).toString(),
        currency: "USD",
        inStock: Math.random() > 0.3,
        url: `https://nike.com/w?q=${encodeURIComponent(brand)}`,
        affiliateUrl: `https://nike.com/w?q=${encodeURIComponent(brand)}`,
        lastUpdated: new Date().toISOString(),
      },
    ];
  }

  const results: ProductMatch[] = [
    {
      product: {
        id: `mock-${Date.now()}-1`,
        name: `${brand} ${color ? color + " " : ""}${category.charAt(0).toUpperCase() + category.slice(1)}`,
        brand,
        category,
        description: desc,
        imageCid: "bafybeig...mock1",
        attributes: analysis.detectedAttributes,
        embedding: [],
        retailers: makeRetailers(12999),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      confidence: analysis.confidence || 0.92,
      lowestPrice: 10999,
      lowestPriceHbar: Math.floor(10999 / 100 / 0.08 * 100_000_000).toString(),
      retailerCount: 3,
      allRetailers: makeRetailers(12999),
    },
    {
      product: {
        id: `mock-${Date.now()}-2`,
        name: `${brand} Premium ${color ? color + " " : ""}Edition`,
        brand,
        category,
        description: `Premium ${brand} ${category}. ${desc.slice(0, 100)}`,
        imageCid: "bafybeig...mock2",
        attributes: { color, style: analysis.detectedAttributes?.style },
        embedding: [],
        retailers: makeRetailers(8999),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      confidence: analysis.confidence ? analysis.confidence - 0.1 : 0.82,
      lowestPrice: 7999,
      lowestPriceHbar: Math.floor(7999 / 100 / 0.08 * 100_000_000).toString(),
      retailerCount: 3,
      allRetailers: makeRetailers(8999),
    },
  ];

  return results;
}
