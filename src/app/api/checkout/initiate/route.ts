import { NextRequest, NextResponse } from "next/server";
import { buildPaymentTransaction } from "@/lib/hedera/payments";
import { checkoutRequestSchema } from "@/lib/utils/validators";
import type { ApiResponse } from "@/types/api";

/**
 * POST /api/checkout/initiate
 *
 * Builds a TransferTransaction for full HBAR payment.
 * Returns transaction bytes for the wallet to sign.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ transactionBytes: string; transactionId: string }>>> {
  const requestId = `req-${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);

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

    const { items, accountId } = parsed.data;

    // Calculate total in tinybar
    const totalTinybar = items.reduce(
      (sum, item) => sum + BigInt(item.priceHbar) * BigInt(item.quantity),
      BigInt(0)
    );

    // Add 1% fee
    const fee = (totalTinybar * BigInt(100)) / BigInt(10000);
    const totalWithFee = totalTinybar + fee;

    // Build the transaction
    const { transactionBytes, transactionId } = await buildPaymentTransaction({
      fromAccountId: accountId,
      amountTinybar: totalWithFee.toString(),
      memo: `Dora-AI Purchase: ${items.length} item(s)`,
    });

    // Convert bytes to base64 for JSON transport
    const base64Bytes = Buffer.from(transactionBytes).toString("base64");

    return NextResponse.json({
      success: true,
      data: {
        transactionBytes: base64Bytes,
        transactionId,
      },
      requestId,
    });
  } catch (error) {
    console.error("[Checkout] Initiate error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "CHECKOUT_FAILED",
        message: error instanceof Error ? error.message : "Failed to initiate checkout",
      },
      requestId,
    }, { status: 500 });
  }
}
