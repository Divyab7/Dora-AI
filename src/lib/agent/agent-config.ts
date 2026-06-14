import { Client } from "@hiero-ledger/sdk";
import { AgentMode } from "@hashgraph/hedera-agent-kit";
import { getServerClient } from "@/lib/hedera/client";

export const SEARCH_UNLOCK_HBAR = 0.1;
export const SEARCH_UNLOCK_TINYBAR = "10000000"; // 0.1 HBAR

/** Hedera client for Agent Kit — uses operator so transactions can be frozen for signing. */
export function createAgentClient(): Client {
  return getServerClient() as unknown as Client;
}

export function getAgentMode(): AgentMode {
  return AgentMode.RETURN_BYTES;
}

export function getTreasuryAccountId(): string {
  return process.env.DORA_TREASURY_ID || "0.0.0";
}
