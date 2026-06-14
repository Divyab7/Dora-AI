// ============================================
// Dora-AI Application Constants
// ============================================

// Fee structure (in basis points)
export const FEES = {
  TRANSACTION_FEE_BPS: 100, // 1%
  PAYIN3_FEE_BPS: 200, // 2%
  GROUPBUY_FEE_BPS: 100, // 1%
} as const;

// Hedera network config
export const HEDERA = {
  MAINNET_MIRROR_NODE: "https://mainnet-public.mirrornode.hedera.com",
  TESTNET_MIRROR_NODE: "https://testnet.mirrornode.hedera.com",
  HCS_TOPICS: {
    SEARCH_LOG: "0.0.X_SEARCH", // Replace with actual topic ID after creation
    PRICE_LOG: "0.0.Y_PRICE",
    PURCHASE_LOG: "0.0.Z_PURCHASE",
  },
  DORA_TREASURY: "0.0.X_TREASURY", // Replace with actual treasury account
} as const;

// Spending limits (in HBAR)
export const SPENDING = {
  DEFAULT_DAILY_LIMIT_HBAR: 100,
  DEFAULT_PER_TX_LIMIT_HBAR: 25,
  DEFAULT_APPROVAL_THRESHOLD_HBAR: 0, // Approve all (human-in-the-loop)
  PAYIN3_MIN_HBAR: 5,
  GROUPBUY_MIN_PARTICIPANTS: 2,
  GROUPBUY_MAX_PARTICIPANTS: 10,
  CANCELLATION_WINDOW_HOURS: 24,
} as const;

// PayIn3 installments
export const PAYIN3 = {
  INSTALLMENT_COUNT: 3,
  INSTALLMENT_INTERVAL_DAYS: 30,
} as const;

// IPFS / Pinata
export const IPFS = {
  GATEWAY: "https://ipfs.io/ipfs",
  PINATA_GATEWAY: "https://gateway.pinata.cloud/ipfs",
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/heic"],
} as const;

// AI / Vision
export const AI = {
  PINECONE_INDEX: "dora-products",
  PINECONE_DIMENSION: 1536,
  PINECONE_TOP_K: 20,
  MIN_CONFIDENCE_SCORE: 0.35,
  /** Minimum vision confidence before showing product search results */
  MIN_VISION_CONFIDENCE: 0.35,
  /** Escalate to GPT-4o when Gemini confidence is below this (0-100 scale) */
  VISION_ESCALATION_THRESHOLD: 60,
  GPT4V_MODEL: "gpt-4-vision-preview",
  EMBEDDING_MODEL: "text-embedding-3-small",
} as const;

// Supported retailers
export const RETAILERS = ["amazon", "nike", "stockx"] as const;
export type Retailer = (typeof RETAILERS)[number];

// Product categories
export const CATEGORIES = [
  "clothing",
  "shoes",
  "accessories",
  "electronics",
  "home",
  "beauty",
] as const;
export type ProductCategory = (typeof CATEGORIES)[number];

// HBAR to USD conversion (approximate, updated periodically)
export const HBAR_USD_RATE = 0.08; // 1 HBAR ≈ $0.08 USD

// Routes
export const ROUTES = {
  HOME: "/home",
  SCAN: "/scan",
  VERIFY: "/verify",
  RESULTS: "/results",
  PRODUCT: (id: string) => `/product/${id}`,
  CART: "/cart",
  CHECKOUT: "/checkout",
  ORDERS: "/orders",
  ORDER_DETAIL: (txId: string) => `/orders/${txId}`,
  GROUPBUY: "/groupbuy",
  GROUPBUY_DETAIL: (id: string) => `/groupbuy/${id}`,
  WALLET: "/wallet",
  SETTINGS: "/settings",
  ONBOARDING: "/onboarding",
  CONNECT: "/connect",
} as const;
