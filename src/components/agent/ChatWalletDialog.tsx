"use client";

import { WalletConnector } from "@/components/wallet/WalletConnector";
import { HBarDisplay } from "@/components/wallet/HBarDisplay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";

interface ChatWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

export function ChatWalletDialog({ open, onOpenChange, reason }: ChatWalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
          <DialogDescription>
            {reason || "Connect HashPack to check your balance and pay with HBAR."}
          </DialogDescription>
        </DialogHeader>
        <WalletConnector />
        <HBarDisplay />
      </DialogContent>
    </Dialog>
  );
}
