// ============================================
// Group Buy Types
// ============================================

export type GroupBuyStatus =
  | "funding"
  | "funded"
  | "executed"
  | "cancelled"
  | "refunded";

export interface GroupBuyParticipant {
  accountId: string;
  contributed: boolean;
  amountHbar: string;
  contributedAt: string | null;
}

export interface GroupBuy {
  groupId: string;
  productName: string;
  productImageCid: string;
  escrowContractId: string;
  totalAmountHbar: string;
  perPersonAmountHbar: string;
  participantCount: number;
  creatorAccountId: string;
  status: GroupBuyStatus;
  participants: GroupBuyParticipant[];
  fullyFunded: boolean;
  currentContributionsHbar: string;
  createdAt: string;
  expiresAt: string;
  executedAt: string | null;
}
