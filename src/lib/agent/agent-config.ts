import { Client } from "@hiero-ledger/sdk";
import { AgentMode } from "@hashgraph/hedera-agent-kit";

export const SEARCH_UNLOCK_HBAR = 0.1;
export const SEARCH_UNLOCK_TINYBAR = "10000000"; // 0.1 HBAR

export function createAgentClient(): Client {
  const network = process.env.HEDERA_NETWORK || process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet";
  return network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
}

export function getAgentMode(): AgentMode {
  return AgentMode.RETURN_BYTES;
}

export function getTreasuryAccountId(): string {
  return process.env.DORA_TREASURY_ID || "0.0.0";
}
