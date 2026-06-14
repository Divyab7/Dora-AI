import { NextRequest, NextResponse } from "next/server";
import { fetchRetailerListings } from "@/lib/commerce/retailer-listings";
import { resolveCountry } from "@/lib/commerce/market";
import { priceCompareSchema } from "@/lib/utils/validators";
import type { ApiResponse, RetailerListing } from "@/types";

/**
 * POST /api/prices/compare
 *
 * Fetches real-time prices for a product across Amazon, Nike, and StockX.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ offers: RetailerListing[] }>>> {
  const requestId = `req-${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = priceCompareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid request",
        },
        requestId,
      }, { status: 400 });
    }

    const offers = await fetchRetailerListings(
      parsed.data.productId,
      "",
      "accessories",
      resolveCountry((body as { country?: string }).country)
    );

    return NextResponse.json({
      success: true,
      data: { offers },
      requestId,
    });
  } catch (error) {
    console.error("[Prices] Compare error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "PRICE_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Failed to fetch prices",
      },
      requestId,
    }, { status: 500 });
  }
}
