/**
 * Key management utilities.
 *
 * Dora-AI NEVER stores user private keys. Keys are managed
 * entirely by the wallet extensions (HashPack/Blade).
 *
 * Operator keys are stored in environment variables only
 * and are never exposed to the client.
 */

/**
 * Validate a Hedera account ID format (0.0.XXXXXX).
 */
export function isValidAccountId(accountId: string): boolean {
  return /^0\.0\.\d+$/.test(accountId);
}

/**
 * Validate a Hedera contract ID format (0.0.XXXXXX).
 */
export function isValidContractId(contractId: string): boolean {
  return /^0\.0\.\d+$/.test(contractId);
}

/**
 * Validate a Hedera topic ID format (0.0.XXXXXX).
 */
export function isValidTopicId(topicId: string): boolean {
  return /^0\.0\.\d+$/.test(topicId);
}

/**
 * Check if a value represents a valid ED25519 private key format.
 * Hedera ED25519 keys are 64-character hex strings (32 bytes).
 */
export function isValidPrivateKeyFormat(key: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(key) || /^302e020100300506032b657004220420[0-9a-fA-F]{64}$/.test(key);
}

/**
 * NEVER store these on the client:
 * - Private keys
 * - Mnemonic phrases
 * - Operator keys
 *
 * All signing happens via wallet extensions.
 * All server-side keys live in env vars only.
 */
