"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const STEPS = [
  {
    emoji: "📸",
    title: "Snap Any Product",
    description:
      "See something you love? Take a photo or screenshot. Our AI identifies it instantly and finds where to buy it.",
  },
  {
    emoji: "💰",
    title: "Compare Prices",
    description:
      "We search Amazon, Nike, StockX and more to find the best prices. See price history so you know you're getting a deal.",
  },
  {
    emoji: "⚡",
    title: "Pay with HBAR",
    description:
      "Check out in seconds with Hedera. Pay in full, split into 3 installments, or group buy with friends — all on-chain.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= step
                ? "w-8 bg-[var(--accent)]"
                : "w-4 bg-[var(--surface-overlay)]"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card p-8 max-w-sm w-full space-y-6 animate-fade-in">
        <div className="text-6xl">{current.emoji}</div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {current.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {current.description}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        {isLast ? (
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => router.push("/connect")}
          >
            Connect Wallet & Start
          </Button>
        ) : (
          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => router.push("/home")}
        >
          {isLast ? "Skip" : "Skip All"}
        </Button>
      </div>
    </div>
  );
}
