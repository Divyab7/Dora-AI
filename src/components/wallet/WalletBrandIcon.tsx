import Image from "next/image";
import type { WalletProvider } from "@/types/wallet";

const ICONS: Record<WalletProvider, string> = {
  hashpack: "/wallets/hashpack.svg",
  blade: "/wallets/blade.svg",
};

const LABELS: Record<WalletProvider, string> = {
  hashpack: "HashPack",
  blade: "Blade Wallet",
};

interface WalletBrandIconProps {
  provider: WalletProvider;
  size?: number;
  className?: string;
}

export function WalletBrandIcon({ provider, size = 40, className = "" }: WalletBrandIconProps) {
  return (
    <Image
      src={ICONS[provider]}
      alt={`${LABELS[provider]} logo`}
      width={size}
      height={size}
      className={`rounded-xl flex-shrink-0 ${className}`}
    />
  );
}
