import type { DemoJob, LocalAsset, ProductDocument, SceneId } from "@/domain/contracts";
import { ASSET_BASE, imageFromUrl } from "./assets";

// Immutable, public scene image; no user data or server-side request state here.
let backdropPromise: Promise<HTMLImageElement> | undefined;
export function loadBackdrop() {
  return backdropPromise ??= imageFromUrl(`${ASSET_BASE}/marble.png`).catch(error => {
    backdropPromise = undefined; throw error;
  });
}

export function drawBackground(ctx: CanvasRenderingContext2D, scene: SceneId, marble: HTMLImageElement) {
  const size = 1024;
  ctx.clearRect(0, 0, size, size);
  if (scene === "marble") { ctx.drawImage(marble, 0, 0, size, size); return; }
  const wall = ctx.createLinearGradient(0, 0, size, 650);
  wall.addColorStop(0, scene === "wood" ? "#f4efe5" : "#f4f5f7");
  wall.addColorStop(1, scene === "wood" ? "#e6dccc" : "#dde1e5");
  ctx.fillStyle = wall; ctx.fillRect(0, 0, size, size);
  const surface = ctx.createLinearGradient(0, 630, 0, size);
  surface.addColorStop(0, scene === "wood" ? "#d8b98b" : "#fafbfc");
  surface.addColorStop(1, scene === "wood" ? "#bc9463" : "#e4e7e9");
  ctx.fillStyle = surface; ctx.fillRect(0, 630, size, 394);
  if (scene === "wood") {
    for (let i = 0; i < 100; i++) {
      const y = 635 + i * 4;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(260, y - 14 * Math.sin(i), 670, y + 11 * Math.cos(i), size, y + 2);
      ctx.strokeStyle = `rgba(105, 69, 35, ${i % 8 === 0 ? .13 : .045})`;
      ctx.lineWidth = i % 8 === 0 ? 1.8 : .8; ctx.stroke();
    }
    ctx.fillStyle = "#a78358"; ctx.fillRect(0, 915, size, 2);
  } else {
    ctx.fillStyle = "#d4d8dc"; ctx.fillRect(0, 891, size, 133);
    ctx.fillStyle = "#f9fafb"; ctx.fillRect(0, 464, 152, 166);
    ctx.fillStyle = "#e6e9eb"; ctx.beginPath(); ctx.moveTo(152, 464); ctx.lineTo(211, 497);
    ctx.lineTo(211, 630); ctx.lineTo(152, 630); ctx.fill();
  }
}

export function drawComposition(ctx: CanvasRenderingContext2D, document: ProductDocument,
  asset: LocalAsset, image: HTMLImageElement, marble: HTMLImageElement) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawBackground(ctx, document.scene, marble);
  const rect = document.placement, size = 1024;
  if (asset.transparent) {
    ctx.save();
    ctx.filter = "blur(16px)";
    ctx.fillStyle = "rgba(38, 31, 20, .19)";
    ctx.beginPath(); ctx.ellipse((rect.x + rect.width * .54) * size, (rect.y + rect.height) * size + 8,
      rect.width * size * .45, Math.max(8, rect.height * size * .055), .015, 0, Math.PI * 2); ctx.fill();
    ctx.filter = "blur(4px)"; ctx.fillStyle = "rgba(30, 25, 20, .17)";
    ctx.beginPath(); ctx.ellipse((rect.x + rect.width * .5) * size, (rect.y + rect.height) * size + 1,
      rect.width * size * .36, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const crop = asset.bounds;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height,
    rect.x * size, rect.y * size, rect.width * size, rect.height * size);
  ctx.restore();
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, Math.max(0, ms));
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Local composition demonstration. No network model, task queue, wallet or fake segmentation. */
export async function runDemoJob(job: DemoJob, asset: LocalAsset,
  onStage: (stage: "preparing" | "rendering" | "saving") => void, signal: AbortSignal): Promise<Blob> {
  const elapsed = () => Date.now() - job.createdAt;
  await pause(1200 - elapsed(), signal); onStage("preparing");
  const sourceUrl = URL.createObjectURL(asset.blob);
  try {
    const [image, marble] = await Promise.all([imageFromUrl(sourceUrl), loadBackdrop()]);
    signal.throwIfAborted();
    await pause(1800 - elapsed(), signal); onStage("rendering");
    await pause(3000 - elapsed(), signal); signal.throwIfAborted();
    const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    drawComposition(context, job.snapshot, asset, image, marble);
    onStage("saving");
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob =>
      blob ? resolve(blob) : reject(new Error("export_failed")), "image/png"));
    signal.throwIfAborted(); return png;
  } finally { URL.revokeObjectURL(sourceUrl); }
}
