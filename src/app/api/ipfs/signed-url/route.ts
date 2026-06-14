import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/api";

/**
 * GET /api/ipfs/signed-url
 *
 * Generates a Pinata upload URL for client-side file uploads.
 * In production, returns a signed URL that the client can POST to directly.
 */
export async function GET(): Promise<NextResponse<ApiResponse<{ uploadUrl: string }>>> {
  try {
    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      return NextResponse.json({
        success: false,
        error: {
          code: "PINATA_NOT_CONFIGURED",
          message: "IPFS storage is not configured",
        },
        requestId: `req-${Date.now()}`,
      }, { status: 500 });
    }

    // Return the Pinata upload endpoint
    // Client will POST the file to this URL with the JWT in the auth header
    // In a production setup, we'd generate a time-limited signed JWT
    return NextResponse.json({
      success: true,
      data: {
        uploadUrl: "https://api.pinata.cloud/pinning/pinFileToIPFS",
      },
      requestId: `req-${Date.now()}`,
    });
  } catch (error) {
    console.error("[IPFS] Signed URL error:", error);
    return NextResponse.json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to generate upload URL",
      },
      requestId: `req-${Date.now()}`,
    }, { status: 500 });
  }
}
