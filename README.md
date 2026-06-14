# Dora-AI

> See it. Snap it. Buy it with crypto — in 3 seconds.

AI-powered visual shopping assistant. Upload any image (outfit screenshot, product photo), AI identifies the item, finds the best prices across retailers, and enables instant purchase with HBAR — featuring split payments (PayIn3) and group buying.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your API keys in .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State | React Context (useReducer) |
| UI | Radix UI + Tailwind + Framer Motion |
| AI/ML | OpenAI GPT-4V, Google Vision API, Pinecone |
| Blockchain | Hedera SDK, Hedera Agent Kit |
| Wallet | HashPack, Blade Wallet |
| Storage | IPFS (Pinata) + LocalStorage |
| Deployment | Vercel |

## 🔗 Hedera Standards Implemented

- **AP2** — Cryptographic mandates before AI can initiate spend
- **UCP** — Cross-retailer product catalog queries via Pinecone + Mirror Node
- **ACP** — HBAR checkout with TransferTransaction
- **MPP** — PayIn3 installment payments via ScheduleCreateTransaction
- **HCS** — Immutable event logging (searches, prices, purchases)
- **Smart Contract** — Escrow contract for GroupBuy with auto-execute/refund

## 🎨 Design

- Dark mode by default, glassmorphism UI
- Hedera Green (#00FF9D) accent
- Mobile-first responsive (single column → 3-column grid)
- Micro-animations on all interactions

## 🔒 Safety

- Human-in-the-loop: every purchase requires explicit approval
- 5-layer enforcement: per-tx limit → daily limit → approval gate → AP2 mandate → wallet confirm
- 24-hour cancellation window
- No autonomous AI spending

## 📁 Project Structure

```
src/
├── app/            # Next.js App Router (pages + API routes)
├── components/     # Reusable UI components
├── contexts/       # React Context providers (7 total)
├── lib/            # Business logic (hedera, ai, ipfs, prices, security)
├── hooks/          # Custom React hooks
└── types/          # TypeScript type definitions

contracts/          # Hedera smart contracts (Solidity)
```

## 💰 Business Model

- 1% transaction fee
- 2% PayIn3 fee
- 50% of affiliate commissions
- Premium subscription $10/month

## 📋 Environment Variables

See `.env.example` for the full list. Required:

- `OPENAI_API_KEY` — for GPT-4V vision + embeddings
- `PINECONE_API_KEY` — for vector search
- `PINATA_JWT` — for IPFS storage
- `HEDERA_NETWORK`, `DORA_OPERATOR_ID`, `DORA_OPERATOR_KEY` — for blockchain ops

## 🤖 Generated with

[Claude Code](https://claude.com/claude-code)
