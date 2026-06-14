/**
 * Format HBAR amounts for display.
 * HBAR uses 8 decimal places (1 HBAR = 100,000,000 tinybars).
 */

export function formatHbar(tinybar: string | number): string {
  const hbar = BigInt(tinybar);
  const ONE_HBAR = BigInt(100_000_000);

  const whole = hbar / ONE_HBAR;
  const fraction = hbar % ONE_HBAR;

  // Pad fraction to 8 places and trim trailing zeros
  const fractionStr = fraction.toString().padStart(8, "0").replace(/0+$/, "");

  if (fractionStr.length === 0) {
    return `${whole} ℏ`;
  }

  // Show up to 4 decimal places
  const trimmed = fractionStr.slice(0, 4);
  return `${whole}.${trimmed} ℏ`;
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export function formatMoney(amountMinor: number, currency = "USD", locale?: string): string {
  const resolvedLocale =
    locale ??
    ({ INR: "en-IN", USD: "en-US", GBP: "en-GB", AED: "en-AE", CAD: "en-CA", AUD: "en-AU", EUR: "de-DE", JPY: "ja-JP", SGD: "en-SG", BRL: "pt-BR", MXN: "es-MX", KRW: "ko-KR", SAR: "ar-SA" } as Record<string, string>)[
      currency
    ] ??
    "en-US";

  const fractionDigits = currency === "JPY" || currency === "KRW" ? 0 : 2;
  const divisor = currency === "JPY" || currency === "KRW" ? 1 : 100;

  return new Intl.NumberFormat(resolvedLocale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / divisor);
}

export function formatPrice(
  amount: number,
  currencyOrLegacy: string = "USD"
): string {
  if (currencyOrLegacy === "hbar") {
    return formatHbar(amount.toString());
  }
  return formatMoney(amount, currencyOrLegacy);
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toString();
}

export function formatPercentage(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatTimestamp(iso);
}
