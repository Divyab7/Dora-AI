// ============================================
// Hedera Blockchain Types
// ============================================

export type HCSEventType =
  | "search"
  | "price_update"
  | "purchase"
  | "payin3_created"
  | "payin3_installment"
  | "groupbuy_created"
  | "groupbuy_contribution"
  | "groupbuy_executed"
  | "groupbuy_cancelled"
  | "cancellation"
  | "refund"
  | "affiliate_click"
  | "mandate_signed";

export interface HCSMessage<T = Record<string, unknown>> {
  topicId: string;
  sequenceNumber: number;
  consensusTimestamp: string;
  message: T;
  runningHash: string;
}

export interface HCSEvent {
  eventType: HCSEventType;
  payload: Record<string, unknown>;
  timestamp: string;
  accountId?: string;
}

export interface ContractEscrowStatus {
  total: string;
  current: string;
  contributorCount: number;
  fullyFunded: boolean;
  executed: boolean;
  refunded: boolean;
  expiresAt: Date;
}
