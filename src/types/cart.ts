// ============================================
// Cart Types
// ============================================

export type PaymentMethod = "full" | "payin3" | "groupbuy";

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  brand: string;
  imageCid: string;
  retailerId: string;
  retailerName: string;
  /** Price in smallest currency unit (paise for INR, cents for USD) */
  price: number;
  currency: string;
  priceHbar: string;
  size?: string;
  quantity: number;
  affiliateUrl: string;
}

export interface CartSummary {
  itemCount: number;
  currency: string;
  subtotal: number;
  subtotalHbar: string;
  transactionFee: number;
  payIn3Fee: number;
  total: number;
  totalHbar: string;
  paymentMethod: PaymentMethod;
  /** @deprecated use subtotal — kept for legacy persisted carts */
  subtotalUsd?: number;
  /** @deprecated use total */
  totalUsd?: number;
}
