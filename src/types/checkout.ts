// ============================================
// Checkout Types
// ============================================

import type { CartItem, PaymentMethod } from "./cart";

export type CheckoutStage =
  | "review"
  | "approval"
  | "signing"
  | "processing"
  | "complete"
  | "failed";

export interface CheckoutRequest {
  items: CartItem[];
  paymentMethod: PaymentMethod;
  payIn3Installments?: 3;
  groupBuySplitCount?: number; // 2-10
  accountId: string;
  mandateSignature?: string; // AP2 mandate signature
}

export interface CheckoutResult {
  transactionId: string;
  scheduleId?: string; // For PayIn3
  escrowContractId?: string; // For GroupBuy
  status: "success" | "pending_installments" | "pending_funding";
  timestamp: string;
  hcsSequenceNumber: number;
}

export interface PayIn3Schedule {
  scheduleId: string;
  totalAmountHbar: string;
  installments: PayIn3Installment[];
  createdAt: string;
}

export interface PayIn3Installment {
  installmentNumber: 1 | 2 | 3;
  amountHbar: string;
  dueDate: string; // ISO 8601
  status: "paid" | "scheduled" | "overdue" | "cancelled";
  transactionId: string | null;
  paidAt: string | null;
}
