import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildUnlockSearchBytes } from "@/lib/agent/unlock-search-tx";
import { SEARCH_UNLOCK_HBAR } from "@/lib/agent/agent-config";

const BodySchema = z.object({
  accountId: z.string().regex(/^0\.0\.\d+$/),
});

export async function POST(req: NextRequest) {
  try {
    const { accountId } = BodySchema.parse(await req.json());
    const bytesBase64 = await buildUnlockSearchBytes(accountId);

    return NextResponse.json({
      success: true,
      pendingTransaction: {
        bytesBase64,
        humanMessage: `Unlock store search for ${SEARCH_UNLOCK_HBAR} ℏ (24 hours)`,
        toolName: "unlock_search_access",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to build unlock transaction",
      },
      { status: 400 }
    );
  }
}
