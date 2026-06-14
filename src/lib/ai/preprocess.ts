/**
 * Server-side image preprocessing before vision analysis.
 * Normalizes format, auto-orients, resizes, and improves contrast.
 */

import sharp from "sharp";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 85;

export interface PreprocessedImage {
  base64: string;
  mimeType: "image/jpeg";
  dataUrl: string;
  width: number;
  height: number;
}

export async function preprocessImageBuffer(
  input: Buffer,
  sourceMime?: string
): Promise<PreprocessedImage> {
  let pipeline = sharp(input, { failOn: "none" }).rotate();

  // Convert HEIC/WebP/PNG → optimized JPEG for consistent model input
  if (sourceMime?.includes("png") && (await isPngWithAlpha(input))) {
    pipeline = pipeline.flatten({ background: { r: 10, g: 10, b: 15 } });
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
}

export async function preprocessBase64(
  base64: string,
  mimeType?: string
): Promise<PreprocessedImage> {
  const buffer = Buffer.from(base64, "base64");
  return preprocessImageBuffer(buffer, mimeType);
}

async function isPngWithAlpha(buffer: Buffer): Promise<boolean> {
  try {
    const meta = await sharp(buffer).metadata();
    return meta.hasAlpha === true;
  } catch {
    return false;
  }
}
