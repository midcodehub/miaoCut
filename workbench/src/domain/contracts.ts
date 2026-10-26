/** Public business types only. Model graphs, node credentials and pricing stay on the private backend. */
export type SceneId = "marble" | "wood" | "geometry";
export type Locale = "zh" | "en";
export interface Rect { x: number; y: number; width: number; height: number }
export interface ProductDocument {
  id: string;
  revision: number;
  sourceAssetId: string | null;
  foregroundAssetId?: string;
  scene: SceneId;
  canvas: { width: 1024; height: 1024; ratio: "1:1" };
  /** Normalized visible-subject rectangle. Source crop is explicitly recorded on the asset. */
  placement: Rect;
}
export type JobStatus = "queued" | "preparing" | "rendering" | "saving" | "succeeded" | "failed" | "cancelled";
export interface CreateProductJobRequest {
  requestId: string;
  documentId: string;
  documentRevision: number;
  sourceAssetId: string;
  foregroundAssetId: string;
  scene: SceneId;
  canvas: ProductDocument["canvas"];
  placement: Rect;
}
export interface LocalAsset {
  id: string;
  name: string;
  blob: Blob;
  width: number;
  height: number;
  /** Visible alpha bounds in original-source pixels; placement is normalized separately. */
  bounds: Rect;
  transparent: boolean;
  origin: "example" | "upload";
}
export interface DemoJob {
  id: string;
  mode: "demo";
  status: JobStatus;
  createdAt: number;
  request: CreateProductJobRequest;
  snapshot: ProductDocument;
  error?: "render_failed";
  resultId?: string;
}
export interface LocalResult {
  id: string;
  sequence: number;
  jobId: string;
  mode: "demo";
  createdAt: number;
  snapshot: ProductDocument;
  png: Blob;
}
export interface WorkspaceState {
  schemaVersion: 1;
  document: ProductDocument;
  assets: LocalAsset[];
  job: DemoJob | null;
  results: LocalResult[];
  view: "draft" | string;
}
