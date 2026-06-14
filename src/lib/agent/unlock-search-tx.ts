import { buildWalletTransferTransaction } from "@/lib/hedera/payments";
import { getTreasuryId } from "@/lib/hedera/client";
import { SEARCH_UNLOCK_TINYBAR } from "./agent-config";

export async function buildUnlockSearchBytes(accountId: string): Promise<string> {
  const { transactionBytes, transactionId } = await buildWalletTransferTransaction({
    fromAccountId: accountId,
    toAccountId: getTreasuryId(),
    amountTinybar: SEARCH_UNLOCK_TINYBAR,
    memo: "Dora — unlock store search (24h)",
  });

  if (!transactionId.startsWith(accountId)) {
    throw new Error("Unlock transaction must use the connected wallet as payer.");
  }

  return Buffer.from(transactionBytes).toString("base64");
}
