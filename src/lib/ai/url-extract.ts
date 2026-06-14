/**
 * Extract preview images from social / web URLs for vision analysis.
 *
 * Supports: YouTube (incl. Shorts), Instagram, TikTok, and generic pages (og:image).
 */

import { preprocessImageBuffer } from "./preprocess";

export type UrlSourceType = "youtube" | "instagram" | "tiktok" | "web";

export interface ExtractedUrlImage {
  base64: string;
  mimeType: string;
  dataUrl: string;
  sourceType: UrlSourceType;
  sourceUrl: string;
  title?: string;
  width?: number;
  height?: number;
}

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const SUPPORTED_HOSTS = [
  "youtube.com",
  "youtu.be",
  "instagram.com",
  "tiktok.com",
  "vm.tiktok.com",
];

export function isSupportedUrl(input: string): boolean {
  try {
    const url = normalizeUrl(input);
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      SUPPORTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ||
      url.startsWith("http")
    );
  } catch {
    return false;
  }
}

export function detectUrlSourceType(url: string): UrlSourceType {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.includes("youtube") || host === "youtu.be") return "youtube";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("tiktok")) return "tiktok";
  return "web";
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export async function extractImageFromUrl(input: string): Promise<ExtractedUrlImage> {
  const sourceUrl = normalizeUrl(input);

  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid URL. Please paste a full link starting with https://");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS links are supported");
  }

  const sourceType = detectUrlSourceType(sourceUrl);

  let raw: { buffer: Buffer; mimeType: string; title?: string };

  switch (sourceType) {
    case "youtube":
      raw = await extractYouTube(sourceUrl);
      break;
    case "instagram":
      raw = await extractInstagram(sourceUrl);
      break;
    case "tiktok":
      raw = await extractTikTok(sourceUrl);
      break;
    default:
      raw = await extractGenericWeb(sourceUrl);
  }

  const processed = await preprocessImageBuffer(raw.buffer, raw.mimeType);

  return {
    base64: processed.base64,
    mimeType: processed.mimeType,
    dataUrl: processed.dataUrl,
    sourceType,
    sourceUrl,
    title: raw.title,
    width: processed.width,
    height: processed.height,
  };
}

// ── YouTube / Shorts ──────────────────────────────────────────────

function parseYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function extractYouTube(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Could not parse YouTube video ID from this link");
  }

  let title: string | undefined;
  try {
    const oembedRes = await fetchWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      8000
    );
    if (oembedRes.ok) {
      const oembed = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };
      title = oembed.title;
      if (oembed.thumbnail_url) {
        const thumb = await downloadImage(oembed.thumbnail_url);
        if (thumb) return { ...thumb, title };
      }
    }
  } catch {
    // fall through to direct thumbnail URLs
  }

  const thumbUrls = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
  ];

  for (const thumbUrl of thumbUrls) {
    const result = await downloadImage(thumbUrl);
    if (result && result.buffer.length > 5000) {
      return { ...result, title };
    }
  }

  throw new Error("Could not fetch a thumbnail from this YouTube link");
}

// ── Instagram ─────────────────────────────────────────────────────

async function extractInstagram(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  // Try oEmbed first (works for many public posts/reels)
  try {
    const oembedRes = await fetchWithTimeout(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`,
      8000
    );
    if (oembedRes.ok) {
      const data = (await oembedRes.json()) as { thumbnail_url?: string; title?: string };
      if (data.thumbnail_url) {
        const img = await downloadImage(data.thumbnail_url);
        if (img) return { ...img, title: data.title };
      }
    }
  } catch {
    // continue to HTML scrape
  }

  const html = await fetchPageHtml(url);
  const imageUrl = extractMetaImage(html);
  if (!imageUrl) {
    throw new Error(
      "Could not extract an image from this Instagram link. Try a screenshot upload instead."
    );
  }

  const img = await downloadImage(imageUrl);
  if (!img) throw new Error("Failed to download Instagram preview image");
  return { ...img, title: extractMetaTitle(html) };
}

// ── TikTok ────────────────────────────────────────────────────────

async function extractTikTok(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  try {
    const oembedRes = await fetchWithTimeout(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      8000
    );
    if (oembedRes.ok) {
      const data = (await oembedRes.json()) as { thumbnail_url?: string; title?: string };
      if (data.thumbnail_url) {
        const img = await downloadImage(data.thumbnail_url);
        if (img) return { ...img, title: data.title };
      }
    }
  } catch {
    // continue
  }

  const html = await fetchPageHtml(url);
  const imageUrl = extractMetaImage(html);
  if (!imageUrl) {
    throw new Error(
      "Could not extract an image from this TikTok link. Try a screenshot upload instead."
    );
  }

  const img = await downloadImage(imageUrl);
  if (!img) throw new Error("Failed to download TikTok preview image");
  return { ...img, title: extractMetaTitle(html) };
}

// ── Generic web (Google Shopping, retailer pages, blogs) ──────────

async function extractGenericWeb(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  const html = await fetchPageHtml(url);
  const imageUrl = extractMetaImage(html);

  if (!imageUrl) {
    throw new Error(
      "No preview image found on this page. Try a direct product image or screenshot upload."
    );
  }

  const img = await downloadImage(imageUrl);
  if (!img) throw new Error("Failed to download image from page");

  return { ...img, title: extractMetaTitle(html) };
}

// ── Helpers ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageHtml(url: string): Promise<string> {
  const res = await fetchWithTimeout(url, 12000);
  if (!res.ok) {
    throw new Error(`Could not fetch page (${res.status}). The site may block automated access.`);
  }
  const html = await res.text();
  if (html.length < 100) {
    throw new Error("Page returned empty content");
  }
  return html;
}

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetchWithTimeout(url, 12000);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return null;

    return { buffer, mimeType: contentType.split(";")[0] };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractMetaImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return null;
}

function extractMetaTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1]);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return title?.[1]?.trim();
}
