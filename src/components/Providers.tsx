"use client";

import { UIContextProvider, useUI } from "@/contexts/UIContext";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { SpendingLimitContextProvider } from "@/contexts/SpendingLimitContext";
import { CartContextProvider } from "@/contexts/CartContext";
import { SearchContextProvider } from "@/contexts/SearchContext";
import { CheckoutContextProvider } from "@/contexts/CheckoutContext";
import { GroupBuyContextProvider } from "@/contexts/GroupBuyContext";
import { MarketContextProvider } from "@/contexts/MarketContext";
import { ToastContainer } from "@/components/ui/Toast";

/**
 * Renders the toast notification overlay.
 * Separated so it can access UIContext.
 */
function ToastOverlay() {
  const { toasts, dismissToast } = useUI();
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}

/**
 * Client-side provider wrapper for all React Contexts.
 * Provider nesting order (innermost has access to outer):
 * UIContext → Wallet → SpendingLimit → Cart → Search → Checkout → GroupBuy
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIContextProvider>
      <MarketContextProvider>
        <WalletContextProvider>
          <SpendingLimitContextProvider>
            <CartContextProvider>
              <SearchContextProvider>
                <CheckoutContextProvider>
                  <GroupBuyContextProvider>
                    {children}
                    <ToastOverlay />
                  </GroupBuyContextProvider>
                </CheckoutContextProvider>
              </SearchContextProvider>
            </CartContextProvider>
          </SpendingLimitContextProvider>
        </WalletContextProvider>
      </MarketContextProvider>
    </UIContextProvider>
  );
}
