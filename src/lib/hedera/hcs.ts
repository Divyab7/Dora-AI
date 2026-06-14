/**
 * HCS (Hedera Consensus Service) Integration
 *
 * Logs all Dora-AI events to immutable HCS topics:
 * - Topic 1: SEARCH_LOG — every visual search
 * - Topic 2: PRICE_LOG — price updates per retailer
 * - Topic 3: PURCHASE_LOG — purchases, PayIn3, group buys
 */

import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { getServerClient, getHCSTopics } from "./client";
import type { HCSEvent } from "@/types/hedera";

/**
 * Create a new HCS topic.
 * Called once during initial setup. Topic IDs are saved to env vars.
 */
export async function createHCSTopic(
  memo: string
): Promise<{ topicId: string }> {
  const client = getServerClient();

  const tx = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setSubmitKey(client.operatorPublicKey!)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  return { topicId: receipt.topicId!.toString() };
}

/**
 * Submit an event to an HCS topic.
 * Events are immutable once submitted (Hedera consensus).
 */
export async function submitHCSEvent(
  event: HCSEvent
): Promise<{ sequenceNumber: number }> {
  const client = getServerClient();
  const topics = getHCSTopics();

  // Route event to correct topic
  let topicId: string;
  switch (event.eventType) {
    case "search":
      topicId = topics.searchLog;
      break;
    case "price_update":
      topicId = topics.priceLog;
      break;
    default:
      topicId = topics.purchaseLog;
      break;
  }

  if (topicId === "0.0.0") {
    console.warn(`[HCS] Topic not configured for ${event.eventType} — skipping`);
    return { sequenceNumber: 0 };
  }

  const message = JSON.stringify({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  return {
    sequenceNumber: receipt.topicSequenceNumber?.toNumber() ?? 0,
  };
}

/**
 * Log a search event to HCS.
 */
export async function logSearch(params: {
  imageCid: string;
  query?: string;
  resultsCount: number;
  confidence: number;
  accountId?: string;
}): Promise<void> {
  await submitHCSEvent({
    eventType: "search",
    payload: params,
    timestamp: new Date().toISOString(),
    accountId: params.accountId,
  });
}

/**
 * Log a purchase event to HCS.
 */
export async function logPurchase(params: {
  txId: string;
  items: Array<{ productId: string; price: number }>;
  totalAmountHbar: string;
  fees: { transaction: string; payIn3?: string };
  paymentMethod: string;
  accountId: string;
}): Promise<void> {
  await submitHCSEvent({
    eventType: "purchase",
    payload: params,
    timestamp: new Date().toISOString(),
    accountId: params.accountId,
  });
}

/**
 * Query HCS topic messages from mirror node.
 */
export async function queryHCSTopic(
  topicId: string,
  options?: {
    limit?: number;
    order?: "asc" | "desc";
  }
): Promise<Array<{ sequenceNumber: number; message: string; timestamp: string }>> {
  const mirrorUrl =
    process.env.HEDERA_NETWORK === "mainnet"
      ? "https://mainnet-public.mirrornode.hedera.com"
      : "https://testnet.mirrornode.hedera.com";

  const params = new URLSearchParams({
    limit: String(options?.limit || 100),
    order: options?.order || "desc",
  });

  const response = await fetch(
    `${mirrorUrl}/api/v1/topics/${topicId}/messages?${params}`
  );

  if (!response.ok) {
    console.error(`[HCS] Failed to query topic ${topicId}:`, response.statusText);
    return [];
  }

  const data = await response.json();
  return (data.messages || []).map(
    (msg: { sequence_number: number; message: string; consensus_timestamp: string }) => ({
      sequenceNumber: msg.sequence_number,
      message: atob(msg.message), // Base64 decode
      timestamp: msg.consensus_timestamp,
    })
  );
}
