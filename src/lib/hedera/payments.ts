/**
 * Hedera Payment Operations
 *
 * Handles:
 * - ACP: TransferTransaction for full HBAR payments
 * - MPP: ScheduleCreateTransaction for PayIn3 installments
 * - Transaction construction for wallet signing
 */

import {
  TransferTransaction,
  ScheduleCreateTransaction,
  Hbar,
  AccountId,
  Timestamp,
} from "@hashgraph/sdk";
import { getServerClient, getTreasuryId } from "./client";

// ============================================
// ACP: Full Payment (TransferTransaction)
// ============================================

export interface InitiatePaymentParams {
  fromAccountId: string;
  amountTinybar: string;
  memo?: string;
}

export async function buildPaymentTransaction(
  params: InitiatePaymentParams
): Promise<{ transactionBytes: Uint8Array; transactionId: string }> {
  const client = getServerClient();
  const treasuryId = getTreasuryId();

  const tx = await new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(params.fromAccountId), Hbar.fromTinybars(`-${params.amountTinybar}`))
    .addHbarTransfer(AccountId.fromString(treasuryId), Hbar.fromTinybars(params.amountTinybar))
    .setTransactionMemo(params.memo || "Dora-AI Purchase")
    .freezeWith(client);

  // Return bytes for wallet to sign
  const bytes = tx.toBytes();
  return {
    transactionBytes: bytes,
    transactionId: tx.transactionId?.toString() || "",
  };
}

// ============================================
// MPP: PayIn3 (Scheduled Transactions)
// ============================================

export interface PayIn3ScheduleParams {
  fromAccountId: string;
  totalAmountTinybar: string;
  memo?: string;
}

export async function buildPayIn3Schedule(
  params: PayIn3ScheduleParams
): Promise<{
  scheduleId: string;
  installments: Array<{
    number: 1 | 2 | 3;
    amountTinybar: string;
    dueTimestamp: string;
    transactionBytes: Uint8Array;
  }>;
}> {
  const client = getServerClient();
  const treasuryId = getTreasuryId();
  const total = BigInt(params.totalAmountTinybar);

  // Split into 3 installments
  const oneThird = total / BigInt(3);
  const remainder = total - oneThird * BigInt(3);

  const installmentAmounts = [
    oneThird + remainder, // 1st gets remainder
    oneThird,
    oneThird,
  ];

  const now = Math.floor(Date.now() / 1000);
  const THIRTY_DAYS = 30 * 24 * 60 * 60;

  const installments = await Promise.all(
    installmentAmounts.map(async (amount, i) => {
      const dueTimestamp = now + (i + 1) * THIRTY_DAYS;

      const tx = await new TransferTransaction()
        .addHbarTransfer(
          AccountId.fromString(params.fromAccountId),
          Hbar.fromTinybars(`-${amount.toString()}`)
        )
        .addHbarTransfer(
          AccountId.fromString(treasuryId),
          Hbar.fromTinybars(amount.toString())
        )
        .setTransactionMemo(
          `${params.memo || "Dora-AI PayIn3"} - Installment ${i + 1}/3`
        )
        .freezeWith(client);

      return {
        number: (i + 1) as 1 | 2 | 3,
        amountTinybar: amount.toString(),
        dueTimestamp: new Date(dueTimestamp * 1000).toISOString(),
        transactionBytes: tx.toBytes(),
      };
    })
  );

  // Create schedule for the first installment (subsequent scheduled via app)
  const scheduleTx = await new ScheduleCreateTransaction()
    .setScheduledTransaction(TransferTransaction.fromBytes(installments[0].transactionBytes))
    .setExpirationTime(Timestamp.fromDate(new Date(now * 1000 + THIRTY_DAYS * 1000)))
    .freezeWith(client);

  const scheduleId = scheduleTx.transactionId?.toString() || "";

  return {
    scheduleId,
    installments,
  };
}

// ============================================
// Cancellation
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function cancelScheduledTransaction(
  scheduleId: string
): Promise<void> {
  // In production, user signs a ScheduleDeleteTransaction via wallet.
  // Requires: getServerClient() → ScheduleDeleteTransaction.setScheduleId() → wallet.sign()
  void scheduleId;
}
