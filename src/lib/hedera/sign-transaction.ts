"use client";

export async function signAndSendTransactionBytes(
  accountId: string,
  bytesBase64: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const [{ Transaction, AccountId }, { getHashConnect }] = await Promise.all([
      import("@hashgraph/sdk"),
      import("@/lib/hedera/hashconnect-client"),
    ]);

    const hc = await getHashConnect();
    const binary = atob(bytesBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const tx = Transaction.fromBytes(bytes);
    const txId = tx.transactionId?.toString();
    // HashConnect bundles its own @hashgraph/sdk — cast to avoid version mismatch
    await hc.sendTransaction(
      AccountId.fromString(accountId) as unknown as Parameters<typeof hc.sendTransaction>[0],
      tx as unknown as Parameters<typeof hc.sendTransaction>[1]
    );

    return {
      success: true,
      transactionId: txId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    };
  }
}
