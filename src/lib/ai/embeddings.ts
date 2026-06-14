/**
 * Embeddings Pipeline — Smart Fallback
 *
 * Generates vector embeddings for Pinecone search.
 * Priority: Gemini (free) → OpenAI (paid) → Zero vector (mock results)
 *
 * Gemini text-embedding-004: 768-dim, free tier
 * OpenAI text-embedding-3-small: 1536-dim, paid
 *
 * NOTE: Pinecone index must match embedding dimensions.
 * If using Gemini (768-dim), recreate your Pinecone index with dimensions=768.
 * If using OpenAI (1536-dim), keep dimensions=1536.
 * The fallback handles dimension mismatch gracefully.
 */

import { AI } from "@/lib/utils/constants";

// ============================================
// Gemini Embeddings (Free — 1,500 req/day)
// ============================================

export async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  let lastError: Error | null = null;

  for (const model of AI.GEMINI_EMBEDDING_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: AI.PINECONE_DIMENSION,
          }),
        }
      );

      if (response.status === 404) {
        lastError = new Error(`Gemini embedding model ${model} not found`);
        continue;
      }

      if (response.status === 429 || response.status === 503) {
        lastError = new Error(`Gemini embedding ${response.status} on ${model}`);
        console.warn(`[Embeddings] ${model} rate limited, trying next...`);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini Embedding error: ${response.status} — ${err.slice(0, 200)}`);
      }

      const data = await response.json();
      const embedding = data.embedding?.values;

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Gemini returned empty embedding");
      }

      const targetDim = AI.PINECONE_DIMENSION;
      if (embedding.length < targetDim) {
        console.warn(
          `[Embeddings] Gemini (${model}) output ${embedding.length}-dim, padding to ${targetDim}-dim.`
        );
        console.log(`[Embeddings] ✓ Used Gemini ${model}`);
        return [...embedding, ...new Array(targetDim - embedding.length).fill(0)];
      }

      console.log(`[Embeddings] ✓ Used Gemini ${model}`);
      return embedding.slice(0, targetDim);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!lastError.message.includes("not found") && !lastError.message.includes("404")) {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("No Gemini embedding models available");
}

// ============================================
// OpenAI Embeddings (Paid — 1536-dim)
// ============================================

export async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || !apiKey.startsWith("sk-")) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Dynamic import — only load OpenAI SDK when actually needed
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });

  const response = await openai.embeddings.create({
    model: AI.EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

// ============================================
// Smart Embedding (with fallback)
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
  const searchText = [
    text,
    "shopping",
    "retail",
    "buy online",
    "best price",
  ].join(" ");

  // Tier 1: Gemini (free)
  if (process.env.GEMINI_API_KEY) {
    try {
      const embedding = await generateGeminiEmbedding(searchText);
      console.log("[Embeddings] ✓ Used Gemini embedding");
      return embedding;
    } catch (err) {
      console.warn("[Embeddings] Gemini failed, trying OpenAI:", (err as Error).message);
    }
  }

  // Tier 2: OpenAI (paid)
  if (process.env.OPENAI_API_KEY?.startsWith("sk-")) {
    try {
      const embedding = await generateOpenAIEmbedding(searchText);
      console.log("[Embeddings] ✓ Used OpenAI text-embedding-3-small");
      return embedding;
    } catch (err) {
      console.warn("[Embeddings] OpenAI also failed:", (err as Error).message);
    }
  }

  // Tier 3: Zero vector fallback — search will use mock results
  console.warn("[Embeddings] ⚠ No embeddings available — will use mock search results");
  return new Array(AI.PINECONE_DIMENSION).fill(0);
}

/**
 * Generate embedding specifically for product search.
 */
export async function generateSearchEmbedding(
  description: string,
  brand: string | null,
  category: string | null
): Promise<number[]> {
  const enrichedText = [
    category ? `Category: ${category}` : "",
    brand ? `Brand: ${brand}` : "",
    `Description: ${description}`,
    "Find this product online at Amazon, Nike, StockX",
    "Shopping, retail, buy, price comparison",
  ]
    .filter(Boolean)
    .join(". ");

  return generateEmbedding(enrichedText);
}
