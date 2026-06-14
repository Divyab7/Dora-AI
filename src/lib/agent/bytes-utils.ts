import type { PendingAgentTransaction } from "./types";

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

/** Extract unsigned transaction bytes from Agent Kit tool results */
export function extractPendingTransaction(
  toolResults: Array<{ toolName?: string; result?: unknown; output?: unknown }>
): PendingAgentTransaction | null {
  for (const tr of toolResults) {
    const raw = tr.result ?? tr.output;
    const parsed = tryParseJson(raw) as {
      raw?: { bytes?: Uint8Array | { type: string; data: number[] } };
      humanMessage?: string;
    } | null;

    if (!parsed || typeof parsed !== "object") continue;

    let bytes: Uint8Array | undefined;
    const inner = parsed.raw?.bytes;
    if (inner instanceof Uint8Array) {
      bytes = inner;
    } else if (inner && typeof inner === "object" && "data" in inner && Array.isArray(inner.data)) {
      bytes = Uint8Array.from(inner.data);
    }

    if (bytes && bytes.length > 0) {
      return {
        bytesBase64: bytesToBase64(bytes),
        humanMessage: parsed.humanMessage ?? "Approve this transaction in HashPack",
        toolName: tr.toolName,
      };
    }
  }
  return null;
}
