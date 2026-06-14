/**
 * AP2 — Cryptographic Mandates
 *
 * Users sign a mandate authorizing Dora-AI to initiate payments
 * on their behalf, within strict limits. The mandate is verified
 * before any transaction is submitted.
 */

import type { MandateRecord } from "@/types/wallet";

/**
 * Create a mandate payload for the user to sign.
 * The actual signing happens in the wallet extension (HashPack/Blade).
 */
export function createMandatePayload(params: {
  accountId: string;
  purpose: string;
  maxSpendHbar: string;
  expiresAt?: string;
}): {
  payload: string;
  mandateId: string;
} {
  const mandateId = `ap2-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const payload = JSON.stringify({
    mandateId,
    accountId: params.accountId,
    purpose: params.purpose,
    maxSpendHbar: params.maxSpendHbar,
    expiresAt: params.expiresAt || null,
    createdAt: new Date().toISOString(),
    protocol: "AP2",
    version: "1.0",
  });

  return { payload, mandateId };
}

/**
 * Verify a signed mandate is valid.
 * In production, this would cryptographically verify the signature
 * against the account's public key. Currently validates structure.
 */
export function verifyMandate(
  mandate: MandateRecord,
  amountHbar: string
): { valid: boolean; reason?: string } {
  // Check amount within mandate limit
  if (BigInt(amountHbar) > BigInt(mandate.maxSpendHbar)) {
    return {
      valid: false,
      reason: `Amount ${amountHbar} exceeds mandate limit of ${mandate.maxSpendHbar}`,
    };
  }

  // Check expiry
  if (mandate.expiresAt) {
    const expiryTime = new Date(mandate.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      return { valid: false, reason: "Mandate has expired" };
    }
  }

  // Verify signature exists (production: verify cryptographically)
  if (!mandate.signature) {
    return { valid: false, reason: "Mandate is not signed" };
  }

  return { valid: true };
}

/**
 * Check if a mandate authorizes a specific purpose.
 */
export function mandateAuthorizes(
  mandate: MandateRecord,
  purpose: string
): boolean {
  return mandate.purpose === purpose;
}
