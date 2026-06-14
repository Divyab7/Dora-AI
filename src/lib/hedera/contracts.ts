/**
 * Smart Contract Interactions
 *
 * Deploy and interact with the EscrowContract for GroupBuy.
 * Uses Hedera ContractCreateFlow and ContractExecuteTransaction.
 */

import {
  ContractCreateFlow,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar,
  Long,
} from "@hashgraph/sdk";
import { getServerClient } from "./client";
import type { ContractEscrowStatus } from "@/types/hedera";

// Compiled bytecode would be loaded from a file in production
// For now, this is a placeholder that would be replaced with actual bytecode
// Bytecode cache — loaded once from compiled contract
const bytecodeCache: { data: Uint8Array | null } = { data: null };

async function loadCompiledBytecode(contractName: string): Promise<Uint8Array> {
  if (bytecodeCache.data) return bytecodeCache.data;

  // In production, load from contracts/out/EscrowContract.bin
  // For now, return empty bytecode (contract deployment requires compilation)
  console.warn(
    `[Contracts] Bytecode for ${contractName} not loaded — compile contract first`
  );
  return new Uint8Array();
}

export interface DeployEscrowParams {
  merchantAccountId: string;
  totalAmountTinybar: string;
  participantCount: number;
  durationDays: number;
}

export async function deployEscrowContract(
  params: DeployEscrowParams
): Promise<{ contractId: string }> {
  const client = getServerClient();
  const bytecode = await loadCompiledBytecode("EscrowContract");

  if (bytecode.length === 0) {
    throw new Error(
      "Contract bytecode not available. Compile the contract first."
    );
  }

  // Deploy contract with bytecode directly
  const deployTx = await new ContractCreateFlow()
    .setBytecode(bytecode)
    .setGas(400_000)
    .setConstructorParameters(
      new ContractFunctionParameters()
        .addAddress(params.merchantAccountId)
        .addUint256(Long.fromString(params.totalAmountTinybar))
        .addUint256(params.participantCount)
        .addUint256(params.durationDays)
    )
    .execute(client);

  const receipt = await deployTx.getReceipt(client);
  return { contractId: receipt.contractId!.toString() };
}

export async function contributeToEscrow(params: {
  contractId: string;
  amountTinybar: string;
  accountId: string;
}): Promise<string> {
  const client = getServerClient();

  const tx = await new ContractExecuteTransaction()
    .setContractId(params.contractId)
    .setGas(100_000)
    .setPayableAmount(Hbar.fromTinybars(params.amountTinybar))
    .setFunction("contribute")
    .freezeWith(client);

  const executed = await tx.execute(client);
  await executed.getReceipt(client);
  return tx.transactionId?.toString() || "";
}

export async function getEscrowStatus(
  contractId: string
): Promise<ContractEscrowStatus> {
  const client = getServerClient();

  const result = await new ContractCallQuery()
    .setContractId(contractId)
    .setGas(50_000)
    .setFunction("getStatus")
    .execute(client);

  const values = result.getResult([
    "uint256",
    "uint256",
    "uint256",
    "bool",
    "bool",
    "bool",
    "uint256",
  ]);

  return {
    total: values[0].toString(),
    current: values[1].toString(),
    contributorCount: values[2].toNumber(),
    fullyFunded: values[3] as boolean,
    executed: values[4] as boolean,
    refunded: values[5] as boolean,
    expiresAt: new Date((values[6] as unknown as number) * 1000),
  };
}

export async function triggerRefund(contractId: string): Promise<string> {
  const client = getServerClient();

  const tx = await new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(200_000)
    .setFunction("refund")
    .execute(client);

  await tx.getReceipt(client);
  return tx.transactionId?.toString() || "";
}
