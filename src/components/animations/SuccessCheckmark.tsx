"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SuccessCheckmarkProps {
  size?: number;
  className?: string;
}

export function SuccessCheckmark({ size = 64, className }: SuccessCheckmarkProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 52 52"
        style={{ width: size, height: size }}
        className={animate ? "animate-success-check" : "opacity-0 scale-0"}
      >
        <circle
          cx="26"
          cy="26"
          r="25"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <path
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l7 7 16-16"
          style={{
            strokeDasharray: 48,
            strokeDashoffset: animate ? 0 : 48,
            transition: "stroke-dashoffset 0.5s ease-out 0.3s",
          }}
        />
      </svg>
    </div>
  );
}
