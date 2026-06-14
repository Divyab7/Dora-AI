"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const LINK_PATTERN =
  /https?:\/\/(?:www\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com)\/\S+/i;

export function isShoppingLink(text: string): boolean {
  return LINK_PATTERN.test(text.trim());
}

export function extractShoppingLink(text: string): string | null {
  const match = text.trim().match(LINK_PATTERN);
  return match ? match[0] : null;
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onImageSelect: (file: File) => void;
  loading?: boolean;
  dragActive?: boolean;
  onDragActive?: (active: boolean) => void;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onImageSelect,
  loading,
  dragActive,
  onDragActive,
}: ChatComposerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onImageSelect(file);
        }
        return;
      }
    }
  }

  return (
    <div
      className={cn(
        "p-3 border-t border-[var(--border)] space-y-2",
        dragActive && "bg-[var(--accent-dim)]"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        onDragActive?.(true);
      }}
      onDragLeave={() => onDragActive?.(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragActive?.(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) onImageSelect(file);
      }}
    >
      {dragActive && (
        <p className="text-xs text-center text-[var(--accent)]">Drop your photo here</p>
      )}

      <form
        className="flex gap-2 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageSelect(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          aria-label="Attach photo"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--surface-elevated)] text-lg hover:bg-[var(--border)] disabled:opacity-50"
        >
          📷
        </button>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder="Describe a product, paste a link, or attach a photo…"
          className="flex-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-primary)] min-h-[42px]"
          disabled={loading}
        />

        <Button type="submit" variant="accent" disabled={loading || !value.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
