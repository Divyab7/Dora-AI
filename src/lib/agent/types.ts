import type { CountryCode } from "@/lib/commerce/market";
import type { MandateRecord } from "@/types/wallet";

/** Per-request session passed into commerce plugin tools */
export interface AgentSessionContext {
  accountId?: string;
  country: CountryCode;
  /** User paid unlock fee or within unlock window */
  searchUnlocked: boolean;
  mandates: MandateRecord[];
}

export interface PendingAgentTransaction {
  bytesBase64: string;
  humanMessage: string;
  toolName?: string;
}
