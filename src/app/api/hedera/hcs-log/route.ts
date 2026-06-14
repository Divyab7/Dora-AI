import { NextRequest, NextResponse } from "next/server";
import { submitHCSEvent } from "@/lib/hedera/hcs";
import { hcsLogSchema } from "@/lib/utils/validators";
import type { ApiResponse } from "@/types/api";

/**
 * POST /api/hedera/hcs-log
 *
 * Logs an event to the appropriate HCS topic.
 * Events are immutable once submitted to Hedera Consensus.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ sequenceNumber: number }>>> {
  const requestId = `req-${Date.now()}`;

  try {
    const body = await request.json();
    const parsed = hcsLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid event",
        },
        requestId,
      }, { status: 400 });
    }

    const { sequenceNumber } = await submitHCSEvent({
      eventType: parsed.data.eventType,
      payload: parsed.data.payload,
      timestamp: new Date().toISOString(),
      accountId: parsed.data.accountId,
    });

    return NextResponse.json({
      success: true,
      data: { sequenceNumber },
      requestId,
    });
  } catch (error) {
    console.error("[HCS] Log error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "HCS_LOG_FAILED",
        message: error instanceof Error ? error.message : "Failed to log event",
      },
      requestId,
    }, { status: 500 });
  }
}
