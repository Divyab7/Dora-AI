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

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

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

/** Strip tracking params and normalize Instagram post/reel URLs */
export function normalizeInstagramUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  parsed.hash = "";
  let path = parsed.pathname.replace(/\/+$/, "");

  // /reels/ID → /reel/ID
  path = path.replace(/^\/reels\//, "/reel/");

  parsed.pathname = path;
  return parsed.toString();
}

export function parseInstagramShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i,
    /instagr\.am\/p\/([A-Za-z0-9_-]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1] && m[1] !== "embed") return m[1];
  }
  return null;
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
    sourceUrl: sourceType === "instagram" ? normalizeInstagramUrl(sourceUrl) : sourceUrl,
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
    // fall through
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
  const cleanUrl = normalizeInstagramUrl(url);
  const shortcode = parseInstagramShortcode(cleanUrl);
  let title: string | undefined;

  const imageCandidates: string[] = [];

  // Strategy 1: oEmbed (multiple endpoints)
  const oembedEndpoints = [
    `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}&maxwidth=640`,
    `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(cleanUrl)}&access_token=${process.env.META_APP_TOKEN ?? ""}`,
  ].filter((e) => !e.includes("access_token=&"));

  for (const endpoint of oembedEndpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, 8000, DESKTOP_UA);
      if (!res.ok) continue;
      const data = (await res.json()) as { thumbnail_url?: string; title?: string; author_name?: string };
      if (data.title) title = data.title;
      if (data.thumbnail_url) imageCandidates.push(data.thumbnail_url);
    } catch {
      // try next
    }
  }

  // Strategy 2: Embed pages (public, often expose og:image)
  if (shortcode) {
    const isReel = /\/reel\//i.test(cleanUrl);
    const embedPaths = isReel
      ? [`/reel/${shortcode}/embed/captioned/`, `/reel/${shortcode}/embed/`]
      : [`/p/${shortcode}/embed/captioned/`, `/p/${shortcode}/embed/`];

    for (const embedPath of embedPaths) {
      try {
        const embedUrl = `https://www.instagram.com${embedPath}`;
        const html = await fetchPageHtml(embedUrl, MOBILE_UA);
        imageCandidates.push(...extractAllImageUrls(html));
        if (!title) title = extractMetaTitle(html);
      } catch {
        // try next
      }
    }
  }

  // Strategy 3: Direct page scrape (desktop + mobile UA)
  for (const ua of [MOBILE_UA, DESKTOP_UA]) {
    try {
      const html = await fetchPageHtml(cleanUrl, ua);
      imageCandidates.push(...extractAllImageUrls(html));
      if (!title) title = extractMetaTitle(html);
    } catch {
      // try next
    }
  }

  // Strategy 4: Microlink preview (screenshot + og:image fallback)
  try {
    const micro = await fetchMicrolinkPreview(cleanUrl);
    if (micro.imageUrl) imageCandidates.push(micro.imageUrl);
    if (micro.title && !title) title = micro.title;
  } catch {
    // optional fallback
  }

  // Deduplicate and try downloading each candidate (prefer cdninstagram URLs)
  const unique = Array.from(new Set(imageCandidates)).sort(
    (a, b) => scoreImageUrl(b) - scoreImageUrl(a)
  );

  for (const imageUrl of unique) {
    const img = await downloadImage(imageUrl, DESKTOP_UA);
    if (img && img.buffer.length > 2000) {
      return { ...img, title };
    }
  }

  throw new Error(
    "Could not extract an image from this Instagram link. " +
      "Instagram often blocks automated access — try uploading a screenshot of the post instead."
  );
}

function scoreImageUrl(url: string): number {
  let score = 0;
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) score += 10;
  if (url.includes("scontent")) score += 8;
  if (/\.(jpg|jpeg|webp)/i.test(url)) score += 3;
  if (url.includes("thumbnail") || url.includes("display")) score += 2;
  if (url.startsWith("data:")) score -= 5;
  return score;
}

async function fetchMicrolinkPreview(
  url: string
): Promise<{ imageUrl?: string; title?: string }> {
  const apiUrl =
    `https://api.microlink.io/?url=${encodeURIComponent(url)}` +
    `&screenshot=true&meta=true&embed=image.url,screenshot.url,title`;

  const res = await fetchWithTimeout(apiUrl, 15000, DESKTOP_UA);
  if (!res.ok) throw new Error(`Microlink ${res.status}`);

  const json = (await res.json()) as {
    status: string;
    data?: {
      title?: string;
      image?: { url?: string };
      screenshot?: { url?: string };
    };
  };

  if (json.status !== "success" || !json.data) {
    throw new Error("Microlink returned no data");
  }

  const imageUrl = json.data.screenshot?.url ?? json.data.image?.url;
  return { imageUrl, title: json.data.title };
}

// ── TikTok ────────────────────────────────────────────────────────

async function extractTikTok(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  const imageCandidates: string[] = [];
  let title: string | undefined;

  try {
    const oembedRes = await fetchWithTimeout(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      8000
    );
    if (oembedRes.ok) {
      const data = (await oembedRes.json()) as { thumbnail_url?: string; title?: string };
      if (data.thumbnail_url) imageCandidates.push(data.thumbnail_url);
      title = data.title;
    }
  } catch {
    // continue
  }

  try {
    const html = await fetchPageHtml(url, MOBILE_UA);
    imageCandidates.push(...extractAllImageUrls(html));
    if (!title) title = extractMetaTitle(html);
  } catch {
    // continue
  }

  try {
    const micro = await fetchMicrolinkPreview(url);
    if (micro.imageUrl) imageCandidates.push(micro.imageUrl);
    if (micro.title && !title) title = micro.title;
  } catch {
    // continue
  }

  const unique = Array.from(new Set(imageCandidates));
  for (const imageUrl of unique) {
    const img = await downloadImage(imageUrl);
    if (img && img.buffer.length > 2000) return { ...img, title };
  }

  throw new Error(
    "Could not extract an image from this TikTok link. Try a screenshot upload instead."
  );
}

// ── Generic web ───────────────────────────────────────────────────

async function extractGenericWeb(url: string): Promise<{ buffer: Buffer; mimeType: string; title?: string }> {
  const html = await fetchPageHtml(url);
  const candidates = extractAllImageUrls(html);

  for (const imageUrl of candidates) {
    const img = await downloadImage(imageUrl);
    if (img) return { ...img, title: extractMetaTitle(html) };
  }

  throw new Error(
    "No preview image found on this page. Try a direct product image or screenshot upload."
  );
}

// ── Helpers ───────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  ms: number,
  userAgent = DESKTOP_UA
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPageHtml(url: string, userAgent = DESKTOP_UA): Promise<string> {
  const res = await fetchWithTimeout(url, 12000, userAgent);
  if (!res.ok) {
    throw new Error(`Could not fetch page (${res.status})`);
  }
  const html = await res.text();
  if (html.length < 100) {
    throw new Error("Page returned empty content");
  }
  return html;
}

async function downloadImage(
  url: string,
  userAgent = DESKTOP_UA
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (url.startsWith("data:")) {
    return parseDataUrl(url);
  }

  try {
    const res = await fetchWithTimeout(url, 15000, userAgent);
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

function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length < 1000) return null;
    return { buffer, mimeType: match[1] };
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

/** Collect image URLs from meta tags, JSON blobs, and CDN patterns */
function extractAllImageUrls(html: string): string[] {
  const urls: string[] = [];

  const meta = extractMetaImage(html);
  if (meta) urls.push(meta);

  // JSON fields commonly found in Instagram/TikTok pages
  const jsonPatterns = [
    /"display_url"\s*:\s*"([^"]+)"/g,
    /"thumbnail_src"\s*:\s*"([^"]+)"/g,
    /"thumbnail_url"\s*:\s*"([^"]+)"/g,
    /"og:image"\s*:\s*"([^"]+)"/g,
    /"url"\s*:\s*"(https:\\\/\\\/[^"]*cdninstagram[^"]+)"/g,
  ];

  for (const pattern of jsonPatterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(html)) !== null) {
      urls.push(decodeJsonEscapes(m[1]));
    }
  }

  // Direct CDN URLs in HTML
  const cdnPattern = /https:\\\/\\\/[^"\\]+cdninstagram\.com[^"\\]+\.(?:jpg|jpeg|webp|png)/gi;
  let cdn: RegExpExecArray | null;
  while ((cdn = cdnPattern.exec(html)) !== null) {
    urls.push(decodeJsonEscapes(cdn[0]));
  }

  const plainCdn = html.match(/https:\/\/[^\s"'<>]+cdninstagram\.com[^\s"'<>]+\.(?:jpg|jpeg|webp|png)/gi);
  if (plainCdn) urls.push(...plainCdn.map(decodeHtmlEntities));

  return urls.filter((u) => u.startsWith("http") || u.startsWith("data:image"));
}

function decodeJsonEscapes(s: string): string {
  return decodeHtmlEntities(s.replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
}

function extractMetaTitle(html: string): string | undefined {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1]);
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return title?.[1]?.trim();
}
