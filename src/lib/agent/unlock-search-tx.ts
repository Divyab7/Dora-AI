import {
  TransferTransaction,
  AccountId,
  Hbar,
} from "@hashgraph/sdk";
import { getServerClient, getTreasuryId } from "@/lib/hedera/client";
import { SEARCH_UNLOCK_TINYBAR } from "./agent-config";

export async function buildUnlockSearchBytes(accountId: string): Promise<string> {
  if (!process.env.DORA_OPERATOR_ID || !process.env.DORA_OPERATOR_KEY) {
    throw new Error(
      "Server Hedera operator is not configured. Set DORA_OPERATOR_ID and DORA_OPERATOR_KEY in .env.local."
    );
  }

  const client = getServerClient();
  const treasury = getTreasuryId();

  const tx = await new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(accountId), Hbar.fromTinybars(`-${SEARCH_UNLOCK_TINYBAR}`))
    .addHbarTransfer(AccountId.fromString(treasury), Hbar.fromTinybars(SEARCH_UNLOCK_TINYBAR))
    .setTransactionMemo("Dora — unlock store search (24h)")
    .freezeWith(client);

  return Buffer.from(tx.toBytes()).toString("base64");
}
