import type { ProductDocument } from "./contracts";
import type { InternalDraft } from "./service-contracts";
import { candidateSnapshot } from "./candidates";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validDocument(d: ProductDocument) {
  return !!d && UUID.test(d.id) && Number.isSafeInteger(d.revision) && d.revision >= 0 &&
    (d.sourceAssetId === null || UUID.test(d.sourceAssetId)) && (!d.foregroundAssetId || UUID.test(d.foregroundAssetId)) &&
    ["marble", "wood", "geometry"].includes(d.scene) && d.canvas?.width === 1024 && d.canvas.height === 1024 && d.canvas.ratio === "1:1" &&
    !!d.placement && [d.placement.x, d.placement.y, d.placement.width, d.placement.height].every(Number.isFinite) &&
    d.placement.width > 0 && d.placement.height > 0 && d.placement.x >= 0 && d.placement.y >= 0 &&
    d.placement.x + d.placement.width <= 1.000001 && d.placement.y + d.placement.height <= 1.000001;
}
export function validInternalDraft(value: unknown): value is InternalDraft {
  const v = value as InternalDraft;
  if (!v || v.version !== 1 || !UUID.test(v.authUserId || "") || !validDocument(v.document) || !["draft", "result"].includes(v.view)) return false;
  if (v.result && (!UUID.test(v.result.assetId) || !validDocument(v.result.document))) return false;
  if (v.group !== undefined) {
    // 候选组只能属于当前文档的某个已有版本，内容必须能还原成合法构图，否则不发起任何请求。
    const g = v.group, r = g?.request;
    if (!g || !UUID.test(g.groupId) || (g.confirmed !== undefined && g.confirmed !== true) || !r || r.version !== 1 || !UUID.test(r.requestId) || r.kind !== "candidates" ||
      ![2, 3, 4].includes(r.count) || !r.item || r.item.documentId !== v.document.id ||
      !Number.isSafeInteger(r.item.documentRevision) || r.item.documentRevision < 0 || r.item.documentRevision > v.document.revision ||
      !UUID.test(r.item.sourceAssetId) || !UUID.test(r.item.foregroundAssetId)) return false;
    if (!validDocument(candidateSnapshot(r))) return false;
  }
  if (v.view === "result" && !v.result) return false;
  if (v.pending) {
    const p = v.pending, r = p.request;
    if (!r || r.version !== 1 || !UUID.test(r.requestId) || !UUID.test(r.documentId) || !UUID.test(r.sourceAssetId) ||
      (p.jobId !== undefined && !UUID.test(p.jobId)) || (p.quoteId!==undefined&&!UUID.test(p.quoteId)) || r.documentId !== v.document.id || r.sourceAssetId !== v.document.sourceAssetId ||
      !Number.isSafeInteger(r.documentRevision) || r.documentRevision < 0 || r.documentRevision > v.document.revision) return false;
    if (r.kind === "product") {
      if (!UUID.test(r.foregroundAssetId || "") || !validDocument({ id: r.documentId, revision: r.documentRevision,
        sourceAssetId: r.sourceAssetId, foregroundAssetId: r.foregroundAssetId, scene: r.scene!, canvas: r.canvas!, placement: r.placement! })) return false;
    } else if (r.kind !== "segment") return false;
  }
  return true;
}
