import { NextRequest, NextResponse } from "next/server";
import { analyzeProductImage } from "@/lib/ai/vision";
import { generateSearchEmbedding } from "@/lib/ai/embeddings";
import { extractImageFromUrl, isSupportedUrl } from "@/lib/ai/url-extract";
import type { ApiResponse, VisionAnalysisResult } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/vision/analyze
 *
 * Body: { imageBase64: string } | { url: string }
 *
 * Analyzes a product image (upload or extracted from URL).
 * Returns labels, detected brand/category, confidence, and embedding.
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<VisionAnalysisResult>>> {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  try {
    const body = await request.json();
    const { imageBase64, url } = body as { imageBase64?: string; url?: string };

    if (!imageBase64 && !url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_INPUT",
            message: "Provide imageBase64 or url",
          },
          requestId,
        },
        { status: 400 }
      );
    }

    let base64Data: string;
    let mimeType = "image/jpeg";
    let sourceUrl: string | undefined;
    let sourceType: VisionAnalysisResult["sourceType"] = "upload";
    let imageDataUrl: string | undefined;

    if (url) {
      if (!isSupportedUrl(url)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_URL",
              message: "Please provide a valid http(s) link",
            },
            requestId,
          },
          { status: 400 }
        );
      }

      const extracted = await extractImageFromUrl(url);
      base64Data = extracted.base64;
      mimeType = extracted.mimeType;
      sourceUrl = extracted.sourceUrl;
      sourceType = extracted.sourceType;
      imageDataUrl = extracted.dataUrl;
    } else {
      base64Data = imageBase64!.replace(/^data:image\/\w+;base64,/, "");

      const mimeMatch = imageBase64!.match(/^data:(image\/[\w+.-]+);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];

      if (base64Data.length < 100) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_IMAGE",
              message: "Image data is too small or invalid",
            },
            requestId,
          },
          { status: 400 }
        );
      }
    }

    const analysis = await analyzeProductImage(base64Data, {
      mimeType,
      sourceUrl,
      sourceType,
      skipPreprocess: Boolean(url),
    });

    const embedding = await generateSearchEmbedding(
      analysis.gpt4vDescription,
      analysis.detectedBrand,
      analysis.detectedCategory
    );

    const result: VisionAnalysisResult = {
      ...analysis,
      embedding,
      imageDataUrl: imageDataUrl ?? analysis.imageDataUrl,
      sourceUrl,
      sourceType,
    };

    return NextResponse.json({
      success: true,
      data: result,
      requestId,
    });
  } catch (error) {
    console.error("[Vision Analyze] Error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown analysis error";

    const code = message.includes("not configured")
      ? "API_NOT_CONFIGURED"
      : message.includes("Could not") || message.includes("No preview")
        ? "URL_EXTRACT_FAILED"
        : "ANALYSIS_FAILED";

    return NextResponse.json(
      {
        success: false,
        error: { code, message },
        requestId,
      },
      { status: code === "API_NOT_CONFIGURED" ? 503 : 500 }
    );
  }
}
