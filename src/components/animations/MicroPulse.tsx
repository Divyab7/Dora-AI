"use client";

import { cn } from "@/lib/utils/cn";

interface MicroPulseProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps content in a subtle pulsing green glow animation.
 */
export function MicroPulse({ children, className }: MicroPulseProps) {
  return (
    <div className={cn("animate-pulse-green rounded-2xl", className)}>
      {children}
    </div>
  );
}
