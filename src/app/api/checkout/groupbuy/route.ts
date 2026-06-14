import { NextRequest, NextResponse } from "next/server";
import { groupBuyCreateSchema } from "@/lib/utils/validators";
import type { ApiResponse } from "@/types/api";

/**
 * POST /api/checkout/groupbuy
 *
 * Creates a new Group Buy with an escrow smart contract.
 * Returns contract ID and invite details.
 */
export async function POST(
  request: NextRequest
): Promise<
  NextResponse<
    ApiResponse<{
      groupId: string;
      escrowContractId: string;
      perPersonAmountHbar: string;
      inviteUrl: string;
    }>
  >
> {
  const requestId = `req-${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = groupBuyCreateSchema.safeParse(body);

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

    const { items, participantCount } = parsed.data;

    const totalTinybar = items.reduce(
      (sum, item) => sum + BigInt(item.priceHbar) * BigInt(item.quantity),
      BigInt(0)
    );

    // Add 1% fee
    const fee = (totalTinybar * BigInt(100)) / BigInt(10000);
    const totalWithFee = totalTinybar + fee;
    const perPerson = totalWithFee / BigInt(participantCount);

    const groupId = `gb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

    // In production: deploy EscrowContract here
    // const { contractId } = await deployEscrowContract({...})
    const escrowContractId = `0.0.${Math.floor(Math.random() * 1000000) + 5000000}`;

    return NextResponse.json({
      success: true,
      data: {
        groupId,
        escrowContractId,
        perPersonAmountHbar: perPerson.toString(),
        inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/groupbuy/${groupId}`,
      },
      requestId,
    });
  } catch (error) {
    console.error("[GroupBuy] Error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "GROUPBUY_FAILED",
        message: error instanceof Error ? error.message : "Failed to create group buy",
      },
      requestId,
    }, { status: 500 });
  }
}
