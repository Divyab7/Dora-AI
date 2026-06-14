# Dora AI

> **See it. Snap it. Buy it with HBAR.**
>
> AI-powered visual shopping agent for the Hedera network. Chat with Dora at **`/agent`** — upload a photo, paste an Instagram or YouTube link, compare regional prices, and pay with HBAR via HashPack. Human-in-the-loop safety at every step.

---

## Table of Contents

1. [What the Agent Does](#what-the-agent-does)
2. [How to Use (Step-by-Step)](#how-to-use-step-by-step)
3. [Agent Chat (`/agent`)](#agent-chat-agent)
4. [Wallet Setup (HashPack + HashConnect)](#wallet-setup-hashpack--hashconnect)
5. [Regional Pricing & Currency](#regional-pricing--currency)
6. [Payment Options](#payment-options)
7. [Safety & Security Architecture](#safety--security-architecture)
8. [Quick Start (Developers)](#quick-start-developers)
9. [Environment Variables](#environment-variables)
10. [API Reference](#api-reference)
11. [Hedera Agent Kit](#hedera-agent-kit)
12. [Hedera Integration (Deep Dive)](#hedera-integration-deep-dive)
13. [Smart Contract Design](#smart-contract-design)
14. [AI Pipeline Architecture](#ai-pipeline-architecture)
15. [State Management](#state-management)
16. [Data Flow Diagrams](#data-flow-diagrams)
17. [Project Structure](#project-structure)
18. [Tech Stack](#tech-stack)
19. [Running & Testing](#running--testing)
20. [Deployment](#deployment)
21. [Troubleshooting](#troubleshooting)
22. [Business Model](#business-model)

---

## What the Agent Does

Dora AI is a **Hedera commerce agent** — AI handles product identification, store search, and checkout preparation, but the human always approves payment in HashPack.

**Primary interface:** chat at **`/agent`**. The classic page flow (`/scan` → verify → results → cart) remains available.

```
💬 Chat → 📸 Photo / Link → 🤖 Identify → 🔍 Store prices → 🔐 Approve → ⚡ Pay in HBAR
```

### Chat-First Flow (recommended)

| Step | What Happens | Files Involved |
|------|-------------|----------------|
| **1. Open chat** | User goes to `/agent` | `src/app/(app)/agent/page.tsx`, `src/components/agent/AgentChat.tsx` |
| **2. Share input** | Upload/drag photo, paste image, or paste Instagram/YouTube/TikTok link | `ChatComposer.tsx` |
| **3. Identify** | Vision API analyzes product (name, brand, confidence) | `POST /api/vision/analyze`, `src/lib/ai/vision.ts` |
| **4. Show in chat** | Analysis card rendered inline | `ChatAnalysisCard.tsx` |
| **5. Unlock search** | Optional 0.1 ℏ fee for 24h store access | `POST /api/agent/unlock-search`, `ApprovalGate` |
| **6. Search** | Regional retailer listings with HBAR prices | `POST /api/vision/search`, `ChatProductResults.tsx` |
| **7. Connect wallet** | HashPack via in-chat dialog | `ChatWalletDialog.tsx`, `WalletConnector.tsx` |
| **8. Authorize** | Spending mandate (up to 25 ℏ) | `WalletContext.signMandate()` |
| **9. Pay** | Checkout bytes → Approval Gate → HashPack sign | `POST /api/checkout/initiate`, `sign-transaction.ts` |

### Classic Page Flow (secondary)

| Step | What Happens | Files Involved |
|------|-------------|----------------|
| **1. Capture** | Upload photo (JPG/PNG/WebP/HEIC, max 10MB) or paste Instagram/TikTok/YouTube URL | `src/app/(app)/scan/page.tsx` |
| **2. Preprocess** | Image sharpening, resize to 1024px, format validation | `src/lib/ai/preprocess.ts` |
| **3. Classify** | AI classifies image type (product photo, outfit, social screenshot, etc.) | `src/lib/ai/vision.ts` — `IMAGE_CLASSIFIER_PROMPT` |
| **4. Identify** | AI identifies product name, brand, category, color, material, style, confidence | `src/lib/ai/vision.ts` — `PRODUCT_IDENTIFIER_PROMPT` |
| **5. OCR (optional)** | Extract visible text (brand names, SKUs, hashtags) for improved accuracy | `src/lib/ai/vision.ts` — `OCR_PROMPT` |
| **6. Re-identify** | If OCR found text, re-run identification with text hints | `src/lib/ai/vision.ts` — `reidentifyWithOcrPrompt()` |
| **7. Verify** | Human reviews AI identification on `/verify` screen; confidence score shown | `src/app/(app)/verify/page.tsx` |
| **8. Embed** | Generate vector embedding from product description for similarity search | `src/lib/ai/embeddings.ts` |
| **9. Search** | Query Pinecone vector DB (or regional mock catalog) for retailer matches | `src/lib/ai/search.ts`, `src/lib/ai/catalog.ts` |
| **10. Price** | HBAR price calculated from USD via market rate, shown prominently | `src/lib/commerce/market.ts` |
| **11. Cart** | Multi-retailer cart with Pay-in-Full / PayIn3 / GroupBuy selection | `src/contexts/CartContext.tsx` |
| **12. Approve** | Mandatory Approval Gate with 2s delay, anti-clickjacking offset | `src/components/shared/ApprovalGate.tsx` |
| **13. Pay** | HashPack signs TransferTransaction; payment logged to HCS | `src/lib/hedera/payments.ts`, `src/lib/hedera/hcs.ts` |

### AI Model Priority

```
Gemini 2.5 Flash Lite (free) → Gemini 2.0 Flash → GPT-4o (paid) → BLIP (open-source)
```

Each model is tried in sequence. If one fails (quota, timeout, auth), the next takes over automatically. Agent **text chat** uses OpenAI `gpt-4o-mini` when configured, with automatic fallback to Gemini lite models.

### What Makes This an "Agent"

- **Chat-native shopping**: Upload photos, paste social links, see results, connect wallet, and pay — all in one conversation at `/agent`
- **Hedera Agent Kit**: Tool-calling agent with custom commerce plugin (balance query, search, checkout bytes)
- **Autonomous identification**: AI decides what product is in the image without human prompting
- **Autonomous search**: AI generates embeddings, queries the catalog, and ranks results
- **Autonomous checkout prep**: Totals, fees, and HBAR conversion are automatic
- **Human gate**: The agent NEVER executes a payment. Every purchase requires explicit human approval in the UI + wallet signature in HashPack

---

## How to Use (Step-by-Step)

### 1. Onboarding

Open [http://localhost:3000](http://localhost:3000). The onboarding carousel explains:
- **Snap** — Upload any product photo
- **Compare** — AI finds best prices across retailers
- **Pay** — Checkout with HBAR in seconds

Then tap **Agent** in the bottom nav (or go to `/agent`).

### 2. Shop in Chat (primary)

Everything below happens inside **`/agent`** — no need to leave the chat.

**Share a product:**
- Tap **📷** or **Upload a photo** to attach an image (drag-and-drop also works)
- Paste an **Instagram**, **YouTube**, or **TikTok** link and send
- Or type what you want — e.g. *"Find wireless headphones"*

**Review results:**
- Dora shows what it identified (name, brand, confidence)
- Store listings appear inline with **HBAR prices** and match quality
- Tap **View on [Retailer]** to open the store, or **Pay with HBAR** to checkout

**Wallet & payments:**
1. Tap **Connect Wallet** in the chat header (HashPack dialog opens in-place)
2. If store search is locked, tap **Unlock store search — 0.1 ℏ** (valid 24 hours)
3. Before first payment, tap **Authorize spending** (mandate up to 25 ℏ)
4. Tap **Pay with HBAR** on any listing → review in Approval Gate → confirm in HashPack

**Ask Dora anything:**
- *"What's my HBAR balance?"*
- *"How does paying work?"*
- Natural-language product search (when search is unlocked)

### 3. Connect Your Wallet

**In chat:** tap **Connect Wallet** on `/agent`.

**Classic flow:** click **Connect** in the top bar or go to `/connect` → choose **HashPack** → approve pairing.

Your account ID (`0.0.xxxxxxx`) and HBAR balance appear once connected.

> Wallet connection is **required before checkout**. Vision and text chat work without a wallet.

### 4. Visual Scan Flow (alternative)

Use this if you prefer the step-by-step page flow instead of chat.

**Upload a Photo:**
1. Go to `/scan` (or tap **Scan** in bottom nav)
2. Drag-and-drop an image or click to browse
3. AI processes the image (2–5 seconds typically)
4. Review the identification on `/verify`

**Paste a Link:**
1. On `/scan`, switch to the **Link** tab
2. Paste an Instagram, TikTok, YouTube, or product URL
3. The agent extracts a frame/metadata and runs the same pipeline

### 5. Verify AI Identification

The `/verify` screen shows:
- Your uploaded image
- AI-identified product name, brand, category, color
- **Confidence score** (0–100%)
- Model used (e.g., `gemini-2.5-flash-lite`)
- Tips if confidence is below 35%

Click **Looks Good — Find Prices** to proceed, or **Retake** to try again.

**Best practices for high accuracy:**
- Single product, centered, well-lit
- Plain or simple background
- Crop tightly on the item
- Avoid screenshots with heavy UI overlays

### 6. Browse Results

The `/results` page shows retailer listings with:
- **HBAR price in bold** (primary display)
- Local currency as reference (₹, $, £, etc.)
- Match confidence badge
- **Search on [Retailer] ↗** — opens store search in a new tab
- **Add to Cart** button

### 7. Cart & Checkout

1. Open **Cart** from the header badge or `/cart`
2. Adjust quantities or remove items
3. Select payment method: **Pay in Full**, **Pay in 3** (+2%), or **Group Buy**
4. Click **Continue to Checkout**
5. Review order summary with HBAR total
6. Click **Approve & Pay**

### 8. Payment Approval

1. The **Approval Gate** modal opens with a mandatory 2-second review delay
2. Review itemized cart, fees, and HBAR total
3. Tap **✓ Approve & Pay**
4. Confirm the transaction in HashPack
5. On success: redirected to Orders with transaction ID

---

## Agent Chat (`/agent`)

The chat interface is the **recommended way** to use Dora. It combines vision search, Agent Kit tool-calling, wallet connection, and HBAR checkout in one UI.

### What You Can Do in Chat

| Action | How |
|--------|-----|
| Upload product photo | 📷 button, drag-and-drop, or paste image from clipboard |
| Paste social link | Send Instagram / YouTube / TikTok URL in the message box |
| Text search | e.g. *"Find kitchen products in India"* |
| See identification | Inline analysis card with confidence score |
| Compare stores | Inline listing cards with HBAR + local currency |
| Connect wallet | Header button → HashPack dialog |
| Unlock search | 0.1 ℏ one-time fee, 24h access |
| Pay for item | **Pay with HBAR** on any listing |
| Check balance | Ask *"What's my HBAR balance?"* (wallet required) |

### Chat Architecture

```
User message / photo / link
        │
        ├── Vision path (photos & links)
        │     POST /api/vision/analyze → analysis card in chat
        │     POST /api/vision/search  → listing cards in chat
        │
        └── Text path (questions & commands)
              POST /api/agent/chat → Hedera Agent Kit + commerce tools
                    ├── coreAccountQueryPlugin (balance)
                    ├── coreConsensusPlugin
                    └── dora-commerce plugin (search, checkout, unlock)
        │
        ▼
Payment bytes → ApprovalGate → HashPack sign
```

### Key Files

| File | Purpose |
|------|---------|
| `src/components/agent/AgentChat.tsx` | Main chat orchestrator |
| `src/components/agent/ChatComposer.tsx` | Input, attach, link detection |
| `src/components/agent/ChatProductResults.tsx` | Inline store listings |
| `src/components/agent/ChatAnalysisCard.tsx` | Product identification card |
| `src/components/agent/ChatWalletDialog.tsx` | In-chat wallet connection |
| `src/lib/agent/toolkit.ts` | Hedera Agent Kit + commerce plugin |
| `src/lib/agent/plugins/commerce/index.ts` | Custom shopping tools |
| `src/app/api/agent/chat/route.ts` | LLM + tool-calling API |
| `src/app/api/agent/unlock-search/route.ts` | Search unlock transaction bytes |

## Wallet Setup (HashPack + HashConnect)

### Prerequisites

1. **Install HashPack**: [hashpack.app/download](https://www.hashpack.app/download)
2. **Create a Hedera testnet account** in HashPack
3. **Get testnet HBAR**: [portal.hedera.com/faucet](https://portal.hedera.com/faucet)

### WalletConnect Project ID

Dora AI uses **HashConnect** (Hedera's implementation of WalletConnect v2) to connect with HashPack.

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up → **New Project**
3. Name it `Dora AI`
4. Copy the **Project ID**
5. Add to `.env.local`:

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_HEDERA_NETWORK=testnet
```

6. Restart the dev server: `npm run dev`

### Connection Flow

```
App checks for HashPack extension → Falls back to HashConnect with Project ID
                                          ↓
User taps "Connect" → HashPack popup → Approve pairing → Account ID shown in header
```

### Connection Troubleshooting

| Issue | Check |
|-------|-------|
| "Wallet setup required" | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set in `.env.local` + server restarted |
| HashPack not detected | Install the HashPack browser extension from hashpack.app |
| Connection rejected | Ensure HashPack is on **testnet** (matches `NEXT_PUBLIC_HEDERA_NETWORK`) |
| Pairing fails | Clear HashPack's connected dApps in extension settings and retry |

---

## Regional Pricing & Currency

Dora AI automatically detects the user's region and shows prices in local currency alongside HBAR.

### Detection Order

| Priority | Method | Example |
|----------|--------|---------|
| 1 | Saved preference | Settings → Shopping Region |
| 2 | Browser timezone | `Asia/Kolkata` → India (INR) |
| 3 | Browser locale | `en-IN` → India |
| 4 | Fallback | United States (USD) |

### Supported Countries (14)

🇮🇳 India · 🇺🇸 United States · 🇬🇧 United Kingdom · 🇦🇪 UAE · 🇨🇦 Canada · 🇦🇺 Australia · 🇩🇪 Germany · 🇫🇷 France · 🇯🇵 Japan · 🇸🇬 Singapore · 🇧🇷 Brazil · 🇲🇽 Mexico · 🇰🇷 South Korea · 🇸🇦 Saudi Arabia

Each country has its own retailer list (e.g., India: Amazon, Flipkart, Meesho; US: Amazon, Walmart, Target, Best Buy, Nike, StockX).

### Price Display

- **HBAR is always primary** — shown in bold with ℏ symbol
- Local currency shown as reference in parentheses
- Conversion uses approximate HBAR/USD rate (configurable)

---

## Payment Options

| Method | Mechanism | Fee | Hedera Feature |
|--------|-----------|-----|----------------|
| **Pay in Full** | Single `TransferTransaction` | 1% | ACP |
| **Pay in 3** | 3 `ScheduleCreateTransaction` installments, 30 days apart | 1% + 2% | MPP |
| **Group Buy** | `EscrowContract` — funds released when target met; refund if expired | 1% | Smart Contract |

### Pay in Full Flow

```
User approves → Server builds TransferTransaction bytes
    → HashPack signs → Transaction submitted to Hedera
    → Mirror node confirms → HCS log written → Order created
```

### Pay in 3 Flow

```
User selects PayIn3 → Server calculates 3 equal installments
    → Creates ScheduleCreateTransaction for each (30-day intervals)
    → Installment 1 executes immediately
    → Installments 2 & 3 scheduled for +30 and +60 days
    → User can cancel remaining installments within 24h window
```

### Group Buy Flow

```
Creator sets split count (2–10) → Server deploys EscrowContract
    → Invite link generated → Participants contribute their share
    → When fully funded: auto-execute → Funds sent to merchant
    → If expired before funded: anyone triggers refund → All get HBAR back
```

---

## Safety & Security Architecture

Dora AI implements **5-layer defense-in-depth** to ensure the agent cannot spend autonomously:

### Layer 1: Per-Transaction Limit
- Source: `SpendingLimitContext` → user-configured cap (default 25 ℏ)
- Enforcement: `src/lib/security/spending.ts` → `checkTransactionLimit()`
- Override: **None** — absolute cap

### Layer 2: Daily Limit
- Source: `SpendingLimitContext` → user-configured cap (default 100 ℏ)
- Tracks cumulative daily spend; auto-resets at midnight UTC
- Enforcement: CheckoutContext refuses to initiate if exceeded

### Layer 3: Approval Gate (Human-in-the-Loop)
- **Every purchase** triggers the `ApprovalGate` modal
- **Minimum 2-second delay** before "Approve" button activates
- **Random pixel offset** prevents clickjacking/macro attacks
- Modal cannot be dismissed by clicking outside or pressing Escape
- File: `src/components/shared/ApprovalGate.tsx`

### Layer 4: AP2 Cryptographic Mandates
- User signs a spending mandate stored locally
- Mandate specifies: purpose, max spend, optional expiry
- Verified before any transaction is built
- File: `src/lib/hedera/mandates.ts`, `src/lib/security/approvals.ts`

### Layer 5: Wallet-Level Confirmation
- HashPack displays transaction details
- User must explicitly sign in the wallet extension
- Final gate before transaction hits Hedera mainnet/testnet

### Additional Protections

| Protection | Implementation |
|------------|----------------|
| 24-hour cancellation window | `isWithinCancellationWindow()` in `approvals.ts` |
| CSP headers | `next.config.mjs` — restricts scripts, frames, connect-src to Hedera/wallet domains |
| Input validation | All API routes use Zod schemas (`src/lib/utils/validators.ts`) |
| API key isolation | All keys server-side only; never exposed to client via `NEXT_PUBLIC_` prefix |
| No key storage | Operator keys only in `.env.local`; user keys only in HashPack extension |

---

## Quick Start (Developers)

### Prerequisites

- Node.js 18+
- npm
- **At minimum**: `GEMINI_API_KEY` (free) + `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (free)
- **Agent chat** (`/agent`): uses `OPENAI_API_KEY` when set, otherwise `GEMINI_API_KEY` (auto fallback on quota errors)

### Install & Run

```bash
git clone <repo-url>
cd Dora-AI
npm install
cp .env.example .env.local
# Edit .env.local — set GEMINI_API_KEY and NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Clean Restart (fixes stale cache)

```bash
npm run dev:clean
```

---

## Environment Variables

### Required (minimum viable app)

| Variable | Purpose | Get It From |
|----------|---------|-------------|
| `GEMINI_API_KEY` | AI vision + embeddings + agent chat fallback (free, 1,500 req/day) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | HashPack/HashConnect pairing | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_HEDERA_NETWORK` | `testnet` or `mainnet` | — |
| `NEXT_PUBLIC_APP_URL` | App URL for wallet metadata | `http://localhost:3000` |

### Hedera (blockchain features)

| Variable | Purpose | Get It From |
|----------|---------|-------------|
| `HEDERA_NETWORK` | Server-side network | — |
| `DORA_OPERATOR_ID` | Operator account (HCS fees, contracts) | [portal.hedera.com](https://portal.hedera.com) |
| `DORA_OPERATOR_KEY` | Operator private key (ECDSA or ED25519) | Hedera Portal |
| `DORA_TREASURY_ID` | Account receiving payments | Hedera Portal |
| `HCS_SEARCH_LOG_TOPIC` | HCS topic for search events | Created via SDK or portal |
| `HCS_PRICE_LOG_TOPIC` | HCS topic for price updates | Created via SDK or portal |
| `HCS_PURCHASE_LOG_TOPIC` | HCS topic for purchases | Created via SDK or portal |

### Optional (enhanced features)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Agent chat primary LLM (`gpt-4o-mini` tool calling); GPT-4V vision fallback |
| `AGENT_LLM` | `auto` (default), `openai`, or `gemini` — force agent chat provider |
| `HUGGINGFACE_API_KEY` | Higher rate limits for open-source BLIP model |
| `PINECONE_API_KEY` | Live vector product search |
| `PINECONE_INDEX` | Pinecone index name (`dora-products`, 1536 dims) |
| `PINATA_JWT` | IPFS image storage |
| `GOOGLE_VISION_API_KEY` | Additional vision fallback |
| `META_APP_TOKEN` | Instagram oEmbed for link extraction |

---

## API Reference

All API routes are in `src/app/api/`. Every endpoint returns:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  requestId: string;
}
```

### Agent

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/agent/chat` | LLM chat with Hedera Agent Kit tools | `OPENAI_API_KEY` and/or `GEMINI_API_KEY` |
| `POST` | `/api/agent/unlock-search` | Build 0.1 ℏ unlock transaction bytes | Hedera testnet + `DORA_TREASURY_ID` |

**`POST /api/agent/chat`**
```json
// Request
{
  "messages": [{ "role": "user", "content": "What's my HBAR balance?" }],
  "accountId": "0.0.12345",
  "country": "IN",
  "searchUnlocked": true,
  "mandates": []
}

// Response (200)
{
  "success": true,
  "text": "Your balance is ...",
  "toolResults": [],
  "pendingTransaction": null
}
```

When a tool returns unsigned transaction bytes (`unlock_search_access`, `build_checkout_tx`), the response includes `pendingTransaction` with `bytesBase64` for HashPack signing.

### Vision

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `POST` | `/api/vision/analyze` | Analyze product image (Gemini/GPT/BLIP) | Gemini or OpenAI key |
| `POST` | `/api/vision/search` | Vector search Pinecone + enrich with prices | Pinecone key (optional) |

**`POST /api/vision/analyze`**
```json
// Request
{ "imageBase64": "<base64-encoded-image>" }

// Response (200)
{
  "success": true,
  "data": {
    "labels": [{ "description": "sneakers", "score": 0.95, "topicality": 1 }],
    "gpt4vDescription": "Detailed 3-sentence product description...",
    "detectedBrand": "Nike",
    "detectedCategory": "shoes",
    "detectedAttributes": { "color": "White/Red", "material": "Leather" },
    "confidence": 0.92,
    "embedding": [0.12, -0.34, ...],  // 1536-dim vector
    "modelUsed": "gemini-1.5-flash"
  }
}
```

### Checkout

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/checkout/initiate` | Build `TransferTransaction` (full payment) |
| `POST` | `/api/checkout/payin3` | Build `ScheduleCreateTransaction` (3 installments) |
| `POST` | `/api/checkout/groupbuy` | Deploy `EscrowContract` + create group buy |

### Hedera

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/hedera/hcs-log` | Submit event to HCS topic |
| `GET` | `/api/hedera/verify?txId=...` | Query mirror node for transaction status |

### Prices

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/prices/compare` | Fetch prices across retailers for a product |

### IPFS

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/ipfs/signed-url` | Generate Pinata signed upload URL |

---

## Hedera Agent Kit

Dora uses **[Hedera Agent Kit v4](https://github.com/hashgraph/hedera-agent-kit)** with the AI SDK adapter for tool-calling chat.

### Plugins

| Plugin | Tools |
|--------|-------|
| `coreAccountQueryPlugin` | HBAR balance, account info |
| `coreConsensusPlugin` | HCS topic queries |
| `dora-commerce` (custom) | `analyze_product_image`, `search_products`, `compare_prices`, `unlock_search_access`, `create_mandate_payload`, `verify_mandate`, `build_checkout_tx`, `build_payin3_schedule` |

### Agent Mode

All payment tools use **`AgentMode.RETURN_BYTES`** — the server builds unsigned transaction bytes; the user signs in HashPack (human-in-the-loop).

### LLM Providers

| Provider | Model | When Used |
|----------|-------|-----------|
| OpenAI | `gpt-4o-mini` | Primary when `OPENAI_API_KEY` is set |
| Google Gemini | `gemini-2.5-flash-lite` → `gemini-2.0-flash` | Fallback on quota/auth errors, or when `AGENT_LLM=gemini` |

Set `AGENT_LLM=auto` (default), `openai`, or `gemini` in `.env.local`.

Vision (photos/links in chat) always uses **`POST /api/vision/analyze`** (Gemini) — independent of agent chat LLM.

### Commerce Standards Mapping

| Standard | Implementation |
|----------|----------------|
| UCP | Regional product search, price comparison |
| AP2 | Spending mandates before checkout |
| ACP | Full HBAR `TransferTransaction` |
| MPP | Pay-in-3 `ScheduleCreateTransaction` |

---

## Hedera Integration (Deep Dive)

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DORA AI HEDERA LAYER                       │
├──────────┬──────────────────────┬────────────────────────────────┤
│ Protocol │ Hedera Feature       │ Code Path                       │
├──────────┼──────────────────────┼────────────────────────────────┤
│ AP2      │ Account signatures   │ lib/hedera/mandates.ts          │
│          │ (crypto mandates)    │ lib/security/approvals.ts       │
│          │                      │ components/shared/ApprovalGate  │
├──────────┼──────────────────────┼────────────────────────────────┤
│ UCP      │ Mirror Node queries  │ lib/ai/catalog.ts              │
│          │ + Pinecone metadata  │ lib/ai/search.ts               │
│          │ + Regional retailers │ lib/commerce/market.ts          │
├──────────┼──────────────────────┼────────────────────────────────┤
│ ACP      │ TransferTransaction  │ lib/hedera/payments.ts          │
│          │                      │ api/checkout/initiate/route.ts  │
├──────────┼──────────────────────┼────────────────────────────────┤
│ MPP      │ ScheduleCreateTx     │ lib/hedera/payments.ts          │
│          │ (3 installments)     │ api/checkout/payin3/route.ts    │
├──────────┼──────────────────────┼────────────────────────────────┤
│ HCS      │ TopicCreate +        │ lib/hedera/hcs.ts              │
│          │ TopicMessageSubmit   │ api/hedera/hcs-log/route.ts    │
│          │ + Mirror Node REST   │                                │
├──────────┼──────────────────────┼────────────────────────────────┤
│ Escrow   │ ContractCreateFlow   │ contracts/EscrowContract.sol    │
│          │ + ContractExecuteTx  │ lib/hedera/contracts.ts         │
│          │ + ContractCallQuery  │ api/checkout/groupbuy/route.ts  │
└──────────┴──────────────────────┴────────────────────────────────┘
```

### HCS Topic Design

Dora AI uses **3 persistent HCS topics** for immutable event logging:

| Topic | Purpose | Event Types Logged |
|-------|---------|-------------------|
| `SEARCH_LOG` | Every visual search | `search`, image CID, query, results count, confidence |
| `PRICE_LOG` | Price updates per retailer | `price_update`, product ID, retailer, price in HBAR + local |
| `PURCHASE_LOG` | All transactions | `purchase`, `payin3_installment`, `groupbuy_contribution`, `cancellation`, `refund` |

Each message includes: `eventType`, `payload`, `timestamp`, `accountId`.

### Mirror Node Integration

The app queries Hedera mirror nodes (REST API) for:
- **Account balances**: `GET /api/v1/accounts/{accountId}`
- **Transaction status**: `GET /api/v1/transactions/{txId}`
- **HCS messages**: `GET /api/v1/topics/{topicId}/messages`

Implementation: `src/lib/hedera/client.ts` — `getMirrorNodeUrl()`

### Key Management

| Tier | Key | Location | Access |
|------|-----|----------|--------|
| Operator | `DORA_OPERATOR_KEY` | `.env.local` only | Server-side API routes only |
| Treasury | `DORA_TREASURY_ID` | `.env.local` only | Receives payments |
| User | HashPack-managed | Browser extension | Never exposed to Dora code |
| API Keys | OpenAI, Gemini, etc. | `.env.local` only | Server-side only |

**Forbidden**: Storing user private keys, deriving keys from passwords, Ethereum-style mnemonics.

---

## Smart Contract Design

### EscrowContract.sol

Location: `contracts/EscrowContract.sol`

**Purpose**: Group Buy escrow — participants contribute equal shares. When fully funded, funds auto-release to merchant. If expired, anyone can trigger refunds.

**Contract API**:

```solidity
constructor(address merchant, uint256 totalAmount, uint256 participantCount, uint256 durationDays)

// Core functions
contribute()     // Pay exactly perPersonAmount. Reverts if wrong amount, already contributed, or expired.
execute()        // Creator-triggered manual execution (only if fully funded).
refund()         // Anyone triggers after expiry. Returns all contributions to participants.

// View
getStatus()      // Returns (total, current, contributorCount, fullyFunded, executed, refunded, expiresAt)
```

**Deployment**: `src/lib/hedera/contracts.ts` — `deployEscrowContract()`

**Interaction**:
- `contributeToEscrow()`: `ContractExecuteTransaction` with payable amount
- `getEscrowStatus()`: `ContractCallQuery` — read-only
- `triggerRefund()`: `ContractExecuteTransaction` — calls `refund()`

**Events**: `ContributionReceived`, `FundsReleased`, `RefundIssued`, `GroupBuyCancelled`

**Safety**: `receive()` reverts plain transfers — users must call `contribute()`.

---

## AI Pipeline Architecture

### Model Escalation Sequence

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ Gemini Flash │────▶│ Gemini Pro   │────▶│ GPT-4o       │────▶│ BLIP     │
│ (free, fast) │     │ (free, best) │     │ (paid, best) │     │ (free)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┘
       │                     │                    │                  │
       ▼                     ▼                    ▼                  ▼
  Returns result      Returns result       Returns result      Basic caption
```

### Multi-Pass Analysis

1. **Image Classification** — What type of image is this? (product photo, outfit, screenshot, etc.)
2. **Product Identification** — What product is shown? (name, brand, category, color, material, style)
3. **OCR Extraction** (optional) — Are there visible text/brands/SKUs in the image?
4. **Re-identification** (if OCR found text) — Improve identification using extracted text hints
5. **Verification** (if confidence < 70%) — Self-check: does this identification actually match the image?

### Embedding Pipeline

```
Gemini text-embedding-004 (768-dim, free) → OpenAI text-embedding-3-small (1536-dim, paid) → Zero vector (mock)
```

Dimension mismatch handled: Gemini 768-dim outputs are zero-padded to 1536-dim for Pinecone compatibility.

### Preprocessing

File: `src/lib/ai/preprocess.ts`

- Resize to max 1024px (preserves aspect ratio)
- Sharpen with `sharp` library
- Convert to JPEG base64
- Validate format and size

---

## State Management

7 React Contexts, all using `useReducer` with typed actions:

| Context | Purpose | Persists To |
|---------|---------|-------------|
| **UIContext** | Theme, modals, toasts, loading | — |
| **WalletContext** | HashPack/Blade connection, balance | localStorage (mandates) |
| **SpendingLimitContext** | Daily/per-tx caps, spent tracking | localStorage |
| **CartContext** | Multi-merchant cart, payment method, fees | localStorage |
| **SearchContext** | Search state machine (idle → capturing → analyzing → verify → results) | — |
| **CheckoutContext** | Checkout state machine (review → approval → signing → complete) | — |
| **MarketContext** | Country, currency, retailer catalog, exchange rate | localStorage |
| **GroupBuyContext** | Active group buys, participants, funding | — |

**Provider nesting order**: `UIContext → Market → Wallet → SpendingLimit → Cart → Search → Checkout → GroupBuy`

**File**: `src/components/Providers.tsx`

---

## Data Flow Diagrams

### Chat Shopping Flow (`/agent`)

```
User at /agent
    │
    ├── Photo / link uploaded
    │     POST /api/vision/analyze
    │     → Analysis card in chat
    │     POST /api/vision/search (if unlocked)
    │     → Listing cards in chat
    │
    ├── Text message
    │     POST /api/agent/chat
    │     → Agent Kit tools (balance, search, checkout bytes)
    │
    ├── Unlock search (0.1 ℏ)
    │     POST /api/agent/unlock-search → ApprovalGate → HashPack
    │
    └── Pay with HBAR on listing
          POST /api/checkout/initiate → ApprovalGate → HashPack
```

### Visual Search Flow (classic pages)

```
User uploads photo at /scan
    │
    ▼
preprocessBase64() — sharpen, resize, validate
    │
    ▼
POST /api/vision/analyze { imageBase64 }
    │
    ├── classifyImage() — "social_media_screenshot", itemCount=1
    ├── identifyProduct() — "Nike Air Max 90 Infrared", brand=Nike, confidence=92%
    ├── extractOCR() — any visible text in image
    └── verifyIdentification() — self-check (if confidence < 70%)
    │
    ▼
generateSearchEmbedding() — text → vector (Gemini free / OpenAI paid)
    │
    ▼
POST /api/vision/search { embedding, analysis }
    │
    ├── searchSimilarProducts() — Pinecone query (topK=20)
    └── enrichWithPrices() — add retailer prices for user's region
    │
    ▼
Results displayed at /results with HBAR prices
```

### Checkout Flow (Full Payment)

```
User at /checkout with cart items
    │
    ▼
validateSpending() — check per-tx limit, daily limit
    │
    ▼
ApprovalGate opens — 2s delay, anti-clickjacking offset
    │
    ▼
User taps "✓ Approve & Pay"
    │
    ▼
POST /api/checkout/initiate { items, accountId, paymentMethod }
    │
    ▼
buildPaymentTransaction() — TransferTransaction bytes
    │
    ▼
HashPack signs transaction — user confirms in extension
    │
    ▼
Transaction submitted to Hedera
    │
    ▼
Mirror node confirms — GET /api/hedera/verify?txId=...
    │
    ▼
POST /api/hedera/hcs-log — log to PURCHASE_LOG topic
    │
    ▼
Redirect to /orders/[txId] — success animation
```

---

## Project Structure

```
Dora-AI/
├── contracts/
│   └── EscrowContract.sol         # GroupBuy escrow (Solidity)
├── public/
│   ├── icons/                     # App icons
│   └── manifest.json
├── scripts/
│   └── smoke-test.sh              # Automated smoke tests
├── src/
│   ├── app/                       # Next.js 14 App Router
│   │   ├── layout.tsx             # Root layout + Providers
│   │   ├── page.tsx               # Landing page
│   │   ├── globals.css            # Glassmorphism + design system
│   │   ├── (auth)/                # Unauthenticated routes
│   │   │   ├── connect/           # Wallet connection
│   │   │   └── onboarding/        # 3-step tutorial
│   │   ├── (app)/                 # Main app (with nav)
│   │   │   ├── agent/             # ★ Chat-first commerce agent
│   │   │   ├── home/              # Dashboard with quick actions
│   │   │   ├── scan/              # Image upload + link paste (classic)
│   │   │   ├── verify/            # AI result review
│   │   │   ├── results/           # Retailer listing + prices
│   │   │   ├── product/[id]/      # Product detail
│   │   │   ├── cart/              # Multi-merchant cart
│   │   │   ├── checkout/          # Payment + approval
│   │   │   ├── orders/            # Purchase history
│   │   │   │   └── [txId]/        # Order detail + tracking
│   │   │   ├── groupbuy/          # Group buy list
│   │   │   │   └── [groupId]/     # Group buy detail
│   │   │   ├── wallet/            # Wallet dashboard
│   │   │   └── settings/          # Region, limits, theme
│   │   └── api/                   # Serverless API routes
│   │       ├── agent/             # Chat + unlock-search
│   │       ├── vision/            # AI analysis + search
│   │       ├── checkout/          # Payment initiation
│   │       ├── prices/            # Retailer price fetching
│   │       ├── hedera/            # HCS logging + verification
│   │       └── ipfs/              # IPFS upload URLs
│   ├── components/
│   │   ├── agent/                 # AgentChat, ChatComposer, ChatProductResults, etc.
│   │   ├── ui/                    # Radix UI wrappers (Button, Dialog, Card, etc.)
│   │   ├── layout/                # TopBar, BottomNav
│   │   ├── wallet/                # WalletConnector, WalletStatus
│   │   ├── animations/            # ScanRing, MicroPulse, SlideIn, SuccessCheckmark
│   │   ├── shared/                # ApprovalGate, SpendingLimitGuard, ErrorFallback
│   │   └── Providers.tsx          # Context provider nesting
│   ├── contexts/                  # 8 React Contexts (see State Management)
│   ├── lib/
│   │   ├── agent/                 # Agent Kit config, toolkit, commerce plugin, LLM
│   │   ├── ai/                    # vision, embeddings, search, catalog, preprocess
│   │   ├── commerce/              # market (region/retailer/price logic)
│   │   ├── hedera/                # client, wallet, payments, hcs, contracts, mandates
│   │   ├── ipfs/                  # pinata upload helpers
│   │   ├── security/              # spending limits, approvals, key validation
│   │   ├── storage/               # localStorage wrappers (cart, settings, mandates, search-unlock)
│   │   └── utils/                 # cn, format, validators, constants
│   ├── hooks/                     # useWallet, useCart, useSearch, useMediaQuery, etc.
│   └── types/                     # TypeScript definitions (incl. agent-chat.ts)
├── .env.example                   # Environment variable template
├── next.config.mjs                # CSP headers, image domains, sharp config
├── tailwind.config.ts             # Hedera green theme, animations, glassmorphism
└── package.json
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 14 (App Router) | Server components, API routes, SSR |
| Language | TypeScript (strict) | Type safety across contexts and APIs |
| Styling | Tailwind CSS + CSS variables | Dark mode, glassmorphism, responsive |
| UI Primitives | Radix UI | Accessible dialog, slider, switch, tabs |
| Animation | Framer Motion + CSS keyframes | Scan ring, slide-in, shimmer |
| State | React Context + useReducer | No Redux — lightweight, typed, auditable |
| AI Vision | Google Gemini 2.5 Flash Lite / 2.0 Flash | Free tier, vision + embeddings |
| AI Vision (fallback) | OpenAI GPT-4o | Paid, best-in-class detail |
| AI Vision (last resort) | Hugging Face BLIP | Open-source, no key needed |
| Agent Chat LLM | OpenAI gpt-4o-mini + Gemini (fallback) | Tool-calling via Vercel AI SDK |
| Agent Framework | Hedera Agent Kit v4 + `@hashgraph/hedera-agent-kit-ai-sdk` | Balance, HCS, commerce tools |
| Embeddings | Gemini embedding-001 / OpenAI text-embedding-3-small | Free → paid fallback |
| Vector DB | Pinecone | 1536-dim cosine similarity search |
| Blockchain | Hedera SDK (`@hashgraph/sdk`, `@hiero-ledger/sdk`) | Native Hedera transactions |
| Wallet | HashPack + HashConnect (WalletConnect v2) | Hedera's standard wallet protocol |
| Storage | Pinata (IPFS) + localStorage | Decentralized image storage + local persistence |
| Validation | Zod | Request/response schema validation on all API routes |
| Image Processing | sharp | Resize, sharpen, convert for AI ingestion |

---

## Running & Testing

```bash
# Development
npm run dev              # Start on http://localhost:3000
npm run dev:clean        # Clear .next cache and start fresh

# Production
npm run build            # Create optimized production build
npm start                # Start production server

# Code quality
npm run lint             # ESLint check

# Smoke tests
npm run dev:clean -- -p 3002    # Start on port 3002 (terminal 1)
npm run smoke                    # Run smoke tests against port 3002 (terminal 2)
```

### Smoke Test Coverage

The smoke test script (`scripts/smoke-test.sh`) verifies:
- 200 OK on key pages: `/agent`, `/scan`, `/verify`, `/connect`, `/cart`, `/home`, `/wallet`
- CSS bundle serves correctly
- Vision API returns confidence > 35% on sample product image
- Search API returns regional retailer listings
- Agent chat API responds (skips gracefully if no LLM key configured)
- No 404s or 500s on critical paths

> Run only **one** `npm run dev` instance at a time. Multiple dev servers sharing `.next/cache` can cause webpack cache warnings.

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# GEMINI_API_KEY, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, etc.
```

### Environment Variables Reminder

All variables from `.env.example` must be set in the deployment environment. Never commit `.env.local`.

### Pre-deployment Checklist

- [ ] `.env.local` excluded from git (confirmed in `.gitignore`)
- [ ] `NEXT_PUBLIC_HEDERA_NETWORK` set correctly (testnet/mainnet)
- [ ] All API routes tested with `npm run smoke`
- [ ] Smart contract compiled and verified on Hedera testnet
- [ ] HCS topics created and IDs configured
- [ ] CSP headers reviewed in `next.config.mjs`
- [ ] `npm run build` passes with zero errors

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Wallet won't connect | Missing `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Add to `.env.local`, restart server |
| "Wallet setup required" | HashPack extension not installed | Install from hashpack.app/download |
| AI confidence ~30% | No Gemini key; using BLIP fallback | Set `GEMINI_API_KEY` in `.env.local` |
| Agent chat error / quota | OpenAI or Gemini rate limit | Wait for reset, or set `AGENT_LLM=gemini` |
| Wrong currency | Region detection mismatch | Check Settings → Shopping Region |
| `/agent` or `/scan` 404 / 500 | Stale `.next` cache or multiple dev servers | Stop all `npm run dev`, run `npm run dev:clean` |
| Webpack cache ENOENT warning | Multiple dev servers writing same `.next/cache` | Kill extra processes; `rm -rf .next && npm run dev` |
| Retailer link opens search, not product | Live product URLs require retailer API integration | Expected — link opens store search for identified product |
| Pinecone returns 0 results | Index empty or not configured | Mock results supplement automatically using AI analysis |
| HBAR price seems off | Approximate exchange rate | Update `HBAR_USD_RATE` in `src/lib/utils/constants.ts` |
| Search locked in chat | 0.1 ℏ unlock not paid yet | Connect wallet → tap **Unlock store search** in chat |
| Pay button asks to authorize | No spending mandate on file | Tap **Authorize spending** in chat before checkout |

---

## Business Model

| Revenue Stream | Rate | Implemented |
|----------------|------|-------------|
| Transaction fee | 1% of purchase | ✅ In `src/lib/security/spending.ts` — `calculateFees()` |
| PayIn3 fee | 2% (additional) | ✅ Added to total when `paymentMethod === 'payin3'` |
| Affiliate commissions | 50% of retailer commission | ✅ Affiliate URLs generated for all retailer links |
| Premium subscription | $10/month | 🔜 Planned |

---

## License & Credits

- **AI**: Google Gemini, OpenAI GPT-4o / gpt-4o-mini, Hugging Face BLIP
- **Agent**: Hedera Agent Kit v4, Vercel AI SDK
- **Blockchain**: Hedera Hashgraph — testnet + mainnet
- **Wallet**: HashPack via HashConnect (WalletConnect v2 protocol)
- **Storage**: IPFS via Pinata
- **UI**: Radix UI, Tailwind CSS, Framer Motion

---

*Dora AI — See it. Snap it. Buy it with HBAR.*
