/**
 * Approval gate logic — ensures human-in-the-loop for every purchase.
 *
 * The approval mechanism has multiple layers:
 * 1. All purchases require explicit user approval (no autonomous AI spending)
 * 2. Minimum display time of 2 seconds before approval button activates
 * 3. Random position offset to prevent clickjacking/macro attacks
 */

/**
 * Check if an approval is still valid based on timestamp.
 * Approvals expire after 5 minutes to prevent stale approvals.
 */
export function isApprovalValid(approvalTimestamp: string): boolean {
  const approvedAt = new Date(approvalTimestamp).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return now - approvedAt < fiveMinutes;
}

/**
 * Generate a random position offset for the approval button
 * to prevent clickjacking/automated clicking.
 */
export function getApprovalOffset(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * 8),
    y: Math.floor(Math.random() * 8),
  };
}

/**
 * Compute the minimum delay before the approval button activates.
 * Enforces a 2-second review period.
 */
export function getApprovalDelayMs(appearanceTime: number): number {
  const elapsed = Date.now() - appearanceTime;
  return Math.max(2000 - elapsed, 0);
}

/**
 * Verify a cryptographic mandate signature.
 * In production, this would verify against the Hedera account's public key.
 * For now, validates structure and expiry.
 */
export function verifyMandate(params: {
  maxSpendHbar: string;
  expiresAt: string | null;
  amountHbar: string;
}): { valid: boolean; reason?: string } {
  const { maxSpendHbar, expiresAt, amountHbar } = params;

  // Check spending limit
  if (BigInt(amountHbar) > BigInt(maxSpendHbar)) {
    return {
      valid: false,
      reason: `Amount ${amountHbar} exceeds mandate limit of ${maxSpendHbar}`,
    };
  }

  // Check expiry
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return {
      valid: false,
      reason: "Mandate has expired",
    };
  }

  return { valid: true };
}

/**
 * Check if cancellation is within the allowed window (24 hours from purchase).
 */
export function isWithinCancellationWindow(purchaseTimestamp: string): boolean {
  const purchasedAt = new Date(purchaseTimestamp).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return now - purchasedAt < twentyFourHours;
}

/**
 * Get the cancellation window end time as an ISO string.
 */
export function getCancellationDeadline(purchaseTimestamp: string): string {
  const purchasedAt = new Date(purchaseTimestamp).getTime();
  const deadline = purchasedAt + 24 * 60 * 60 * 1000;
  return new Date(deadline).toISOString();
}
