"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useMarket } from "@/contexts/MarketContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ApprovalGate } from "@/components/shared/ApprovalGate";
import { ChatMessageBubble } from "@/components/agent/ChatMessageBubble";
import { ChatComposer, extractShoppingLink, isShoppingLink } from "@/components/agent/ChatComposer";
import { ChatWalletDialog } from "@/components/agent/ChatWalletDialog";
import { signAndSendTransactionBytes } from "@/lib/hedera/sign-transaction";
import { markSearchUnlocked, isSearchUnlocked } from "@/lib/storage/search-unlock";
import { parseApiResponse } from "@/lib/utils/api";
import { formatHbar } from "@/lib/utils/format";
import type { VisionAnalysisResult, ProductMatch } from "@/types/search";
import type {
  ChatMessage,
  ChatPayTarget,
  TextChatMessage,
} from "@/types/agent-chat";
import {
  createMessageId,
  parseSearchToolResult,
  productMatchToSearchMessage,
} from "@/types/agent-chat";
import type { PendingAgentTransaction } from "@/lib/agent/types";

const WELCOME: TextChatMessage = {
  id: "welcome",
  role: "assistant",
  kind: "text",
  createdAt: Date.now(),
  content:
    "Hey! I'm Dora 👋\n\nSend me a product photo, paste an Instagram or YouTube link, or tell me what you're looking for. I'll find prices near you and help you pay with HBAR — you always approve in HashPack before any payment.",
};

const STARTERS = [
  "Find wireless headphones",
  "What's my HBAR balance?",
  "How does paying work?",
];

const SOURCE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  web: "Web",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripLoading(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((m) => m.kind !== "loading");
}

function toTextMessages(messages: ChatMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    if (m.kind === "text") out.push({ role: m.role, content: m.content });
    else if (m.kind === "image") out.push({ role: "user", content: "[User shared a product photo]" });
    else if (m.kind === "link") out.push({ role: "user", content: `[User shared a link: ${m.url}]` });
  }
  return out;
}

export function AgentChat() {
  const {
    isConnected,
    accountId,
    mandates,
    balance,
    connect,
    signMandate,
    refreshBalance,
  } = useWallet();
  const { country, market } = useMarket();

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchUnlocked, setSearchUnlocked] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletDialogReason, setWalletDialogReason] = useState<string>();
  const [pendingTx, setPendingTx] = useState<PendingAgentTransaction | null>(null);
  const [approvalHbar, setApprovalHbar] = useState("0.1");
  const [approvalLabel, setApprovalLabel] = useState("Approve transaction");
  const [showApproval, setShowApproval] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [payingListingId, setPayingListingId] = useState<string | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<VisionAnalysisResult | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchUnlocked(isSearchUnlocked());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const append = useCallback((...items: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...items]);
  }, []);

  const replaceLoading = useCallback((next: ChatMessage[]) => {
    setMessages((prev) => [...stripLoading(prev), ...next]);
  }, []);

  const requireWallet = useCallback(
    (reason: string): boolean => {
      if (isConnected && accountId) return true;
      setWalletDialogReason(reason);
      setShowWalletDialog(true);
      return false;
    },
    [isConnected, accountId]
  );

  const runProductSearch = useCallback(
    async (analysis: VisionAnalysisResult) => {
      if (!searchUnlocked) {
        append({
          id: createMessageId(),
          role: "assistant",
          kind: "text",
          createdAt: Date.now(),
          content:
            "I identified your product! To compare prices across stores, unlock search — it's a one-time 0.1 ℏ fee for 24 hours.",
        });
        append({
          id: createMessageId(),
          role: "assistant",
          kind: "unlock_prompt",
          createdAt: Date.now(),
        });
        setPendingAnalysis(analysis);
        return;
      }

      append({
        id: createMessageId(),
        role: "assistant",
        kind: "loading",
        createdAt: Date.now(),
        label: "Searching stores near you…",
      });

      try {
        const searchRes = await fetch("/api/vision/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embedding: analysis.embedding,
            analysis,
            country,
          }),
        });

        const searchData = await parseApiResponse<{ matches: ProductMatch[] }>(searchRes);
        if (!searchData.success || !searchData.data?.matches?.length) {
          replaceLoading([
            {
              id: createMessageId(),
              role: "assistant",
              kind: "text",
              createdAt: Date.now(),
              content: "I couldn't find store listings for this item. Try a clearer photo or different product.",
            },
          ]);
          return;
        }

        const match = searchData.data.matches[0];
        const searchMsg = productMatchToSearchMessage(match, analysis);
        replaceLoading([
          {
            id: createMessageId(),
            role: "assistant",
            kind: "text",
            createdAt: Date.now(),
            content: `Found ${searchMsg.listings.length} options at stores in ${market.label}. Tap Pay with HBAR when you're ready — you'll confirm in HashPack.`,
          },
          {
            id: createMessageId(),
            role: "assistant",
            kind: "search_results",
            createdAt: Date.now(),
            ...searchMsg,
          },
        ]);
      } catch (error) {
        replaceLoading([
          {
            id: createMessageId(),
            role: "assistant",
            kind: "text",
            createdAt: Date.now(),
            content: error instanceof Error ? error.message : "Search failed. Please try again.",
          },
        ]);
      }
    },
    [searchUnlocked, country, market.label, append, replaceLoading]
  );

  const runVisionAnalyze = useCallback(
    async (
      payload: { imageBase64?: string; url?: string; mimeType?: string },
      previewUrl: string,
      sourceLabel?: string
    ) => {
      setLoading(true);
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "loading",
        createdAt: Date.now(),
        label: sourceLabel ? `Checking your ${sourceLabel} link…` : "Looking at your photo…",
      });

      try {
        const analyzeRes = await fetch("/api/vision/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const analyzeData = await parseApiResponse<VisionAnalysisResult>(analyzeRes);
        if (!analyzeData.success || !analyzeData.data) {
          throw new Error(analyzeData.error?.message || "Couldn't analyze that image.");
        }

        const analysis = analyzeData.data;
        const displayPreview = analysis.imageDataUrl ?? previewUrl;

        replaceLoading([
          {
            id: createMessageId(),
            role: "assistant",
            kind: "text",
            createdAt: Date.now(),
            content: "Here's what I found:",
          },
          {
            id: createMessageId(),
            role: "assistant",
            kind: "analysis",
            createdAt: Date.now(),
            analysis,
            previewUrl: displayPreview,
          },
        ]);

        await runProductSearch(analysis);
      } catch (error) {
        replaceLoading([
          {
            id: createMessageId(),
            role: "assistant",
            kind: "text",
            createdAt: Date.now(),
            content: error instanceof Error ? error.message : "Something went wrong. Try another photo or link.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [append, replaceLoading, runProductSearch]
  );

  async function handleImageFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type)) {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: "Please send a JPG, PNG, WebP, or HEIC image.",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: "That image is too large. Please use one under 10 MB.",
      });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const base64 = dataUrl.split(",")[1];
    append({
      id: createMessageId(),
      role: "user",
      kind: "image",
      createdAt: Date.now(),
      previewUrl: dataUrl,
    });
    await runVisionAnalyze({ imageBase64: base64, mimeType: file.type }, dataUrl);
  }

  async function handleLink(url: string) {
    const host = new URL(url).hostname;
    const sourceLabel =
      host.includes("instagram") ? "Instagram" :
      host.includes("youtube") || host.includes("youtu.be") ? "YouTube" :
      host.includes("tiktok") ? "TikTok" : "Link";

    append({
      id: createMessageId(),
      role: "user",
      kind: "link",
      createdAt: Date.now(),
      url,
      sourceLabel,
    });
    await runVisionAnalyze({ url }, url, sourceLabel);
  }

  async function sendTextMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (isShoppingLink(trimmed)) {
      const url = extractShoppingLink(trimmed)!;
      setInput("");
      await handleLink(url);
      return;
    }

    const userMsg: TextChatMessage = {
      id: createMessageId(),
      role: "user",
      kind: "text",
      createdAt: Date.now(),
      content: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    append({
      id: createMessageId(),
      role: "assistant",
      kind: "loading",
      createdAt: Date.now(),
      label: "Thinking…",
    });

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toTextMessages(nextMessages),
          accountId: accountId ?? undefined,
          country,
          searchUnlocked,
          mandates,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Agent error");

      const assistantMessages: ChatMessage[] = [
        {
          id: createMessageId(),
          role: "assistant",
          kind: "text",
          createdAt: Date.now(),
          content: data.text || "Done.",
        },
      ];

      for (const tr of data.toolResults ?? []) {
        if (tr.toolName === "search_products" || tr.toolName === "compare_prices") {
          const listings = parseSearchToolResult(tr.result);
          if (listings?.length) {
            assistantMessages.push({
              id: createMessageId(),
              role: "assistant",
              kind: "search_results",
              createdAt: Date.now(),
              productName: listings[0].listingTitle,
              brand: "Unknown",
              productId: `agent-${Date.now()}`,
              listings,
            });
          }
        }
      }

      replaceLoading(assistantMessages);

      if (data.pendingTransaction) {
        setPendingTx(data.pendingTransaction);
        setApprovalHbar(
          data.pendingTransaction.toolName === "unlock_search_access" ? "0.1" : approvalHbar
        );
        setApprovalLabel(data.pendingTransaction.humanMessage ?? "Approve transaction");
        setShowApproval(true);
      }
    } catch (error) {
      replaceLoading([
        {
          id: createMessageId(),
          role: "assistant",
          kind: "text",
          createdAt: Date.now(),
          content: error instanceof Error ? error.message : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockSearch() {
    if (!requireWallet("Connect your wallet to unlock store search.")) return;

    setUnlocking(true);
    try {
      const res = await fetch("/api/agent/unlock-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPendingTx(data.pendingTransaction);
      setApprovalHbar("0.1");
      setApprovalLabel(data.pendingTransaction.humanMessage);
      setShowApproval(true);
    } catch (error) {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: error instanceof Error ? error.message : "Couldn't prepare unlock payment.",
      });
    } finally {
      setUnlocking(false);
    }
  }

  async function handleApproveTx() {
    setShowApproval(false);
    if (!pendingTx || !accountId) return;

    const result = await signAndSendTransactionBytes(accountId, pendingTx.bytesBase64);
    if (result.success) {
      if (pendingTx.toolName === "unlock_search_access") {
        markSearchUnlocked();
        setSearchUnlocked(true);
        append({
          id: createMessageId(),
          role: "assistant",
          kind: "text",
          createdAt: Date.now(),
          content: "Search unlocked for 24 hours! Looking up store prices now…",
        });
        if (pendingAnalysis) {
          const analysis = pendingAnalysis;
          setPendingAnalysis(null);
          await runProductSearch(analysis);
        }
      } else {
        append({
          id: createMessageId(),
          role: "assistant",
          kind: "text",
          createdAt: Date.now(),
          content: `Payment sent${result.transactionId ? ` (${result.transactionId})` : ""}. Thanks for shopping with Dora!`,
        });
        refreshBalance();
      }
    } else {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: result.error ?? "Transaction cancelled or failed.",
      });
    }
    setPendingTx(null);
  }

  function handleSignMandate() {
    if (!requireWallet("Connect your wallet to authorize spending.")) return;
    signMandate("Dora shopping", "25");
    append({
      id: createMessageId(),
      role: "assistant",
      kind: "text",
      createdAt: Date.now(),
      content: "Spending authorized up to 25 ℏ. Tap Pay with HBAR on any item when you're ready.",
    });
  }

  async function handlePay(target: ChatPayTarget) {
    const listingKey = `${target.listing.retailerId}-${target.listing.listingTitle}`;
    setPayingListingId(listingKey);

    if (!requireWallet("Connect HashPack to pay with HBAR.")) {
      setPayingListingId(null);
      return;
    }

    if (mandates.length === 0) {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "mandate_prompt",
        createdAt: Date.now(),
        maxSpendHbar: "25",
      });
      setPayingListingId(null);
      return;
    }

    try {
      const cartItemId = crypto.randomUUID();
      const res = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          paymentMethod: "full",
          items: [
            {
              cartItemId,
              productId: target.productId,
              productName: target.listing.listingTitle,
              brand: target.brand,
              imageCid: "chat",
              retailerId: target.listing.retailerId,
              retailerName: target.listing.retailerName,
              price: target.listing.price,
              priceHbar: target.listing.priceHbar,
              quantity: 1,
              affiliateUrl: target.listing.affiliateUrl || target.listing.url,
            },
          ],
        }),
      });

      const data = await parseApiResponse<{ transactionBytes: string; transactionId: string }>(res);
      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Checkout failed");
      }

      const feeTinybar =
        (BigInt(target.listing.priceHbar) * BigInt(100)) / BigInt(10000);
      const totalTinybar = BigInt(target.listing.priceHbar) + feeTinybar;

      setPendingTx({
        bytesBase64: data.data.transactionBytes,
        humanMessage: `Pay ${formatHbar(totalTinybar.toString())} for ${target.listing.listingTitle}`,
        toolName: "build_checkout_tx",
      });
      setApprovalHbar((Number(totalTinybar) / 100_000_000).toFixed(4));
      setApprovalLabel(`Pay for ${target.listing.retailerName} item`);
      setShowApproval(true);
    } catch (error) {
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: error instanceof Error ? error.message : "Couldn't start checkout.",
      });
    } finally {
      setPayingListingId(null);
    }
  }

  async function handleConnectWallet() {
    setShowWalletDialog(true);
    setWalletDialogReason("Connect HashPack to check balance and pay.");
    try {
      await connect("hashpack");
      setShowWalletDialog(false);
      refreshBalance();
      append({
        id: createMessageId(),
        role: "assistant",
        kind: "text",
        createdAt: Date.now(),
        content: `Wallet connected!${balance ? ` Balance: ${formatHbar(balance.tinybar)}` : ""}`,
      });
    } catch {
      // WalletConnector in dialog handles errors
    }
  }

  const showStarters = messages.length <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Dora</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Snap · Search · Pay with HBAR
            {searchUnlocked ? " · Stores unlocked" : ""}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {isConnected && accountId ? (
            <button
              type="button"
              onClick={() => setShowWalletDialog(true)}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] text-[var(--accent)] font-mono"
            >
              {balance ? formatHbar(balance.tinybar) : accountId.slice(0, 12) + "…"}
            </button>
          ) : (
            <Button variant="accent" size="sm" onClick={handleConnectWallet}>
              Connect Wallet
            </Button>
          )}
        </div>
      </div>

      <Card variant="glass" className="flex-1 flex flex-col overflow-hidden p-0">
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) handleImageFile(file);
          }}
        >
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              onPay={handlePay}
              onUnlockSearch={handleUnlockSearch}
              onSignMandate={handleSignMandate}
              payingListingId={payingListingId}
              unlocking={unlocking}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {showStarters && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30"
            >
              📷 Upload a photo
            </button>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendTextMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSend={() => sendTextMessage(input)}
          onImageSelect={handleImageFile}
          loading={loading}
          dragActive={dragActive}
          onDragActive={setDragActive}
        />
      </Card>

      <ChatWalletDialog
        open={showWalletDialog}
        onOpenChange={setShowWalletDialog}
        reason={walletDialogReason}
      />

      <ApprovalGate
        open={showApproval}
        title={approvalLabel}
        items={[
          {
            name: pendingTx?.humanMessage ?? "Transaction",
            price: 0,
            retailer: "Hedera",
          },
        ]}
        currency={market.currency}
        total={0}
        totalHbar={String(Math.floor(parseFloat(approvalHbar || "0.1") * 100_000_000))}
        fees={{ transactionFee: 0 }}
        onApprove={handleApproveTx}
        onReject={() => {
          setShowApproval(false);
          setPendingTx(null);
        }}
      />
    </div>
  );
}
