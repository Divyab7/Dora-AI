"use client";

import { cn } from "@/lib/utils/cn";

interface ScanRingProps {
  active?: boolean;
  size?: number;
  className?: string;
}

export function ScanRing({ active = true, size = 200, className }: ScanRingProps) {
  if (!active) return null;

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/30" />

      {/* Animated scanning rings */}
      <div
        className="absolute inset-0 rounded-full border-2 border-[var(--accent)]/60 animate-scan-ring"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute inset-0 rounded-full border border-[var(--accent)]/40 animate-scan-ring"
        style={{ animationDelay: "0.5s" }}
      />
      <div
        className="absolute inset-0 rounded-full border border-[var(--accent)]/20 animate-scan-ring"
        style={{ animationDelay: "1s" }}
      />

      {/* Inner glow */}
      <div className="absolute inset-4 rounded-full bg-[var(--accent-dim)] flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      </div>
    </div>
  );
}
