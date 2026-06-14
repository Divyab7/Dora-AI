import { NextRequest, NextResponse } from "next/server";
import { fetchCrossRetailerPrices } from "@/lib/ai/catalog";
import { priceCompareSchema } from "@/lib/utils/validators";
import type { ApiResponse, RetailerOffer } from "@/types";

/**
 * POST /api/prices/compare
 *
 * Fetches real-time prices for a product across Amazon, Nike, and StockX.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ offers: RetailerOffer[] }>>> {
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

    // Fetch prices from all retailers
    const offers = await fetchCrossRetailerPrices(
      parsed.data.productId,
      "" // brand would come from product lookup
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
