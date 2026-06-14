import { z } from "zod";
import {
  AgentMode,
  handleTransaction,
  type Context,
  type Plugin,
  type Tool,
} from "@hashgraph/hedera-agent-kit";
import {
  TransferTransaction,
  AccountId,
  Hbar,
  Client,
  Transaction,
} from "@hiero-ledger/sdk";
import { buildRetailerListings } from "@/lib/commerce/retailer-listings";
import { resolveCountry, type CountryCode } from "@/lib/commerce/market";
import { formatHbar, formatPrice } from "@/lib/utils/format";
import { analyzeProductImage } from "@/lib/ai/vision";
import { buildPaymentTransaction, buildPayIn3Schedule } from "@/lib/hedera/payments";
import {
  createMandatePayload,
  verifyMandate,
} from "@/lib/hedera/mandates";
import type { AgentSessionContext } from "@/lib/agent/types";
import {
  getTreasuryAccountId,
  SEARCH_UNLOCK_TINYBAR,
} from "@/lib/agent/agent-config";

function requireWallet(session: AgentSessionContext): string {
  if (!session.accountId) {
    throw new Error("Connect your HashPack wallet before this action.");
  }
  return session.accountId;
}

function requireSearchUnlocked(session: AgentSessionContext): void {
  if (!session.searchUnlocked) {
    throw new Error(
      "Retailer search is locked. Pay the unlock fee with unlock_search_access (0.1 ℏ) or complete unlock payment first."
    );
  }
}

function requireMandate(session: AgentSessionContext, amountTinybar: string): void {
  requireWallet(session);
  if (session.mandates.length === 0) {
    throw new Error(
      "No AP2 spending mandate found. Use create_mandate_payload and sign a mandate in Settings first."
    );
  }
  const active = session.mandates[session.mandates.length - 1];
  const check = verifyMandate(active, amountTinybar);
  if (!check.valid) {
    throw new Error(check.reason ?? "AP2 mandate validation failed");
  }
}

export function createCommercePlugin(session: AgentSessionContext): Plugin {
  const country = session.country;

  const tools = (): Tool[] => [
    {
      method: "analyze_product_image",
      name: "analyze_product_image",
      description:
        "UCP: Analyze a product from a base64 image. Returns product name, brand, category, and confidence. Free — no HBAR required.",
      parameters: z.object({
        imageBase64: z.string().describe("Base64-encoded image data (no data: prefix)"),
        mimeType: z.string().optional().default("image/jpeg"),
      }),
      async execute(_client: Client, _ctx: Context, params: { imageBase64: string; mimeType?: string }) {
        const result = await analyzeProductImage(params.imageBase64, {
          mimeType: params.mimeType ?? "image/jpeg",
        });
        return JSON.stringify({
          productName: result.identifiedProductName,
          brand: result.detectedBrand,
          category: result.detectedCategory,
          confidence: result.confidence,
          description: result.gpt4vDescription,
        });
      },
    },
    {
      method: "search_products",
      name: "search_products",
      description:
        "UCP: Search regional retailers for a product by name. Requires search unlock. Returns HBAR prices and match quality.",
      parameters: z.object({
        productName: z.string(),
        brand: z.string().optional().default("Unknown"),
        category: z
          .enum(["home", "electronics", "shoes", "clothing", "accessories", "beauty"])
          .optional()
          .default("home"),
        countryCode: z.string().optional(),
      }),
      async execute(_client: Client, _ctx: Context, params: {
        productName: string;
        brand?: string;
        category?: string;
        countryCode?: string;
      }) {
        requireSearchUnlocked(session);
        const c = resolveCountry(params.countryCode ?? country) as CountryCode;
        const listings = buildRetailerListings(
          params.productName,
          params.brand ?? "Unknown",
          params.category as "home",
          c
        );
        const summary = listings.slice(0, 6).map((l) => ({
          retailer: l.retailerName,
          title: l.listingTitle,
          priceLocal: formatPrice(l.price, l.currency),
          priceHbar: formatHbar(l.priceHbar),
          match: l.matchQuality,
          url: l.url,
        }));
        return JSON.stringify({ country: c, listings: summary });
      },
    },
    {
      method: "compare_prices",
      name: "compare_prices",
      description: "UCP: Compare prices across retailers for a product name. Requires search unlock.",
      parameters: z.object({
        productName: z.string(),
        brand: z.string().optional().default("Unknown"),
        category: z
          .enum(["home", "electronics", "shoes", "clothing", "accessories", "beauty"])
          .optional()
          .default("home"),
      }),
      async execute(_client: Client, _ctx: Context, params: {
        productName: string;
        brand?: string;
        category?: string;
      }) {
        requireSearchUnlocked(session);
        const listings = buildRetailerListings(
          params.productName,
          params.brand ?? "Unknown",
          params.category as "home",
          country
        );
        const sorted = [...listings].sort((a, b) => a.price - b.price);
        const best = sorted[0];
        return JSON.stringify({
          bestRetailer: best?.retailerName,
          bestPriceHbar: best ? formatHbar(best.priceHbar) : null,
          bestPriceLocal: best ? formatPrice(best.price, best.currency) : null,
          options: sorted.slice(0, 5).map((l) => ({
            retailer: l.retailerName,
            priceHbar: formatHbar(l.priceHbar),
            priceLocal: formatPrice(l.price, l.currency),
          })),
        });
      },
    },
    {
      method: "create_mandate_payload",
      name: "create_mandate_payload",
      description:
        "AP2: Create a spending mandate payload for the user to sign. Required before checkout.",
      parameters: z.object({
        maxSpendHbar: z.string().describe("Maximum HBAR the agent may propose for checkout, e.g. 25"),
        purpose: z.string().optional().default("Dora AI shopping"),
      }),
      async execute(_client: Client, _ctx: Context, params: { maxSpendHbar: string; purpose?: string }) {
        const accountId = requireWallet(session);
        const hbarTinybar = BigInt(Math.floor(parseFloat(params.maxSpendHbar) * 100_000_000)).toString();
        const { payload, mandateId } = createMandatePayload({
          accountId,
          purpose: params.purpose ?? "Dora AI shopping",
          maxSpendHbar: hbarTinybar,
        });
        return JSON.stringify({
          mandateId,
          payload,
          instruction: "Sign this mandate in Dora Settings or approve when prompted.",
        });
      },
    },
    {
      method: "verify_mandate",
      name: "verify_mandate",
      description: "AP2: Verify an active mandate allows a proposed HBAR spend.",
      parameters: z.object({
        amountHbar: z.string().describe("Proposed spend in HBAR, e.g. 12.5"),
      }),
      async execute(_client: Client, _ctx: Context, params: { amountHbar: string }) {
        requireWallet(session);
        const tinybar = BigInt(Math.floor(parseFloat(params.amountHbar) * 100_000_000)).toString();
        const mandate = session.mandates[session.mandates.length - 1];
        if (!mandate) {
          return JSON.stringify({ valid: false, reason: "No mandate on file" });
        }
        const result = verifyMandate(mandate, tinybar);
        return JSON.stringify(result);
      },
    },
    {
      method: "unlock_search_access",
      name: "unlock_search_access",
      description:
        "Payment gate: Pay 0.1 ℏ to unlock retailer search (UCP) for 24 hours. Returns transaction bytes for HashPack.",
      parameters: z.object({}),
      async execute(client: Client, ctx: Context) {
        const from = requireWallet(session);
        const treasury = getTreasuryAccountId();
        const tx = new TransferTransaction()
          .addHbarTransfer(AccountId.fromString(from), Hbar.fromTinybars(`-${SEARCH_UNLOCK_TINYBAR}`))
          .addHbarTransfer(AccountId.fromString(treasury), Hbar.fromTinybars(SEARCH_UNLOCK_TINYBAR))
          .setTransactionMemo("Dora AI — unlock retailer search (24h)");

        const result = await handleTransaction(
          tx,
          client,
          { ...ctx, mode: AgentMode.RETURN_BYTES, accountId: from },
          () => "Pay 0.1 ℏ to unlock retailer search for 24 hours"
        );
        return JSON.stringify(result);
      },
    },
    {
      method: "build_checkout_tx",
      name: "build_checkout_tx",
      description:
        "ACP: Build a full HBAR payment transaction. Requires AP2 mandate. Returns bytes for HashPack signing.",
      parameters: z.object({
        amountHbar: z.string().describe("Total HBAR to pay, e.g. 8.5"),
        memo: z.string().optional(),
      }),
      async execute(client: Client, ctx: Context, params: { amountHbar: string; memo?: string }) {
        const from = requireWallet(session);
        const tinybar = BigInt(Math.floor(parseFloat(params.amountHbar) * 100_000_000)).toString();
        requireMandate(session, tinybar);

        const { transactionBytes } = await buildPaymentTransaction({
          fromAccountId: from,
          amountTinybar: tinybar,
          memo: params.memo ?? "Dora AI checkout",
        });

        const tx = Transaction.fromBytes(transactionBytes);
        const result = await handleTransaction(
          tx,
          client,
          { ...ctx, mode: AgentMode.RETURN_BYTES, accountId: from },
          () => `Pay ${params.amountHbar} ℏ for your order`
        );
        return JSON.stringify(result);
      },
    },
    {
      method: "build_payin3_schedule",
      name: "build_payin3_schedule",
      description:
        "MPP: Build a 3-installment payment schedule. Requires AP2 mandate. Returns schedule transaction bytes.",
      parameters: z.object({
        totalAmountHbar: z.string(),
        memo: z.string().optional(),
      }),
      async execute(client: Client, ctx: Context, params: { totalAmountHbar: string; memo?: string }) {
        const from = requireWallet(session);
        const tinybar = BigInt(Math.floor(parseFloat(params.totalAmountHbar) * 100_000_000)).toString();
        requireMandate(session, tinybar);

        const plan = await buildPayIn3Schedule({
          fromAccountId: from,
          totalAmountTinybar: tinybar,
          memo: params.memo ?? "Dora AI Pay in 3",
        });

        const first = plan.installments[0];
        const tx = Transaction.fromBytes(first.transactionBytes);
        const result = await handleTransaction(
          tx,
          client,
          { ...ctx, mode: AgentMode.RETURN_BYTES, accountId: from },
          () => `Pay in 3 — first installment of ${params.totalAmountHbar} ℏ total`
        );
        return JSON.stringify({ ...result, scheduleId: plan.scheduleId, installment: 1 });
      },
    },
  ];

  return {
    name: "dora-commerce",
    version: "1.0.0",
    description: "Dora AI commerce: UCP, AP2, ACP, MPP on Hedera",
    tools,
  };
}
