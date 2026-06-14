"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import type { VisionAnalysisResult } from "@/types/search";

interface ChatAnalysisCardProps {
  analysis: VisionAnalysisResult;
  previewUrl?: string;
}

export function ChatAnalysisCard({ analysis, previewUrl }: ChatAnalysisCardProps) {
  const confidence = Math.round((analysis.confidence ?? 0) * 100);
  const name = analysis.identifiedProductName || "Product";
  const lowConfidence = confidence < 35;

  return (
    <div className="space-y-3 w-full max-w-md">
      {previewUrl && (
        <div className="relative w-full max-w-[200px] aspect-square rounded-xl overflow-hidden border border-[var(--border)]">
          <Image src={previewUrl} alt="Your upload" fill className="object-cover" unoptimized />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-[var(--text-muted)]">I think this is</p>
        <p className="text-base font-semibold text-[var(--text-primary)]">{name}</p>
        {analysis.detectedBrand && analysis.detectedBrand !== "unknown" && (
          <p className="text-sm text-[var(--text-secondary)]">{analysis.detectedBrand}</p>
        )}
        {analysis.detectedCategory && (
          <p className="text-xs text-[var(--text-muted)] capitalize">{analysis.detectedCategory}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={lowConfidence ? "warning" : "success"} size="sm">
          {confidence}% confident
        </Badge>
        {analysis.modelUsed && (
          <span className="text-[10px] text-[var(--text-muted)]">{analysis.modelUsed}</span>
        )}
      </div>

      {analysis.gpt4vDescription && (
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
          {analysis.gpt4vDescription}
        </p>
      )}

      {lowConfidence && (
        <p className="text-xs text-amber-400/90">
          Try a clearer photo — single item, good lighting, plain background.
        </p>
      )}
    </div>
  );
}
