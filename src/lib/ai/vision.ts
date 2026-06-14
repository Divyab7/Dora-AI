/**
 * AI Vision Pipeline — Production-Grade Product Identification
 *
 * Sprint 2: preprocessing, model escalation, OCR enrichment, verification pass.
 */

import type {
  VisionAnalysisResult,
  VisionLabel,
  ImageClassifierMeta,
  AnalysisStatus,
  UrlSourceType,
} from "@/types/search";
import type { ProductCategory, ProductAttributes } from "@/types/product";
import { AI } from "@/lib/utils/constants";
import { preprocessBase64 } from "./preprocess";

// ============================================
// Prompts
// ============================================

const IMAGE_CLASSIFIER_PROMPT = `Analyze this image and classify what type of content it is.
Return ONLY a JSON object (no markdown, no explanation):
{
  "imageType": "product_photo" | "outfit_photo" | "social_media_screenshot" | "advertisement" | "store_listing" | "runway" | "catalog" | "other",
  "itemCount": number (how many distinct shoppable items visible),
  "mainFocus": "describe what the MAIN item in the image is — the thing someone would want to buy",
  "hasBrandLogo": true | false,
  "hasText": true | false,
  "hasMultipleItems": true | false,
  "imageQuality": "high" | "medium" | "low"
}`;

const PRODUCT_IDENTIFIER_PROMPT = `You are a luxury personal shopper and product identification expert with 20 years of experience. Your job is to look at ANY image and identify exactly what product is shown so a customer can find and buy it.

CRITICAL INSTRUCTIONS:
- This might be a social media screenshot, fashion photo, catalog image, street style pic, store listing, or product photo
- If it shows a PERSON wearing items, identify the MOST PROMINENT / CENTER fashion item (not the person)
- If it shows multiple items, pick the MAIN one in focus
- Look for brand logos, distinctive design elements, patterns, textures
- Be SPECIFIC — "Nike Air Max 90 'Infrared' (2020 Retro)" is better than "Nike sneakers"
- If you can't see the brand, describe the STYLE well enough to find similar items
- Colors matter — specify "Off-White/Cream" not just "White"

Return ONLY valid JSON (no markdown, no code fences, no explanation):
{
  "productName": "specific product name with model/variant if known",
  "brand": "detected or inferred brand, or null",
  "category": "clothing" | "shoes" | "accessories" | "electronics" | "home" | "beauty",
  "subCategory": "e.g., sneakers, hoodie, handbag, watch, headphones, sofa",
  "color": "primary color(s) with shade details",
  "material": "apparent material(s)",
  "designEra": "e.g., contemporary, vintage 90s, y2k, 2010s minimalist",
  "style": "style keywords for search (e.g., streetwear, gorpcore, quiet luxury, techwear)",
  "gender": "men" | "women" | "unisex" | "kids" | null,
  "description": "Write 3 detailed sentences describing this item for a SHOPPING SEARCH ENGINE. Include: what it is, key visual features, color, material, shape, any distinctive details, brand if visible, what occasion/style it suits. Make it searchable — someone should be able to find this exact item using your description.",
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "estimatedPriceRange": "budget" | "mid-range" | "premium" | "luxury",
  "confidence": 0-100 (how confident are you in this identification?)
}`;

const OCR_PROMPT = `Extract ALL visible text from this image relevant to shopping: brand names, product names, model numbers, SKUs, prices, hashtags, store names.
Return ONLY JSON:
{
  "extractedText": "all text combined",
  "brands": ["brand1"],
  "productHints": ["hint1", "hint2"]
}`;

function reidentifyWithOcrPrompt(ocrText: string, brands: string[], hints: string[]): string {
  return `${PRODUCT_IDENTIFIER_PROMPT}

ADDITIONAL CONTEXT from text visible in the image:
- Extracted text: ${ocrText}
- Detected brands: ${brands.join(", ") || "none"}
- Product hints: ${hints.join(", ") || "none"}

Use this text to improve your identification accuracy.`;
}

function verifyPrompt(productName: string, brand: string | null): string {
  return `You previously identified this image as: "${productName}"${brand ? ` by ${brand}` : ""}.
Look at the image again carefully. Does this identification match what's shown?
Return ONLY JSON:
{
  "matches": true | false,
  "confidence": 0-100,
  "correction": "corrected product name if wrong, or null",
  "reason": "brief explanation"
}`;
}

// ============================================
// Types
// ============================================

interface ProductIdentification {
  productName: string;
  brand: string | null;
  category: ProductCategory | null;
  subCategory: string;
  color: string | null;
  material: string | null;
  designEra: string;
  style: string | null;
  gender: "men" | "women" | "unisex" | "kids" | null;
  description: string;
  searchKeywords: string[];
  estimatedPriceRange: string;
  confidence: number;
}

interface PipelineResult {
  productName: string;
  brand: string | null;
  category: ProductCategory | null;
  color: string | null;
  material: string | null;
  style: string | null;
  gender: "men" | "women" | "unisex" | "kids" | null;
  description: string;
  searchKeywords: string[];
  confidence: number;
  modelUsed: string;
  imageType: string;
  imageQuality: ImageClassifierMeta["imageQuality"];
  analysisStatus: AnalysisStatus;
  retrySuggestions: string[];
  attempts: string[];
}

export interface AnalyzeImageOptions {
  mimeType?: string;
  sourceUrl?: string;
  sourceType?: UrlSourceType | "upload";
  skipPreprocess?: boolean;
}

// ============================================
// Gemini API
// ============================================

async function callGeminiAPI(
  prompt: string,
  imageBase64: string,
  mimeType = "image/jpeg",
  temperature = 0.3
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: 700,
          topP: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response — image may be unprocessable");
  }

  return text;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJSON(text: string): Record<string, any> {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`No JSON found in response: "${text.slice(0, 150)}..."`);
  }

  return JSON.parse(match[0]);
}

function clampConfidence(value: number | undefined, fallback: number): number {
  return Math.min(100, Math.max(0, value ?? fallback));
}

function identificationToPipeline(
  id: ProductIdentification,
  modelUsed: string,
  imageType: string,
  imageQuality: ImageClassifierMeta["imageQuality"],
  attempts: string[]
): PipelineResult {
  return {
    productName: id.productName,
    brand: id.brand,
    category: id.category,
    color: id.color,
    material: id.material,
    style: id.style,
    gender: id.gender,
    description: id.description,
    searchKeywords: id.searchKeywords ?? [],
    confidence: clampConfidence(id.confidence, 70),
    modelUsed,
    imageType,
    imageQuality,
    analysisStatus: "success",
    retrySuggestions: [],
    attempts,
  };
}

function buildRetrySuggestions(meta: Partial<ImageClassifierMeta>): string[] {
  const tips: string[] = [];
  if (meta.imageQuality === "low") {
    tips.push("Use better lighting and avoid blur");
  }
  if (meta.hasMultipleItems) {
    tips.push("Crop to a single item you want to find");
  }
  if (meta.imageType === "outfit_photo") {
    tips.push("Try zooming in on the specific item (shoes, bag, jacket)");
  }
  if (meta.hasText === false && meta.imageQuality !== "high") {
    tips.push("A screenshot from the retailer page often works better");
  }
  if (tips.length === 0) {
    tips.push("Upload a closer, well-lit photo of the product");
  }
  return tips;
}

function finalizeStatus(result: PipelineResult, meta: Partial<ImageClassifierMeta>): PipelineResult {
  const confidence01 = result.confidence / 100;
  const retrySuggestions = buildRetrySuggestions(meta);

  let analysisStatus: AnalysisStatus = "success";
  if (confidence01 < AI.MIN_VISION_CONFIDENCE) {
    analysisStatus = "low_confidence";
  }

  return {
    ...result,
    analysisStatus,
    retrySuggestions: analysisStatus === "low_confidence" ? retrySuggestions : [],
  };
}

// ============================================
// Gemini Analysis
// ============================================

async function classifyImage(
  imageBase64: string,
  mimeType: string
): Promise<ImageClassifierMeta> {
  const defaults: ImageClassifierMeta = {
    imageType: "product_photo",
    itemCount: 1,
    mainFocus: "",
    hasBrandLogo: false,
    hasText: false,
    hasMultipleItems: false,
    imageQuality: "medium",
  };

  try {
    const classifyText = await callGeminiAPI(IMAGE_CLASSIFIER_PROMPT, imageBase64, mimeType, 0.1);
    const r = extractJSON(classifyText);
    return {
      imageType: r.imageType ?? defaults.imageType,
      itemCount: r.itemCount ?? 1,
      mainFocus: r.mainFocus ?? "",
      hasBrandLogo: Boolean(r.hasBrandLogo),
      hasText: Boolean(r.hasText),
      hasMultipleItems: Boolean(r.hasMultipleItems),
      imageQuality: r.imageQuality ?? "medium",
    };
  } catch (err) {
    console.warn("[Gemini] Classification skipped:", (err as Error).message);
    return defaults;
  }
}

export async function analyzeWithGemini(
  imageBase64: string,
  mimeType = "image/jpeg",
  customPrompt?: string
): Promise<{
  identification: ProductIdentification;
  imageType: string;
  imageQuality: ImageClassifierMeta["imageQuality"];
  modelUsed: string;
  classifier: ImageClassifierMeta;
}> {
  console.log("[Gemini] Starting analysis...");

  const classifier = await classifyImage(imageBase64, mimeType);

  const identifyText = await callGeminiAPI(
    customPrompt ?? PRODUCT_IDENTIFIER_PROMPT,
    imageBase64,
    mimeType,
    0.3
  );
  const identification = extractJSON(identifyText) as ProductIdentification;

  if (!identification.productName || !identification.description) {
    throw new Error(
      `Gemini response missing fields. Got: ${JSON.stringify(identification).slice(0, 200)}`
    );
  }

  identification.confidence = clampConfidence(identification.confidence, 70);

  console.log(
    `[Gemini] ✓ "${identification.productName}" (${identification.brand || "no brand"}) — ${identification.confidence}%`
  );

  return {
    identification,
    imageType: classifier.imageType,
    imageQuality: classifier.imageQuality,
    modelUsed: "gemini-1.5-flash",
    classifier,
  };
}

// ============================================
// GPT-4o
// ============================================

export async function analyzeWithGPT4O(
  imageBase64: string,
  mimeType = "image/jpeg",
  customPrompt?: string
): Promise<{
  identification: ProductIdentification;
  imageType: string;
  imageQuality: ImageClassifierMeta["imageQuality"];
  modelUsed: string;
}> {
  console.log("[GPT-4o] Starting analysis...");

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: customPrompt ?? PRODUCT_IDENTIFIER_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    max_tokens: 700,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-4o returned empty response");

  const identification = JSON.parse(content) as ProductIdentification;
  identification.confidence = clampConfidence(identification.confidence, 75);

  console.log(
    `[GPT-4o] ✓ "${identification.productName}" (${identification.brand || "no brand"}) — ${identification.confidence}%`
  );

  return {
    identification,
    imageType: "product_photo",
    imageQuality: "medium",
    modelUsed: "gpt-4o",
  };
}

// ============================================
// OCR + Verification (Gemini)
// ============================================

async function extractOcrFromImage(
  imageBase64: string,
  mimeType: string
): Promise<{ extractedText: string; brands: string[]; productHints: string[] } | null> {
  try {
    const text = await callGeminiAPI(OCR_PROMPT, imageBase64, mimeType, 0.1);
    const r = extractJSON(text);
    if (!r.extractedText && (!r.brands || r.brands.length === 0)) return null;
    return {
      extractedText: r.extractedText ?? "",
      brands: Array.isArray(r.brands) ? r.brands : [],
      productHints: Array.isArray(r.productHints) ? r.productHints : [],
    };
  } catch (err) {
    console.warn("[OCR] Skipped:", (err as Error).message);
    return null;
  }
}

async function verifyIdentification(
  imageBase64: string,
  mimeType: string,
  productName: string,
  brand: string | null
): Promise<{ confidence: number; correction: string | null } | null> {
  try {
    const text = await callGeminiAPI(
      verifyPrompt(productName, brand),
      imageBase64,
      mimeType,
      0.1
    );
    const r = extractJSON(text);
    return {
      confidence: clampConfidence(r.confidence, 50),
      correction: r.correction ?? null,
    };
  } catch {
    return null;
  }
}

// ============================================
// BLIP fallback
// ============================================

async function analyzeWithBLIP(imageBase64: string): Promise<VisionLabel[]> {
  const HF_API = "https://api-inference.huggingface.co/models";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.HUGGINGFACE_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.HUGGINGFACE_API_KEY}`;
  }

  try {
    const res = await fetch(`${HF_API}/Salesforce/blip-image-captioning-large`, {
      method: "POST",
      headers,
      body: JSON.stringify({ inputs: imageBase64 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const caption = Array.isArray(data) && data[0]?.generated_text ? data[0].generated_text : "";
    return caption ? [{ description: caption, score: 0.5, topicality: 0.5 }] : [];
  } catch {
    return [];
  }
}

// ============================================
// Smart Pipeline
// ============================================

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    promise
      .then((r) => {
        clearTimeout(timer);
        resolve(r);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function pickBetter(a: PipelineResult, b: PipelineResult): PipelineResult {
  if (b.confidence > a.confidence) return b;
  if (b.confidence === a.confidence && b.brand && !a.brand) return b;
  return a;
}

async function runPipeline(
  imageBase64: string,
  mimeType: string
): Promise<PipelineResult> {
  const attempts: string[] = [];
  let classifier: ImageClassifierMeta = {
    imageType: "product_photo",
    itemCount: 1,
    mainFocus: "",
    hasBrandLogo: false,
    hasText: false,
    hasMultipleItems: false,
    imageQuality: "medium",
  };

  let best: PipelineResult | null = null;

  // ── Tier 1: Gemini ──
  if (process.env.GEMINI_API_KEY) {
    try {
      attempts.push("gemini-1.5-flash");
      const gemini = await withTimeout(
        analyzeWithGemini(imageBase64, mimeType),
        20000,
        "Gemini"
      );
      classifier = gemini.classifier;
      best = identificationToPipeline(
        gemini.identification,
        gemini.modelUsed,
        gemini.imageType,
        gemini.imageQuality,
        [...attempts]
      );
    } catch (err) {
      console.error("[Pipeline] Gemini FAILED:", (err as Error).message);
    }
  }

  const needsEscalation =
    !best ||
    best.confidence < AI.VISION_ESCALATION_THRESHOLD ||
    !best.brand;

  // ── Tier 2: GPT-4o escalation ──
  if (needsEscalation && process.env.OPENAI_API_KEY?.startsWith("sk-")) {
    try {
      attempts.push("gpt-4o");
      const gpt = await withTimeout(analyzeWithGPT4O(imageBase64, mimeType), 28000, "GPT-4o");
      const gptResult = identificationToPipeline(
        gpt.identification,
        gpt.modelUsed,
        gpt.imageType,
        gpt.imageQuality,
        [...attempts]
      );
      best = best ? pickBetter(best, gptResult) : gptResult;
    } catch (err) {
      console.error("[Pipeline] GPT-4o FAILED:", (err as Error).message);
    }
  }

  // ── OCR re-identification when text is visible ──
  if (
    process.env.GEMINI_API_KEY &&
    classifier.hasText &&
    best &&
    best.confidence < 70
  ) {
    const ocr = await extractOcrFromImage(imageBase64, mimeType);
    if (ocr && (ocr.extractedText || ocr.brands.length > 0)) {
      try {
        attempts.push("gemini+ocr");
        const prompt = reidentifyWithOcrPrompt(ocr.extractedText, ocr.brands, ocr.productHints);
        const enriched = await withTimeout(
          analyzeWithGemini(imageBase64, mimeType, prompt),
          20000,
          "Gemini+OCR"
        );
        const ocrResult = identificationToPipeline(
          enriched.identification,
          "gemini-1.5-flash+ocr",
          enriched.imageType,
          enriched.imageQuality,
          [...attempts]
        );
        best = pickBetter(best, ocrResult);
      } catch (err) {
        console.warn("[Pipeline] OCR re-identify failed:", (err as Error).message);
      }
    }
  }

  // ── Verification pass for borderline confidence ──
  if (
    process.env.GEMINI_API_KEY &&
    best &&
    best.confidence >= 35 &&
    best.confidence < 65
  ) {
    const verified = await verifyIdentification(
      imageBase64,
      mimeType,
      best.productName,
      best.brand
    );
    if (verified) {
      attempts.push("verify-pass");
      if (verified.correction) {
        best.productName = verified.correction;
        best.description = `${verified.correction}. ${best.description}`;
      }
      best.confidence = Math.round((best.confidence + verified.confidence) / 2);
      best.attempts = [...attempts];
    }
  }

  // ── Tier 3: BLIP last resort ──
  if (!best || best.confidence < 35) {
    try {
      attempts.push("blip");
      console.log("[Pipeline] ⚠ Falling back to BLIP");
      const labels = await withTimeout(analyzeWithBLIP(imageBase64), 10000, "BLIP");
      const caption = labels[0]?.description || "fashion item";

      const blipResult: PipelineResult = {
        productName: caption,
        brand: null,
        category: "accessories",
        color: null,
        material: null,
        style: null,
        gender: null,
        description: `A product matching: ${caption}. Basic identification — upload a clearer photo for better results.`,
        searchKeywords: caption.split(" ").filter(Boolean),
        confidence: 30,
        modelUsed: "blip (basic fallback)",
        imageType: classifier.imageType,
        imageQuality: classifier.imageQuality,
        analysisStatus: "low_confidence",
        retrySuggestions: buildRetrySuggestions(classifier),
        attempts: [...attempts],
      };

      best = best ? pickBetter(best, blipResult) : blipResult;
    } catch (err) {
      console.error("[Pipeline] BLIP FAILED:", (err as Error).message);
    }
  }

  if (!best) {
    throw new Error(
      "No AI models available. Add GEMINI_API_KEY (free) or OPENAI_API_KEY to .env.local"
    );
  }

  best.attempts = attempts;
  return finalizeStatus(best, classifier);
}

// ============================================
// Main Export
// ============================================

export async function analyzeProductImage(
  imageBase64: string,
  options: AnalyzeImageOptions = {}
): Promise<VisionAnalysisResult & { modelUsed: string }> {
  let processedBase64 = imageBase64;
  let mimeType = options.mimeType ?? "image/jpeg";

  if (!options.skipPreprocess) {
    const processed = await preprocessBase64(imageBase64, mimeType);
    processedBase64 = processed.base64;
    mimeType = processed.mimeType;
  }

  const result = await runPipeline(processedBase64, mimeType);

  console.log(
    `\n[Vision] ======== ANALYSIS COMPLETE ========\n` +
      `  Product: ${result.productName}\n` +
      `  Brand:   ${result.brand || "unknown"}\n` +
      `  Confidence: ${result.confidence}%\n` +
      `  Status:  ${result.analysisStatus}\n` +
      `  Model:   ${result.modelUsed}\n` +
      `  Attempts: ${result.attempts.join(" → ")}\n` +
      `==========================================`
  );

  return {
    labels: result.searchKeywords.map((kw) => ({
      description: kw,
      score: result.confidence / 100,
      topicality: 1,
    })),
    gpt4vDescription: result.description,
    detectedBrand: result.brand,
    detectedCategory: result.category,
    detectedAttributes: {
      color: result.color ?? undefined,
      material: result.material ?? undefined,
      style: result.style ?? undefined,
      gender: result.gender ?? undefined,
    } as ProductAttributes,
    confidence: result.confidence / 100,
    embedding: [],
    modelUsed: result.modelUsed,
    identifiedProductName: result.productName,
    imageType: result.imageType,
    imageQuality: result.imageQuality,
    analysisStatus: result.analysisStatus,
    retrySuggestions: result.retrySuggestions,
    pipelineAttempts: result.attempts,
    sourceUrl: options.sourceUrl,
    sourceType: options.sourceType,
    imageDataUrl: options.skipPreprocess
      ? undefined
      : `data:${mimeType};base64,${processedBase64}`,
  };
}
