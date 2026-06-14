/**
 * Hedera SDK client setup.
 *
 * Server-side: Uses operator account (from env vars) for paying
 * transaction fees, submitting HCS messages, and deploying contracts.
 *
 * Client-side: Creates a client for the connected user's account.
 * The client is used for querying the mirror node, but transactions
 * are signed by the wallet extension (HashPack/Blade), NOT by this client.
 */

import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";

/**
 * Get a server-side Hedera client configured with the Dora-AI operator account.
 * This client pays for HCS message submissions and contract deployments.
 * ONLY use in API routes (server-side) — NEVER expose to the client.
 */
export function getServerClient(): Client {
  const network = (process.env.HEDERA_NETWORK || "testnet") as
    | "testnet"
    | "mainnet";

  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  const operatorId = process.env.DORA_OPERATOR_ID;
  const operatorKey = process.env.DORA_OPERATOR_KEY;

  if (operatorId && operatorKey) {
    client.setOperator(
      AccountId.fromString(operatorId),
      PrivateKey.fromString(operatorKey)
    );
  }

  return client;
}

/**
 * Create a mirror node query client (no operator needed for queries).
 * Safe to use in both server and client contexts.
 */
export function getMirrorClient(): Client {
  const network = (process.env.HEDERA_NETWORK || "testnet") as
    | "testnet"
    | "mainnet";

  return network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
}

/**
 * Get mirror node REST API URL.
 */
export function getMirrorNodeUrl(): string {
  const network = process.env.HEDERA_NETWORK || "testnet";
  return network === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";
}

/**
 * Get the Dora-AI treasury account ID.
 */
export function getTreasuryId(): string {
  return process.env.DORA_TREASURY_ID || "0.0.0";
}

/**
 * Get HCS topic IDs from environment.
 */
export function getHCSTopics() {
  return {
    searchLog: process.env.HCS_SEARCH_LOG_TOPIC || "0.0.0",
    priceLog: process.env.HCS_PRICE_LOG_TOPIC || "0.0.0",
    purchaseLog: process.env.HCS_PURCHASE_LOG_TOPIC || "0.0.0",
  };
}
