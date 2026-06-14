"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearch } from "@/contexts/SearchContext";
import { useMarket } from "@/contexts/MarketContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScanRing } from "@/components/animations/ScanRing";
import { AI, ROUTES } from "@/lib/utils/constants";
import { parseApiResponse } from "@/lib/utils/api";
import type { ProductMatch } from "@/types/search";

export default function VerifyPage() {
  const router = useRouter();
  const {
    imagePreview,
    analysisResult,
    stage,
    startSearch,
    searchComplete,
    searchError,
    resetSearch,
  } = useSearch();
  const { country } = useMarket();

  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!imagePreview || !analysisResult) {
      if (stage === "idle" || stage === "error") {
        router.replace(ROUTES.SCAN);
      }
    }
  }, [imagePreview, analysisResult, stage, router]);

  if (!imagePreview || !analysisResult) {
    return (
      <div className="p-4 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <ScanRing active size={120} />
      </div>
    );
  }

  const confidence = analysisResult.confidence;
  const confidencePct = Math.round(confidence * 100);
  const isLowConfidence = confidence < AI.MIN_VISION_CONFIDENCE;
  const brand = analysisResult.detectedBrand ?? "Unknown brand";
  const category = analysisResult.detectedCategory ?? "item";
  const color = analysisResult.detectedAttributes?.color;
  const style = analysisResult.detectedAttributes?.style;
  const productTitle =
    analysisResult.identifiedProductName ??
    (brand !== "Unknown brand" ? `${brand} ${category}` : category);

  const sourceLabels: Record<string, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    web: "Web link",
  };

  const retryTips =
    analysisResult.retrySuggestions && analysisResult.retrySuggestions.length > 0
      ? analysisResult.retrySuggestions
      : [
          "A closer crop of the single item you want",
          "Better lighting — avoid shadows and glare",
          "A plain background with less clutter",
          "A screenshot from the retailer if you have one",
        ];

  async function handleConfirm() {
    setIsSearching(true);
    startSearch();

    try {
      const searchRes = await fetch("/api/vision/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedding: analysisResult!.embedding,
          analysis: analysisResult,
          country,
        }),
      });

      const searchData = await parseApiResponse<{ matches: ProductMatch[] }>(searchRes);

      if (!searchData.success) {
        throw new Error(searchData.error?.message || "Search failed");
      }

      searchComplete(searchData.data?.matches || []);
      router.push(ROUTES.RESULTS);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Search failed. Please try again.";
      searchError(msg);
      setIsSearching(false);
    }
  }

  function handleReupload() {
    resetSearch();
    router.push(ROUTES.SCAN);
  }

  if (isSearching) {
    return (
      <div className="p-4 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ScanRing active size={140} />
        <p className="text-sm text-[var(--accent)]">Finding best prices...</p>
        <p className="text-xs text-[var(--text-muted)]">Comparing retailers</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {isLowConfidence ? "We need a clearer photo" : "Verify your item"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {isLowConfidence
            ? "We tried multiple AI models but couldn't identify this item confidently."
            : "Check that our AI identified the right product before we search for prices."}
        </p>
        {analysisResult.sourceUrl && analysisResult.sourceType && analysisResult.sourceType !== "upload" && (
          <p className="text-xs text-[var(--text-muted)]">
            From {sourceLabels[analysisResult.sourceType] ?? "link"}:{" "}
            <a
              href={analysisResult.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              {analysisResult.sourceUrl.length > 50
                ? `${analysisResult.sourceUrl.slice(0, 50)}...`
                : analysisResult.sourceUrl}
            </a>
          </p>
        )}
      </div>

      {/* Side-by-side compare */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
          <div className="p-4 space-y-2">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              {analysisResult.sourceType && analysisResult.sourceType !== "upload"
                ? "Extracted preview"
                : "Your photo"}
            </p>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
              <Image
                src={imagePreview}
                alt="Your uploaded photo"
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
              AI identified as
            </p>

            {analysisResult.pipelineWarning && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
                {analysisResult.pipelineWarning}
              </div>
            )}

            {isLowConfidence ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-300">
                    Confidence too low ({confidencePct}%) to search reliably.
                  </p>
                </div>
                {analysisResult.gpt4vDescription && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-4">
                    Best guess: {analysisResult.gpt4vDescription}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      confidence >= 0.7 ? "success" : confidence >= 0.5 ? "warning" : "default"
                    }
                    size="sm"
                  >
                    {confidencePct}% confident
                  </Badge>
                  {analysisResult.modelUsed && (
                    <Badge variant="default" size="sm">
                      {analysisResult.modelUsed}
                    </Badge>
                  )}
                  {analysisResult.imageQuality && (
                    <Badge variant="default" size="sm">
                      {analysisResult.imageQuality} quality
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {productTitle}
                  </p>
                  {color && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      Color: {color}
                      {style ? ` · ${style}` : ""}
                    </p>
                  )}
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-4">
                  {analysisResult.gpt4vDescription}
                </p>

                {confidence < 0.6 && (
                  <p className="text-xs text-amber-400/90">
                    Moderate confidence — double-check the identification below.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {isLowConfidence ? (
        <div className="space-y-4">
          <Card variant="flat" className="p-4 space-y-2">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Try uploading again with:
            </h3>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
              {retryTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            {analysisResult.pipelineAttempts && analysisResult.pipelineAttempts.length > 0 && (
              <p className="text-[10px] text-[var(--text-muted)] pt-2">
                Tried: {analysisResult.pipelineAttempts.join(" → ")}
              </p>
            )}
          </Card>

          <Button variant="accent" className="w-full" onClick={handleReupload}>
            Upload a clearer photo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Is this the item you&apos;re looking for?
          </p>
          <Button variant="accent" className="w-full" onClick={handleConfirm}>
            Yes — find prices
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleReupload}>
            No — upload a different photo
          </Button>
        </div>
      )}
    </div>
  );
}
