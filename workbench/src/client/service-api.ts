import type { LocalAsset } from "@/domain/contracts";
import type { ServiceAsset, ServiceGroup, ServiceGroupQuote, ServiceGroupRequest, ServiceJob, ServiceJobRequest } from "@/domain/service-contracts";
import { AssetError, decodeAsset, imageFromUrl } from "./assets";
import {accountToken} from './account-auth';

export class ServiceError extends Error {
  constructor(readonly code: string, readonly status = 0) { super(code); }
}
export class WorkbenchService {
  constructor(private sessionKey: string) {}
  async call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const token=await accountToken(this.sessionKey);
    if (!token) throw new ServiceError("login_required", 401);
    const response = await fetch(`/workbench/api/internal/${path}`, { method: body === undefined ? "GET" : "POST",
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body), signal, cache: "no-store", redirect: "error" });
    const data = await response.json();
    if (!response.ok) throw new ServiceError(data.error || "request_failed", response.status);
    return data;
  }
  asset(id: string, signal?: AbortSignal) { return this.call<ServiceAsset>(`assets/${id}`, undefined, signal); }
  job(id: string, signal?: AbortSignal) { return this.call<ServiceJob>(`jobs/${id}`, undefined, signal); }
  create(request: ServiceJobRequest, signal?: AbortSignal, quoteId?:string) { return this.call<ServiceJob>("jobs", quoteId?{request,quoteId}:request, signal); }
  quote(request:ServiceJobRequest) {return this.call<import('@/domain/service-contracts').ServiceQuote>('quotes',{request});}
  cancel(id: string) { return this.call<ServiceJob>(`jobs/${id}/cancel`, {}); }
  // 四候选：报价 → 确认（按 groupId + 请求内容幂等，可安全重发）→ 轮询组 → 停止剩余 / 补充积分后继续。
  groupQuote(request: ServiceGroupRequest) { return this.call<ServiceGroupQuote>("group-quotes", { request }); }
  createGroup(groupId: string, request: ServiceGroupRequest, signal?: AbortSignal) { return this.call<ServiceGroup>("groups", { groupId, request }, signal); }
  group(id: string, signal?: AbortSignal) { return this.call<ServiceGroup>(`groups/${id}`, undefined, signal); }
  cancelGroup(id: string) { return this.call<ServiceGroup>(`groups/${id}/cancel`, {}); }
  resumeGroup(id: string) { return this.call<ServiceGroup>(`groups/${id}/resume`, {}); }
  async upload(file: File, onProgress: (percent: number) => void): Promise<ServiceAsset> {
    const blob = await canonicalPng(file);
    const image = await decodeAsset(blob, file.name, "upload"), bytes = await blob.arrayBuffer();
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
    const request = { requestId: crypto.randomUUID(), name: file.name, mime: "image/png", bytes: blob.size,
      sha256: digest, width: image.width, height: image.height };
    const upload = await this.call<{ assetId: string; putUrl?: string; putHeaders?: Record<string,string>; asset?: ServiceAsset }>("assets", request);
    if (upload.asset) return upload.asset;
    if (!upload.putUrl) throw new ServiceError("upload_unavailable");
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open("PUT", upload.putUrl!);
      for (const [key, value] of Object.entries(upload.putHeaders || {})) xhr.setRequestHeader(key, value);
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)); };
      xhr.timeout = 120_000;
      xhr.onerror = xhr.ontimeout = () => reject(new ServiceError("upload_failed"));
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ServiceError("upload_failed", xhr.status));
      xhr.send(blob);
    });
    return this.call<ServiceAsset>(`assets/${upload.assetId}/confirm`, {});
  }
  async image(asset: ServiceAsset, signal?: AbortSignal): Promise<LocalAsset> {
    const response = await fetch(asset.url, { signal, redirect: "error", credentials: "omit", cache: "no-store" });
    if (!response.ok) throw new ServiceError("asset_download_failed", response.status);
    const blob = await response.blob();
    if (blob.size !== asset.bytes || blob.size > 32 * 1024 * 1024) throw new ServiceError("asset_mismatch");
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())), n => n.toString(16).padStart(2, "0")).join("");
    if (digest !== asset.sha256) throw new ServiceError("asset_mismatch");
    // Service results can exceed the 10 MB source-upload limit; canvas uses trusted server geometry.
    return { id: asset.assetId, name: "product.png", blob, width: asset.width, height: asset.height,
      bounds: asset.bounds, transparent: asset.transparent, origin: "upload" };
  }
}
export async function canonicalPng(file: File): Promise<Blob> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new AssetError("file_type");
  if (file.size > 10 * 1024 * 1024) throw new AssetError("file_size");
  const url = URL.createObjectURL(file);
  try {
    const image = await imageFromUrl(url);
    if (image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new AssetError("image_size");
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new AssetError("image_decode");
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new AssetError("image_decode")), "image/png"));
    if (blob.size > 10 * 1024 * 1024) throw new AssetError("file_size");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
