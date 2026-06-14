import { NextRequest, NextResponse } from "next/server";
import { buildPayIn3Schedule } from "@/lib/hedera/payments";
import { checkoutRequestSchema } from "@/lib/utils/validators";
import type { ApiResponse } from "@/types/api";

/**
 * POST /api/checkout/payin3
 *
 * Creates a scheduled payment plan with 3 installments (MPP).
 */
export async function POST(
  request: NextRequest
): Promise<
  NextResponse<
    ApiResponse<{
      scheduleId: string;
      installments: Array<{
        number: number;
        amountTinybar: string;
        dueTimestamp: string;
      }>;
    }>
  >
> {
  const requestId = `req-${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = checkoutRequestSchema.safeParse(body);

    if (!parsed.success || parsed.data.paymentMethod !== "payin3") {
      return NextResponse.json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid PayIn3 checkout request",
        },
        requestId,
      }, { status: 400 });
    }

    const { items, accountId } = parsed.data;

    const totalTinybar = items.reduce(
      (sum, item) => sum + BigInt(item.priceHbar) * BigInt(item.quantity),
      BigInt(0)
    );

    // Add 3% total fee (1% tx + 2% PayIn3)
    const fee = (totalTinybar * BigInt(300)) / BigInt(10000);
    const totalWithFee = totalTinybar + fee;

    const { scheduleId, installments } = await buildPayIn3Schedule({
      fromAccountId: accountId,
      totalAmountTinybar: totalWithFee.toString(),
      memo: `Dora-AI PayIn3: ${items.length} item(s)`,
    });

    return NextResponse.json({
      success: true,
      data: {
        scheduleId,
        installments: installments.map((inst) => ({
          number: inst.number,
          amountTinybar: inst.amountTinybar,
          dueTimestamp: inst.dueTimestamp,
        })),
      },
      requestId,
    });
  } catch (error) {
    console.error("[PayIn3] Error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "PAYIN3_FAILED",
        message: error instanceof Error ? error.message : "Failed to create PayIn3 schedule",
      },
      requestId,
    }, { status: 500 });
  }
}
