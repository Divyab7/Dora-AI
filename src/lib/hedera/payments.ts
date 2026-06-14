/**
 * Build transfer transactions for HashPack / wallet signing.
 * Must NOT use the operator client — that auto-signs and sets the wrong transaction ID.
 */

import {
  TransferTransaction,
  ScheduleCreateTransaction,
  Hbar,
  AccountId,
  TransactionId,
  Timestamp,
} from "@hashgraph/sdk";
import { getMirrorClient, getTreasuryId } from "./client";

export interface WalletTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amountTinybar: string;
  memo?: string;
}

/** Freeze a transfer for external wallet signing (unsigned bytes). */
export async function buildWalletTransferTransaction(
  params: WalletTransferParams
): Promise<{ transactionBytes: Uint8Array; transactionId: string }> {
  const client = getMirrorClient();
  const from = AccountId.fromString(params.fromAccountId);

  const tx = await new TransferTransaction()
    .addHbarTransfer(from, Hbar.fromTinybars(`-${params.amountTinybar}`))
    .addHbarTransfer(
      AccountId.fromString(params.toAccountId),
      Hbar.fromTinybars(params.amountTinybar)
    )
    .setTransactionMemo(params.memo ?? "")
    .setTransactionId(TransactionId.generate(from))
    .freezeWith(client);

  return {
    transactionBytes: tx.toBytes(),
    transactionId: tx.transactionId!.toString(),
  };
}

export interface InitiatePaymentParams {
  fromAccountId: string;
  amountTinybar: string;
  memo?: string;
}

export async function buildPaymentTransaction(
  params: InitiatePaymentParams
): Promise<{ transactionBytes: Uint8Array; transactionId: string }> {
  return buildWalletTransferTransaction({
    fromAccountId: params.fromAccountId,
    toAccountId: getTreasuryId(),
    amountTinybar: params.amountTinybar,
    memo: params.memo || "Dora-AI Purchase",
  });
}

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
  const treasuryId = getTreasuryId();
  const total = BigInt(params.totalAmountTinybar);

  const oneThird = total / BigInt(3);
  const remainder = total - oneThird * BigInt(3);

  const installmentAmounts = [
    oneThird + remainder,
    oneThird,
    oneThird,
  ];

  const now = Math.floor(Date.now() / 1000);
  const THIRTY_DAYS = 30 * 24 * 60 * 60;

  const installments = await Promise.all(
    installmentAmounts.map(async (amount, i) => {
      const dueTimestamp = now + (i + 1) * THIRTY_DAYS;

      const { transactionBytes } = await buildWalletTransferTransaction({
        fromAccountId: params.fromAccountId,
        toAccountId: treasuryId,
        amountTinybar: amount.toString(),
        memo: `${params.memo || "Dora-AI PayIn3"} - Installment ${i + 1}/3`,
      });

      return {
        number: (i + 1) as 1 | 2 | 3,
        amountTinybar: amount.toString(),
        dueTimestamp: new Date(dueTimestamp * 1000).toISOString(),
        transactionBytes,
      };
    })
  );

  const client = getMirrorClient();
  const from = AccountId.fromString(params.fromAccountId);

  const scheduleTx = await new ScheduleCreateTransaction()
    .setScheduledTransaction(TransferTransaction.fromBytes(installments[0].transactionBytes))
    .setExpirationTime(Timestamp.fromDate(new Date(now * 1000 + THIRTY_DAYS * 1000)))
    .setTransactionId(TransactionId.generate(from))
    .freezeWith(client);

  const scheduleId = scheduleTx.transactionId?.toString() || "";

  return {
    scheduleId,
    installments,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function cancelScheduledTransaction(
  scheduleId: string
): Promise<void> {
  void scheduleId;
}
