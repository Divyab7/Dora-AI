"use client";

import { ChatAnalysisCard } from "@/components/agent/ChatAnalysisCard";
import { ChatProductResults } from "@/components/agent/ChatProductResults";
import { WalletConnector } from "@/components/wallet/WalletConnector";
import { Button } from "@/components/ui/Button";
import type { ChatMessage, ChatPayTarget } from "@/types/agent-chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onPay?: (target: ChatPayTarget) => void;
  onUnlockSearch?: () => void;
  onSignMandate?: () => void;
  payingListingId?: string | null;
  unlocking?: boolean;
}

export function ChatMessageBubble({
  message,
  onPay,
  onUnlockSearch,
  onSignMandate,
  payingListingId,
  unlocking,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (message.kind === "loading") {
    return (
      <div className="flex justify-start">
        <div className="text-xs text-[var(--text-muted)] animate-pulse px-1">
          {message.label}
        </div>
      </div>
    );
  }

  const bubbleClass = isUser
    ? "bg-[var(--accent)] text-black"
    : "bg-[var(--surface-elevated)] text-[var(--text-primary)]";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${bubbleClass}`}>
        {message.kind === "text" && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {message.kind === "image" && (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.previewUrl}
              alt="Uploaded product"
              className="max-w-[220px] max-h-[220px] rounded-xl object-cover"
            />
            {message.caption && <p>{message.caption}</p>}
          </div>
        )}

        {message.kind === "link" && (
          <div className="space-y-1">
            <p className="text-xs opacity-80">
              {message.sourceLabel ? `${message.sourceLabel} link` : "Link shared"}
            </p>
            <p className="break-all text-xs font-mono opacity-90">{message.url}</p>
          </div>
        )}

        {message.kind === "analysis" && (
          <ChatAnalysisCard analysis={message.analysis} previewUrl={message.previewUrl} />
        )}

        {message.kind === "search_results" && onPay && (
          <ChatProductResults
            productName={message.productName}
            brand={message.brand}
            productId={message.productId}
            listings={message.listings}
            summary={message.summary}
            hasExactMatch={message.hasExactMatch}
            onPay={onPay}
            payingListingId={payingListingId}
          />
        )}

        {message.kind === "wallet_prompt" && (
          <div className="space-y-3">
            <p>{message.reason}</p>
            <WalletConnector />
          </div>
        )}

        {message.kind === "mandate_prompt" && onSignMandate && (
          <div className="space-y-3">
            <p>
              Before paying, authorize Dora to prepare checkout up to{" "}
              <strong>{message.maxSpendHbar} ℏ</strong>. You still approve every payment in
              HashPack.
            </p>
            <Button variant="accent" size="sm" onClick={onSignMandate}>
              Authorize spending
            </Button>
          </div>
        )}

        {message.kind === "unlock_prompt" && onUnlockSearch && (
          <div className="space-y-3">
            <p>
              Store search costs a small one-time fee of <strong>0.1 ℏ</strong> and stays unlocked
              for 24 hours.
            </p>
            <Button variant="accent" size="sm" disabled={unlocking} onClick={onUnlockSearch}>
              {unlocking ? "Preparing…" : "Unlock store search — 0.1 ℏ"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
