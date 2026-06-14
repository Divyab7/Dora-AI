"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSearch } from "@/contexts/SearchContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScanRing } from "@/components/animations/ScanRing";
import { cn } from "@/lib/utils/cn";
import { ROUTES } from "@/lib/utils/constants";
import { parseApiResponse } from "@/lib/utils/api";
import type { VisionAnalysisResult } from "@/types/search";

type UploadState = "idle" | "uploading" | "analyzing";
type ScanMode = "upload" | "link";

const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  web: "Web page",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  const router = useRouter();
  const {
    imageUploaded,
    startAnalysis,
    analysisComplete,
    searchError,
    resetSearch,
  } = useSearch();

  const [scanMode, setScanMode] = useState<ScanMode>("upload");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const finishAnalysis = useCallback(
    (data: VisionAnalysisResult, previewUrl: string) => {
      const mockCid = `bafybeig${Date.now().toString(36)}`;
      imageUploaded(mockCid, previewUrl);
      analysisComplete(data);
      router.push(ROUTES.VERIFY);
    },
    [imageUploaded, analysisComplete, router]
  );

  const runAnalyze = useCallback(
    async (payload: { imageBase64?: string; url?: string }, previewUrl: string) => {
      setErrorMessage(null);
      resetSearch();
      setPreview(previewUrl);
      setUploadState("uploading");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        setUploadState("analyzing");
        startAnalysis();

        const analyzeRes = await fetch("/api/vision/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const analyzeData = await parseApiResponse<VisionAnalysisResult>(analyzeRes);

        if (!analyzeData.success || !analyzeData.data) {
          throw new Error(analyzeData.error?.message || "AI analysis failed. Please try again.");
        }

        const result = analyzeData.data;
        const displayPreview = result.imageDataUrl ?? previewUrl;
        if (result.sourceType && result.sourceType !== "upload") {
          setSourceLabel(SOURCE_LABELS[result.sourceType] ?? "Link");
        }

        finishAnalysis(result, displayPreview);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
        setErrorMessage(msg);
        searchError(msg);
        setUploadState("idle");
      }
    },
    [resetSearch, startAnalysis, finishAnalysis, searchError]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage("Please upload a JPG, PNG, WebP, or HEIC image");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("Image must be under 10MB");
        return;
      }

      setSourceLabel(null);
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1];
      await runAnalyze({ imageBase64: base64 }, dataUrl);
    },
    [runAnalyze]
  );

  const handleUrlSubmit = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage("Paste a link to analyze");
      return;
    }

    if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes(".")) {
      setErrorMessage("Enter a valid URL (e.g. https://youtube.com/shorts/...)");
      return;
    }

    setSourceLabel(null);
    await runAnalyze({ url: trimmed }, "");
  }, [urlInput, runAnalyze]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const resetForm = () => {
    setErrorMessage(null);
    setUploadState("idle");
    setPreview(null);
    setUrlInput("");
    setSourceLabel(null);
  };

  const isProcessing = uploadState === "uploading" || uploadState === "analyzing";

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Visual Search</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Upload a photo or paste a link — AI will identify the product and compare prices
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-400">Error</p>
              <p className="text-xs text-red-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={resetForm}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="w-full space-y-4">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--surface)] p-1">
          {(["upload", "link"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={isProcessing}
              onClick={() => setScanMode(mode)}
              className={cn(
                "inline-flex flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                "disabled:pointer-events-none disabled:opacity-50",
                scanMode === mode
                  ? "bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {mode === "upload" ? "Upload Photo" : "Paste Link"}
            </button>
          ))}
        </div>

        {scanMode === "upload" && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            className={`
              relative rounded-2xl border-2 border-dashed transition-all duration-200
              ${
                dragActive
                  ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                  : "border-[var(--border)] hover:border-[var(--border-hover)]"
              }
              ${isProcessing ? "pointer-events-none" : "cursor-pointer"}
            `}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              capture="environment"
              className="hidden"
              style={{ display: "none" }}
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />

            <UploadZone
              isProcessing={isProcessing}
              uploadState={uploadState}
              preview={preview}
              sourceLabel={sourceLabel}
            />
          </div>
        )}

        {scanMode === "link" && (
          <Card className="p-6 space-y-4">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <ScanRing active size={140} />
                <p className="text-sm text-[var(--accent)]">
                  {uploadState === "uploading" && "Fetching preview from link..."}
                  {uploadState === "analyzing" && "AI analyzing content..."}
                </p>
                <p className="text-xs text-[var(--text-muted)]">This may take up to 30 seconds</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="url-input"
                    className="text-sm font-medium text-[var(--text-primary)]"
                  >
                    Product or video link
                  </label>
                  <Input
                    id="url-input"
                    type="url"
                    placeholder="https://youtube.com/shorts/... or instagram.com/reel/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                  />
                </div>

                {preview && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
                    <Image
                      src={preview}
                      alt="Extracted preview"
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw"
                    />
                  </div>
                )}

                <Button
                  variant="accent"
                  className="w-full"
                  onClick={handleUrlSubmit}
                  disabled={!urlInput.trim()}
                >
                  Analyze link
                </Button>

                <p className="text-xs text-[var(--text-muted)] text-center">
                  Supports YouTube Shorts, Instagram, TikTok, and product pages
                </p>
              </>
            )}
          </Card>
        )}
      </div>

      <Card variant="flat" className="p-4 space-y-2">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Tips for best results</h3>
        <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
          <li>Upload a clear, well-lit photo centered on one item</li>
          <li>Paste a YouTube Short or Instagram reel showing the product</li>
          <li>Product page URLs from Amazon, Nike, Google Shopping also work</li>
          <li>Screenshots from social media are great for outfit posts</li>
        </ul>
      </Card>
    </div>
  );
}

function UploadZone({
  isProcessing,
  uploadState,
  preview,
  sourceLabel,
}: {
  isProcessing: boolean;
  uploadState: UploadState;
  preview: string | null;
  sourceLabel: string | null;
}) {
  return (
    <div className="p-12 flex flex-col items-center gap-4">
      {isProcessing ? (
        <>
          <ScanRing active size={160} />
          <p className="text-sm text-[var(--accent)]">
            {uploadState === "uploading" && "Preparing your image..."}
            {uploadState === "analyzing" && "AI analyzing your image..."}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Running multiple models for best accuracy...
          </p>
          <p className="text-xs text-[var(--text-muted)]">This may take up to 30 seconds</p>
        </>
      ) : preview ? (
        <div className="space-y-4 text-center">
          {sourceLabel && (
            <span className="text-xs text-[var(--accent)]">From {sourceLabel}</span>
          )}
          <Image
            src={preview}
            alt="Preview"
            width={300}
            height={300}
            className="max-h-64 rounded-xl object-contain mx-auto"
          />
          <p className="text-sm text-[var(--text-muted)]">Tap to choose a different image</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
              <line x1="16" y1="5" x2="22" y2="5" />
              <line x1="19" y1="2" x2="19" y2="8" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drop an image here or tap to browse
            </p>
            <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WebP, HEIC up to 10MB</p>
          </div>
        </>
      )}
    </div>
  );
}
