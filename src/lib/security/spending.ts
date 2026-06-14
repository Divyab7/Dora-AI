/**
 * Spending limit enforcement logic.
 *
 * Applied across all checkout flows to ensure:
 * - Per-transaction cap
 * - Daily spending cap
 * - Mandatory approval for all purchases
 */

import { SPENDING } from "@/lib/utils/constants";

export interface SpendingCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a transaction amount exceeds per-transaction limit.
 */
export function checkTransactionLimit(
  amountHbar: number,
  perTxLimitHbar: number = SPENDING.DEFAULT_PER_TX_LIMIT_HBAR
): SpendingCheck {
  if (amountHbar > perTxLimitHbar) {
    return {
      allowed: false,
      reason: `Transaction amount ${amountHbar} ℏ exceeds per-transaction limit of ${perTxLimitHbar} ℏ`,
    };
  }
  return { allowed: true };
}

/**
 * Check if daily spending limit would be exceeded.
 */
export function checkDailyLimit(
  amountHbar: number,
  dailySpentHbar: number,
  dailyLimitHbar: number = SPENDING.DEFAULT_DAILY_LIMIT_HBAR
): SpendingCheck {
  const projectedTotal = dailySpentHbar + amountHbar;
  if (projectedTotal > dailyLimitHbar) {
    return {
      allowed: false,
      reason: `Daily limit of ${dailyLimitHbar} ℏ would be exceeded (${dailySpentHbar} ℏ already spent + ${amountHbar} ℏ = ${projectedTotal} ℏ)`,
    };
  }
  return { allowed: true };
}

/**
 * Check if amount requires explicit approval (above threshold).
 */
export function requiresExplicitApproval(
  amountHbar: number,
  thresholdHbar: number = SPENDING.DEFAULT_APPROVAL_THRESHOLD_HBAR
): boolean {
  return amountHbar >= thresholdHbar;
}

/**
 * Full spending check pipeline.
 * Runs all limit checks and returns first failure.
 */
export function validateSpending(
  amountHbar: number,
  dailySpentHbar: number,
  options?: {
    perTxLimit?: number;
    dailyLimit?: number;
  }
): SpendingCheck {
  // 1. Per-transaction limit
  const txCheck = checkTransactionLimit(
    amountHbar,
    options?.perTxLimit ?? SPENDING.DEFAULT_PER_TX_LIMIT_HBAR
  );
  if (!txCheck.allowed) return txCheck;

  // 2. Daily limit
  const dailyCheck = checkDailyLimit(
    amountHbar,
    dailySpentHbar,
    options?.dailyLimit ?? SPENDING.DEFAULT_DAILY_LIMIT_HBAR
  );
  if (!dailyCheck.allowed) return dailyCheck;

  return { allowed: true };
}

/**
 * Calculate fees for a transaction.
 */
export function calculateFees(
  subtotalHbar: string,
  paymentMethod: "full" | "payin3" | "groupbuy"
): {
  transactionFee: string;
  payIn3Fee: string;
  totalFee: string;
} {
  const subtotal = BigInt(subtotalHbar);
  const ONE_BPS = BigInt(10000); // 1 basis point = 1/10000

  const txFeeBps = BigInt(100); // 1%
  const txFee = (subtotal * txFeeBps) / ONE_BPS;

  const payin3FeeBps = paymentMethod === "payin3" ? BigInt(200) : BigInt(0); // 2%
  const payin3Fee = (subtotal * payin3FeeBps) / ONE_BPS;

  const totalFee = txFee + payin3Fee;

  return {
    transactionFee: txFee.toString(),
    payIn3Fee: payin3Fee.toString(),
    totalFee: totalFee.toString(),
  };
}

/**
 * Compute PayIn3 installment amounts.
 */
export function computePayIn3Installments(
  totalHbar: string
): [string, string, string] {
  const total = BigInt(totalHbar);
  const oneThird = total / BigInt(3);
  const remainder = total - oneThird * BigInt(3);

  // Distribute remainder across installments (1st gets any extra)
  return [
    (oneThird + remainder).toString(),
    oneThird.toString(),
    oneThird.toString(),
  ];
}
