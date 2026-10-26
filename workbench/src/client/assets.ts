import type { LocalAsset } from "@/domain/contracts";

export const ASSET_BASE = "/workbench/demo";
export class AssetError extends Error {
  constructor(readonly code: "file_type" | "file_size" | "image_size" | "image_decode") { super(code); }
}
export function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new AssetError("image_decode"));
    image.src = url;
  });
}
export async function decodeAsset(blob: Blob, name: string, origin: LocalAsset["origin"]): Promise<LocalAsset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(blob.type)) throw new AssetError("file_type");
  if (blob.size > 10 * 1024 * 1024) throw new AssetError("file_size");
  const url = URL.createObjectURL(blob);
  try {
    const image = await imageFromUrl(url);
    const width = image.naturalWidth, height = image.naturalHeight;
    if (width * height > 16_777_216) throw new AssetError("image_size");
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new AssetError("image_decode");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1, transparent = false;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < 255) transparent = true;
      if (alpha > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    if (maxX < 0) throw new AssetError("image_decode");
    return { id: crypto.randomUUID(), name, blob, width, height, transparent, origin,
      bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } };
  } finally { URL.revokeObjectURL(url); }
}
export async function exampleAsset(): Promise<LocalAsset> {
  const response = await fetch(`${ASSET_BASE}/sneaker.webp`);
  if (!response.ok) throw new AssetError("image_decode");
  return decodeAsset(await response.blob(), "MiaoCut sample sneaker", "example");
}
export function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
