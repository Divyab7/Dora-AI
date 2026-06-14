/**
 * Server-side image preprocessing before vision analysis.
 * Uses sharp when available; falls back to raw buffer if sharp fails to load.
 */

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 85;

export interface PreprocessedImage {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  dataUrl: string;
  width: number;
  height: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharpInstance = any;

type SharpFn = (
  input: Buffer,
  options?: { failOn?: "none" | "truncated" | "error" | "warning" }
) => SharpInstance;

let sharpModule: SharpFn | null | undefined;

async function loadSharp(): Promise<SharpFn | null> {
  if (sharpModule !== undefined) return sharpModule;
  try {
    const mod = await import("sharp");
    sharpModule = mod.default as SharpFn;
    return sharpModule;
  } catch (err) {
    console.warn("[Preprocess] sharp unavailable, using raw image:", (err as Error).message);
    sharpModule = null;
    return null;
  }
}

function rawFallback(input: Buffer, sourceMime?: string): PreprocessedImage {
  const mime = sourceMime?.startsWith("image/")
    ? (sourceMime as PreprocessedImage["mimeType"])
    : "image/jpeg";
  const base64 = input.toString("base64");
  return {
    base64,
    mimeType: mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg",
    dataUrl: `data:${mime};base64,${base64}`,
    width: 0,
    height: 0,
  };
}

export async function preprocessImageBuffer(
  input: Buffer,
  sourceMime?: string
): Promise<PreprocessedImage> {
  const sharp = await loadSharp();
  if (!sharp) return rawFallback(input, sourceMime);

  try {
    let pipeline = sharp(input, { failOn: "none" }).rotate();

    if (sourceMime?.includes("png")) {
      try {
        const meta = await sharp(input).metadata();
        if (meta.hasAlpha) {
          pipeline = pipeline.flatten({ background: { r: 10, g: 10, b: 15 } });
        }
      } catch {
        // continue without alpha flatten
      }
    }

    const { data, info } = await pipeline
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .normalize()
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    const base64 = data.toString("base64");

    return {
      base64,
      mimeType: "image/jpeg",
      dataUrl: `data:image/jpeg;base64,${base64}`,
      width: info.width,
      height: info.height,
    };
  } catch (err) {
    console.warn("[Preprocess] sharp processing failed, using raw image:", (err as Error).message);
    return rawFallback(input, sourceMime);
  }
}

export async function preprocessBase64(
  base64: string,
  mimeType?: string
): Promise<PreprocessedImage> {
  const buffer = Buffer.from(base64, "base64");
  return preprocessImageBuffer(buffer, mimeType);
}
