import type { LocalAsset, ProductDocument, Rect } from './contracts';

export type FreeBackground = 'scene' | 'white' | 'studio';

/** Match the API's edge rounding; rounding width alone can move the far edge by one pixel. */
export function comparisonRect(doc: ProductDocument, asset: Pick<LocalAsset, 'id' | 'bounds' | 'transparent'>): Rect {
  const p = doc.placement, b = asset.bounds;
  if (!asset.transparent || doc.foregroundAssetId !== asset.id || doc.canvas.width !== 1024 || doc.canvas.height !== 1024 ||
    ![p.x, p.y, p.width, p.height, b.width, b.height].every(Number.isFinite) ||
    p.x < 0 || p.y < 0 || p.width <= 0 || p.height <= 0 || b.width <= 0 || b.height <= 0 ||
    p.x + p.width > 1 || p.y + p.height > 1 || Math.abs(p.width / p.height / (b.width / b.height) - 1) > .001) {
    throw new Error('comparison_geometry_mismatch');
  }
  const x = Math.round(p.x * 1024), y = Math.round(p.y * 1024);
  const width = Math.round((p.x + p.width) * 1024) - x, height = Math.round((p.y + p.height) * 1024) - y;
  if (!width || !height) throw new Error('comparison_geometry_mismatch');
  return { x, y, width, height };
}

/** Revisions may change while an earlier result is being inspected. Compare content, never the latest draft. */
export function compositionKey(doc: ProductDocument): string {
  return JSON.stringify([doc.sourceAssetId, doc.foregroundAssetId, doc.scene, doc.canvas.width, doc.canvas.height,
    doc.placement.x, doc.placement.y, doc.placement.width, doc.placement.height]);
}
