"use client";

import { cn } from "@/lib/utils/cn";

interface SlideInProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}

export function SlideIn({
  children,
  direction = "up",
  delay = 0,
  className,
}: SlideInProps) {
  const animClass =
    direction === "up"
      ? "animate-slide-up"
      : direction === "down"
        ? "animate-slide-down"
        : "animate-fade-in";

  return (
    <div
      className={cn(animClass, className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}
