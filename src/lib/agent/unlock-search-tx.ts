import {
  TransferTransaction,
  AccountId,
  Hbar,
} from "@hiero-ledger/sdk";
import {
  createAgentClient,
  getTreasuryAccountId,
  SEARCH_UNLOCK_TINYBAR,
} from "./agent-config";

export async function buildUnlockSearchBytes(accountId: string): Promise<string> {
  const client = createAgentClient();
  const treasury = getTreasuryAccountId();

  const tx = await new TransferTransaction()
    .addHbarTransfer(AccountId.fromString(accountId), Hbar.fromTinybars(`-${SEARCH_UNLOCK_TINYBAR}`))
    .addHbarTransfer(AccountId.fromString(treasury), Hbar.fromTinybars(SEARCH_UNLOCK_TINYBAR))
    .setTransactionMemo("Dora — unlock store search (24h)")
    .freezeWith(client);

  return Buffer.from(tx.toBytes()).toString("base64");
}
