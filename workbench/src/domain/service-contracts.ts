import type { ProductDocument, Rect } from "./contracts";

export interface ServiceAsset {
  assetId: string; mime: "image/png"; bytes: number; sha256: string; width: number; height: number;
  bounds: Rect; hasAlpha: boolean; transparent: boolean; sourceAssetId: string | null;
  expiresAt: number; url: string; urlExpiresAt: number;
}
export interface ServiceJobRequest {
  version: 1; requestId: string; kind: "segment" | "product";
  documentId: string; documentRevision: number; sourceAssetId: string;
  foregroundAssetId?: string; scene?: ProductDocument["scene"];
  canvas?: ProductDocument["canvas"]; placement?: Rect;
}
export interface ServiceJob {
  jobId: string; state: "queued" | "leased" | "verifying" | "settling" | "succeeded" | "failed" | "cancelled";
  mode: "internal"; billing: { mode: "unbilled_internal"; units: 0 } | {mode:'credits_internal';units:number;state:'held'|'confirmed'|'released'}; request: ServiceJobRequest;
  error: string | null; outputs?: Partial<Record<"foreground" | "alpha" | "final", ServiceAsset>>;
  queue?: { workerOnline: boolean };
}
export interface InternalDraft {
  version: 1; authUserId?: string; document: ProductDocument;
  pending?: { request: ServiceJobRequest; jobId?: string; quoteId?:string };
  /** 最近一次已确认的候选组。刷新后用 groupId 继续查询；创建请求可安全重发（服务端按 groupId + 请求内容幂等）。 */
  group?: { groupId: string; request: ServiceGroupRequest; confirmed?: true };
  result?: { assetId: string; document: ProductDocument };
  view: "draft" | "result";
}
export interface ServiceQuote {quoteId:string;units:number;expiresAt:number;pricingVersion:string;request:ServiceJobRequest;availableCredits:number;}
export interface ServiceExecution {status:'online'|'offline'|'unknown'}

/** 生成组里每张候选共用的商品模板：与单张商品请求相同，但不含 version / requestId / kind（由服务端派生）。 */
export interface ServiceGroupItemTemplate {
  documentId: string; documentRevision: number; sourceAssetId: string; foregroundAssetId: string;
  scene: ProductDocument["scene"]; canvas: ProductDocument["canvas"]; placement: Rect;
}
/** 四候选请求。浏览器只决定张数和构图，价格、seed 与派发顺序都由服务端决定。 */
export interface ServiceGroupRequest { version: 1; requestId: string; kind: "candidates"; count: number; item: ServiceGroupItemTemplate }
export interface ServiceGroupQuote {
  groupId: string; units: number; unitUnits: number; count: number; pricingVersion: string; expiresAt: number;
  request: ServiceGroupRequest; availableCredits: number;
}
/** waiting/awaiting_credits 还没有冻结积分；queued 之后与单张任务的状态相同。 */
export type ServiceGroupItemState = "waiting" | "awaiting_credits" | "queued" | "leased" | "verifying" | "settling" | "succeeded" | "failed" | "cancelled";
export interface ServiceGroupItem {
  index: number; attempt: number; units: number; state: ServiceGroupItemState;
  jobId?: string; billing?: "held" | "confirmed" | "released"; error?: string | null;
  queue?: { workerOnline: boolean }; result?: ServiceAsset;
}
export interface ServiceGroup {
  groupId: string; kind: "candidates"; request: ServiceGroupRequest; count: number;
  status: "quoted" | "running" | "paused" | "completed" | "cancelled";
  pauseReason: "insufficient_credits" | "reservation_failed" | null;
  budgetUnits: number; unitUnits: number; settledUnits: number; heldUnits: number;
  pricingVersion: string; createdAt: number; items: ServiceGroupItem[];
}
