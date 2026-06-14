// ============================================
// Cart Types
// ============================================

export type PaymentMethod = "full" | "payin3" | "groupbuy";

export interface CartItem {
  cartItemId: string; // UUID generated client-side
  productId: string;
  productName: string;
  brand: string;
  imageCid: string;
  retailerId: string;
  retailerName: string;
  price: number; // USD cents
  priceHbar: string; // tinybar
  size?: string;
  quantity: number;
  affiliateUrl: string;
}

export interface CartSummary {
  itemCount: number;
  subtotalUsd: number;
  subtotalHbar: string;
  transactionFee: number; // 1% in USD cents
  payIn3Fee: number; // 2% in USD cents (if applicable)
  totalUsd: number;
  totalHbar: string;
  paymentMethod: PaymentMethod;
}
