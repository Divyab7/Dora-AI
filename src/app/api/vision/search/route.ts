import { NextRequest, NextResponse } from "next/server";
import { searchSimilarProducts } from "@/lib/ai/search";
import { enrichWithPrices } from "@/lib/ai/catalog";
import { resolveCountry } from "@/lib/commerce/market";
import type { ApiResponse, ProductMatch, VisionAnalysisResult } from "@/types";

/**
 * POST /api/vision/search
 *
 * Body: { embedding: number[], analysis: VisionAnalysisResult }
 *
 * Searches Pinecone for products matching the embedding vector,
 * enriches results with live retailer prices.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ matches: ProductMatch[] }>>> {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const body = await request.json();
    const { embedding, analysis, country } = body as {
      embedding: number[];
      analysis: VisionAnalysisResult;
      country?: string;
    };

    if (!embedding || embedding.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: "MISSING_EMBEDDING",
          message: "Embedding vector is required",
        },
        requestId,
      }, { status: 400 });
    }

    // Search Pinecone for similar products
    const marketCountry = resolveCountry(country);

    const matches = await searchSimilarProducts(embedding, analysis || {}, {
      country: marketCountry,
    });

    const enriched = await enrichWithPrices(matches, marketCountry);

    return NextResponse.json({
      success: true,
      data: { matches: enriched },
      requestId,
    });
  } catch (error) {
    console.error("[Vision Search] Error:", error);

    return NextResponse.json({
      success: false,
      error: {
        code: "SEARCH_FAILED",
        message: error instanceof Error ? error.message : "Search failed",
      },
      requestId,
    }, { status: 500 });
  }
}
