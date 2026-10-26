import type { DemoJob, LocalAsset, LocalResult, ProductDocument, Rect, SceneId, WorkspaceState } from "./contracts";

export const SCENES: SceneId[] = ["marble", "wood", "geometry"];
export const MAX_RESULTS = 6;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function emptyWorkspace(id = "initial"): WorkspaceState {
  return { schemaVersion: 1, document: { id, revision: 0, sourceAssetId: null, scene: "marble",
    canvas: { width: 1024, height: 1024, ratio: "1:1" },
    placement: { x: .14, y: .35, width: .72, height: .4 } }, assets: [], job: null, results: [], view: "draft" };
}
export function busy(job: DemoJob | null) { return !!job && ["queued", "preparing", "rendering", "saving"].includes(job.status); }
export function currentAsset(state: WorkspaceState) { return state.assets.find(a => a.id === state.document.sourceAssetId); }
export function sizeLimits(asset: Pick<LocalAsset, "bounds">) {
  const aspect = asset.bounds.width / asset.bounds.height;
  const max = Math.min(.92, .9 * aspect);
  return { min: Math.min(.2, max / 2), max, aspect };
}
export function fitPlacement(asset: Pick<LocalAsset, "bounds">): Rect {
  const { max, aspect } = sizeLimits(asset);
  const width = Math.min(.72, .62 * aspect, max);
  const height = width / aspect;
  return { x: (1 - width) / 2, y: .78 - height, width, height };
}
export function movePlacement(rect: Rect, x: number, y: number): Rect {
  return { ...rect, x: clamp(x, .02, .98 - rect.width), y: clamp(y, .02, .98 - rect.height) };
}
export function resizePlacement(rect: Rect, width: number, asset: Pick<LocalAsset, "bounds">): Rect {
  const limits = sizeLimits(asset);
  const w = clamp(width, limits.min, limits.max), h = w / limits.aspect;
  // Resize around the bottom centre so the product stays on its contact plane.
  return movePlacement({ ...rect, width: w, height: h }, rect.x + (rect.width - w) / 2, rect.y + rect.height - h);
}
function retain(state: WorkspaceState): WorkspaceState {
  const ids = new Set([state.document.sourceAssetId, ...state.results.map(r => r.snapshot.sourceAssetId)]);
  if (busy(state.job)) ids.add(state.job!.snapshot.sourceAssetId);
  return { ...state, assets: state.assets.filter(a => ids.has(a.id)) };
}
export function createDemoJob(state: WorkspaceState, id: string, now: number): DemoJob | undefined {
  const asset = currentAsset(state);
  if (busy(state.job) || !asset?.transparent || !state.document.foregroundAssetId) return;
  const snapshot = structuredClone(state.document);
  return { id, mode: "demo", status: "queued", createdAt: now, snapshot,
    request: { requestId: id, documentId: snapshot.id, documentRevision: snapshot.revision,
      sourceAssetId: asset.id, foregroundAssetId: snapshot.foregroundAssetId!, scene: snapshot.scene,
      canvas: { ...snapshot.canvas }, placement: { ...snapshot.placement } } };
}
export type Action =
  | { type: "hydrate"; state: WorkspaceState }
  | { type: "asset"; asset: LocalAsset }
  | { type: "scene"; scene: SceneId }
  | { type: "placement"; placement: Rect }
  | { type: "view"; id: string }
  | { type: "edit_result"; id: string }
  | { type: "start"; job: DemoJob }
  | { type: "stage"; id: string; status: "preparing" | "rendering" | "saving" }
  | { type: "complete"; id: string; result: Omit<LocalResult, "sequence"> }
  | { type: "fail"; id: string }
  | { type: "cancel" }
  | { type: "clear"; id: string };

export function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "hydrate": return action.state;
    case "clear": return emptyWorkspace(action.id);
    case "asset": return retain({ ...state, document: { ...state.document, revision: state.document.revision + 1,
      sourceAssetId: action.asset.id, foregroundAssetId: action.asset.transparent ? action.asset.id : undefined,
      placement: fitPlacement(action.asset) }, assets: [...state.assets.filter(a => a.id !== action.asset.id), action.asset], view: "draft" });
    case "scene":
      if (state.document.scene === action.scene) return { ...state, view: "draft" };
      return { ...state, document: { ...state.document, revision: state.document.revision + 1, scene: action.scene }, view: "draft" };
    case "placement":
      if (Object.keys(action.placement).every(k => action.placement[k as keyof Rect] === state.document.placement[k as keyof Rect])) return state;
      return { ...state, document: { ...state.document, revision: state.document.revision + 1, placement: action.placement }, view: "draft" };
    case "view": return action.id === "draft" || state.results.some(r => r.id === action.id) ? { ...state, view: action.id } : state;
    case "edit_result": {
      const result = state.results.find(r => r.id === action.id);
      if (!result || !state.assets.some(a => a.id === result.snapshot.sourceAssetId)) return state;
      return { ...state, document: { ...structuredClone(result.snapshot), id: state.document.id, revision: state.document.revision + 1 }, view: "draft" };
    }
    case "start": return busy(state.job) ? state : { ...state, job: action.job, view: "draft" };
    case "stage": return state.job?.id === action.id && busy(state.job) ? { ...state, job: { ...state.job, status: action.status } } : state;
    case "complete": {
      if (state.job?.id !== action.id || !busy(state.job) || state.results.some(r => r.jobId === action.id)) return state;
      const show = state.view === "draft" && state.document.revision === state.job.snapshot.revision;
      const result = { ...action.result, sequence: Math.max(0, ...state.results.map(r => r.sequence)) + 1 };
      const results = [result, ...state.results];
      // Keep a version the user is currently inspecting, even at the history limit.
      if (results.length > MAX_RESULTS) {
        const evict = results.findLastIndex(r => r.id !== state.view);
        results.splice(evict, 1);
      }
      return retain({ ...state, job: { ...state.job, status: "succeeded", resultId: action.result.id },
        results, view: show ? action.result.id : state.view });
    }
    case "fail": return state.job?.id === action.id && busy(state.job) ? { ...state, job: { ...state.job, status: "failed", error: "render_failed" } } : state;
    case "cancel": return busy(state.job) ? retain({ ...state, job: { ...state.job!, status: "cancelled" } }) : state;
  }
}

/** Reject malformed/old local drafts instead of turning persisted data into executable requests. */
export function validWorkspace(value: unknown): value is WorkspaceState {
  if (!value || typeof value !== "object") return false;
  const state = value as WorkspaceState;
  const validDocument = (d: ProductDocument) => !!d && typeof d.id === "string" && Number.isSafeInteger(d.revision) &&
    d.revision >= 0 && (d.sourceAssetId === null || typeof d.sourceAssetId === "string") &&
    (d.foregroundAssetId === undefined || d.foregroundAssetId === d.sourceAssetId) &&
    SCENES.includes(d.scene) && d.canvas?.width === 1024 && d.canvas?.height === 1024 && d.canvas.ratio === "1:1" &&
    !!d.placement && [d.placement.x, d.placement.y, d.placement.width, d.placement.height].every(Number.isFinite) &&
    d.placement.width > 0 && d.placement.height > 0 && d.placement.x >= 0 && d.placement.y >= 0 &&
    d.placement.x + d.placement.width <= 1.000001 && d.placement.y + d.placement.height <= 1.000001;
  if (state.schemaVersion !== 1 || !validDocument(state.document) || !Array.isArray(state.assets) || state.assets.length > 8 ||
    !state.assets.every(a => !!a && a.blob instanceof Blob && typeof a.name === "string" && typeof a.id === "string" &&
      typeof a.transparent === "boolean" && ["example", "upload"].includes(a.origin) &&
      Number.isSafeInteger(a.width) && Number.isSafeInteger(a.height) && a.width > 0 && a.height > 0 &&
      a.width * a.height <= 16_777_216 && !!a.bounds &&
      [a.bounds.x, a.bounds.y, a.bounds.width, a.bounds.height].every(Number.isFinite) &&
      a.bounds.x >= 0 && a.bounds.y >= 0 && a.bounds.width > 0 && a.bounds.height > 0 &&
      a.bounds.x + a.bounds.width <= a.width && a.bounds.y + a.bounds.height <= a.height)) return false;
  const hasAsset = (d: ProductDocument) => d.sourceAssetId === null || state.assets.some(a => a.id === d.sourceAssetId);
  if (!hasAsset(state.document) || new Set(state.assets.map(a => a.id)).size !== state.assets.length ||
    !Array.isArray(state.results) || state.results.length > MAX_RESULTS || !state.results.every(r => !!r &&
      typeof r.id === "string" && typeof r.jobId === "string" && Number.isSafeInteger(r.sequence) && r.sequence > 0 &&
      Number.isFinite(r.createdAt) && r.png instanceof Blob && r.mode === "demo" && validDocument(r.snapshot) && hasAsset(r.snapshot)) ||
    new Set(state.results.map(r => r.id)).size !== state.results.length ||
    !(state.view === "draft" || state.results.some(r => r.id === state.view))) return false;
  const job = state.job;
  if (job === null) return true;
  return !!job && job.mode === "demo" && typeof job.id === "string" && Number.isFinite(job.createdAt) &&
    validDocument(job.snapshot) && (!busy(job) || hasAsset(job.snapshot)) &&
    ["queued", "preparing", "rendering", "saving", "succeeded", "failed", "cancelled"].includes(job.status) &&
    !!job.request && job.request.requestId === job.id && job.request.documentId === job.snapshot.id &&
    job.request.documentRevision === job.snapshot.revision && job.request.sourceAssetId === job.snapshot.sourceAssetId &&
    job.request.foregroundAssetId === job.snapshot.foregroundAssetId && job.request.scene === job.snapshot.scene &&
    job.request.canvas?.width === 1024 && job.request.canvas?.height === 1024 && job.request.canvas?.ratio === "1:1" &&
    !!job.request.placement && (["x", "y", "width", "height"] as const).every(k => job.request.placement[k] === job.snapshot.placement[k]);
}
