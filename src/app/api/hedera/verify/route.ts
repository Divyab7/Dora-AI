import { NextRequest, NextResponse } from "next/server";
import { getMirrorNodeUrl } from "@/lib/hedera/client";
import type { ApiResponse } from "@/types/api";

/**
 * GET /api/hedera/verify?txId=...
 *
 * Verifies a transaction on the Hedera network via mirror node.
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ status: string; txId: string }>>> {
  const requestId = `req-${Date.now()}`;
  const txId = request.nextUrl.searchParams.get("txId");

  if (!txId) {
    return NextResponse.json({
      success: false,
      error: { code: "MISSING_TX_ID", message: "txId query parameter required" },
      requestId,
    }, { status: 400 });
  }

  try {
    const mirrorUrl = getMirrorNodeUrl();
    const response = await fetch(
      `${mirrorUrl}/api/v1/transactions/${txId}`
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: {
          code: "TX_NOT_FOUND",
          message: "Transaction not found on mirror node",
        },
        requestId,
      }, { status: 404 });
    }

    const data = await response.json();
    const status = data.transactions?.[0]?.result || "UNKNOWN";

    return NextResponse.json({
      success: true,
      data: { status, txId },
      requestId,
    });
  } catch (error) {
    console.error("[Hedera Verify] Error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "VERIFY_FAILED",
        message: "Failed to verify transaction",
      },
      requestId,
    }, { status: 500 });
  }
}
