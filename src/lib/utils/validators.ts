import { z } from "zod";

// ============================================
// Product & Search Schemas
// ============================================

export const searchRequestSchema = z.object({
  imageCid: z.string().min(1, "Image CID is required"),
  filters: z
    .object({
      category: z.enum(["clothing", "shoes", "accessories", "electronics", "home", "beauty"]).optional(),
      brand: z.string().optional(),
      maxPrice: z.number().positive().optional(),
      inStock: z.boolean().optional(),
    })
    .optional(),
});

export const priceCompareSchema = z.object({
  productId: z.string().min(1),
  retailerIds: z.array(z.string()).optional(),
});

// ============================================
// Cart & Checkout Schemas
// ============================================

export const cartItemSchema = z.object({
  cartItemId: z.string().uuid(),
  productId: z.string().min(1),
  productName: z.string().min(1),
  brand: z.string().min(1),
  imageCid: z.string().min(1),
  retailerId: z.string().min(1),
  retailerName: z.string().min(1),
  price: z.number().positive(),
  priceHbar: z.string().min(1),
  size: z.string().optional(),
  quantity: z.number().int().min(1).max(10),
  affiliateUrl: z.string().url(),
});

export const checkoutRequestSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Cart must have at least 1 item"),
  paymentMethod: z.enum(["full", "payin3", "groupbuy"]),
  payIn3Installments: z.literal(3).optional(),
  groupBuySplitCount: z.number().int().min(2).max(10).optional(),
  accountId: z.string().regex(/^0\.0\.\d+$/, "Invalid Hedera account ID"),
});

// ============================================
// Wallet & Mandate Schemas
// ============================================

export const walletConnectSchema = z.object({
  provider: z.enum(["hashpack", "blade"]),
  accountId: z.string().regex(/^0\.0\.\d+$/, "Invalid account ID"),
  network: z.enum(["testnet", "mainnet"]),
});

export const mandateSchema = z.object({
  mandateId: z.string().min(1),
  purpose: z.string().min(1),
  maxSpendHbar: z.string().min(1),
  expiresAt: z.string().nullable(),
  signature: z.string().min(1),
});

// ============================================
// GroupBuy Schemas
// ============================================

export const groupBuyCreateSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  participantCount: z.number().int().min(2).max(10),
  durationDays: z.number().int().min(1).max(30),
  creatorAccountId: z.string().regex(/^0\.0\.\d+$/),
});

export const groupBuyContributeSchema = z.object({
  groupId: z.string().min(1),
  escrowContractId: z.string().min(1),
  contributorAccountId: z.string().regex(/^0\.0\.\d+$/),
  amountHbar: z.string().min(1),
});

// ============================================
// HCS Log Schemas
// ============================================

export const hcsLogSchema = z.object({
  eventType: z.enum([
    "search",
    "price_update",
    "purchase",
    "payin3_created",
    "payin3_installment",
    "groupbuy_created",
    "groupbuy_contribution",
    "groupbuy_executed",
    "groupbuy_cancelled",
    "cancellation",
    "refund",
    "affiliate_click",
    "mandate_signed",
  ]),
  payload: z.record(z.unknown()),
  accountId: z.string().regex(/^0\.0\.\d+$/).optional(),
});

// ============================================
// Spending Limits
// ============================================

export const spendingLimitsSchema = z.object({
  dailyLimit: z.number().positive().max(1000000),
  perTransactionLimit: z.number().positive().max(1000000),
  requiresApprovalAbove: z.number().min(0).max(1000000),
});

// ============================================
// Affiliate
// ============================================

export const affiliateClickSchema = z.object({
  productId: z.string().min(1),
  retailerId: z.string().min(1),
  affiliateUrl: z.string().url(),
  accountId: z.string().regex(/^0\.0\.\d+$/).optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type PriceCompareRequest = z.infer<typeof priceCompareSchema>;
export type CartItemValidated = z.infer<typeof cartItemSchema>;
export type CheckoutRequestValidated = z.infer<typeof checkoutRequestSchema>;
export type WalletConnectRequest = z.infer<typeof walletConnectSchema>;
export type GroupBuyCreateRequest = z.infer<typeof groupBuyCreateSchema>;
export type GroupBuyContributeRequest = z.infer<typeof groupBuyContributeSchema>;
export type HCSLogEntry = z.infer<typeof hcsLogSchema>;
export type SpendingLimitsConfig = z.infer<typeof spendingLimitsSchema>;
