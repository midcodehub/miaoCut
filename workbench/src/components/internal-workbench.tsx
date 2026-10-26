"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, LoaderCircle, Moon, Scissors, Sun, Upload } from "lucide-react";
import type { LocalAsset, Locale, ProductDocument, Rect } from "@/domain/contracts";
import type { InternalDraft, ServiceJob, ServiceJobRequest, ServiceQuote, ServiceExecution, ServiceGroup, ServiceGroupQuote } from "@/domain/service-contracts";
import {accountConfigured} from '@/client/account-auth';
import { WorkbenchService, ServiceError } from "@/client/service-api";
import { messages } from "@/client/i18n";
import { downloadPng } from "@/client/assets";
import { emptyWorkspace, fitPlacement, resizePlacement, SCENES, sizeLimits } from "@/domain/model";
import { validInternalDraft } from "@/domain/service-state";
import { BlobImage } from "./blob-image";
import { EditorCanvas } from "./editor-canvas";
import {SceneComparison} from './scene-comparison';
import {compositionKey} from '@/domain/comparison';
import { CANDIDATE_COUNT, candidateRequest, candidateSnapshot, groupActive, groupMatches } from "@/domain/candidates";
import { CandidateStrip } from "./candidate-strip";

const copy = {
  zh: {
    title: "商品场景 · 内部测试", intro: "上传自己的商品，提取主体，再生成一张场景图。",
    notice: "内部 API 模式，仅向测试账户开放，不消耗积分。GPU 推理与商品质量仍需验收，耗时以实际任务状态为准。",
    connecting: "正在确认内部测试权限", ready: "服务已连接", upload: "上传并提取主体", uploadHint: "PNG / JPG / WebP，最大 10 MB，每边不超过 4096 像素。",
    uploading: "正在上传并确认素材", queued: "任务已排队", segment: "正在提取主体", product: "正在生成场景", verifying: "正在校验并保存结果",
    queueOffline: "生成服务暂时离线，任务尚未开始，可取消排队。", queueExpired: "排队已超时，本次未完成处理。素材已保留，服务恢复后可重新发起。",
    offline: "生成服务离线，暂不接受新的上传和 AI 生成。已提取的商品仍可免费合成、查看和下载。", unknown: "暂时无法确认生成服务状态，请稍后重试。已有素材与结果仍可使用。",
    done: "任务已完成", cancelled: "排队任务已取消", failed: "处理未完成，可重新发起任务。", generate: "AI 生成场景图", waiting: "等待当前任务完成",
    insufficient: "可用积分不足，本次未创建新任务。", quoteExpired: "报价已过期，请重新获取报价。", paused: "新任务暂时停止接收，已有任务仍可查询和结算。",
    access: "当前账号未加入此次内测，请切换到获准的 MiaoCut 账号。",
    error: "连接或操作未完成。已有任务记录会保留，可恢复查询。", login: "请使用已有 MiaoCut 账户登录。同源部署时会复用主站登录态。",
    account: "前往账户登录", resume: "恢复查询", cancel: "取消排队", noSubject: "上传后会自动开始主体提取。", sourceSaved: "原图已保存，生成时复用素材。",
    reuse: "同一商品换场景无需再次上传。", extract: "重新提取主体", viewResult: "查看已完成结果", draft: "继续编辑构图", noResult: "生成成功后可在这里查看并下载。",
    candidates: "生成 4 张候选", candidateOffer: (u: number, n: number, each: number, a: number) => `本次最多 ${u} 积分（${n} 张 × ${each}）· 当前可用 ${a} 积分`,
    candidateRule: "积分逐张预留：完成一张扣一张，未完成或停止的不扣。确认时可用积分需要覆盖全部预算。", candidateConfirm: (u: number) => `确认生成 · 最多 ${u} 积分`,
    candidateBusy: "候选正在生成", previewing: (n: number) => `候选 ${n}`, backToDraft: "返回编辑稿", choose: "设为选定版本", downloadCandidate: "下载这张",
    storage: "浏览器无法保存任务记录，请恢复存储权限后重试。", expired: "素材或结果已失效，请重新上传商品。历史任务不会自动重新执行。", mode: "内部测试 · 不扣积分", returnDemo: "返回交互演示", cancelRace: "任务已开始，当前无法取消；正在继续查询。",
  },
  en: {
    title: "Product scenes · Internal test", intro: "Upload your product, extract the subject, then create one scene image.",
    notice: "Internal API mode for test accounts, with no credits used. GPU execution and product quality still require acceptance testing. Progress follows actual job states.",
    connecting: "Checking internal access", ready: "Service connected", upload: "Upload and extract subject", uploadHint: "PNG / JPG / WebP, up to 10 MB and 4096 pixels per side.",
    uploading: "Uploading and confirming the asset", queued: "Job queued", segment: "Extracting the subject", product: "Generating the scene", verifying: "Validating and saving the result",
    queueOffline: "The generation service is offline. This job has not started; you can cancel it.", queueExpired: "The queue wait expired. Assets are kept; start a new job when the service returns.",
    offline: "Generation is offline. New uploads and AI jobs are paused; extracted subjects can still be composed and downloaded for free.", unknown: "Generation availability is unknown. Try again later; existing assets and results remain usable.",
    done: "Job completed", cancelled: "Queued job cancelled", failed: "Processing did not finish. You can start a new job.", generate: "Generate AI scene", waiting: "Waiting for the active job",
    insufficient: "Insufficient credits. No new job was created.", quoteExpired: "The quote expired. Request a new quote.", paused: "New jobs are paused. Existing jobs can still finish and settle.",
    access: "This account is not in the test cohort. Switch to an authorized MiaoCut account.",
    error: "The connection or operation did not finish. Existing job records are kept; resume to check their status.", login: "Sign in with your existing MiaoCut account. A deployment on the main site’s origin reuses its session.",
    account: "Go to account login", resume: "Resume status checks", cancel: "Cancel queued job", noSubject: "Uploading starts subject extraction automatically.", sourceSaved: "Source saved; generation reuses this asset.",
    reuse: "Change scenes without uploading the product again.", extract: "Extract subject again", viewResult: "View completed result", draft: "Continue composing", noResult: "A completed image will be available to view and download here.",
    candidates: "Generate 4 candidates", candidateOffer: (u: number, n: number, each: number, a: number) => `Up to ${u} credits (${n} × ${each}) · ${a} available`,
    candidateRule: "Credits are reserved one image at a time and charged only for completed images. Your balance must cover the full budget to start.", candidateConfirm: (u: number) => `Confirm · up to ${u} credits`,
    candidateBusy: "Candidates in progress", previewing: (n: number) => `Candidate ${n}`, backToDraft: "Back to draft", choose: "Use this version", downloadCandidate: "Download this one",
    storage: "The browser cannot save job records. Restore storage access and try again.", expired: "The asset or result is unavailable. Upload the product again; old jobs will not restart automatically.", mode: "Internal test · No credits", returnDemo: "Back to interactive demo", cancelRace: "The job has started and can no longer be cancelled. Status checks continue.",
  },
};
const sceneClasses = { marble: "scene-marble", wood: "scene-wood", geometry: "scene-geometry" };
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export function InternalWorkbench({ sessionKey }: { sessionKey: string }) {
  const api = useMemo(() => new WorkbenchService(sessionKey), [sessionKey]);
  const storageKey = `mc.workbench.internal.v1.${sessionKey}`;
  const [record, setRecord] = useState<InternalDraft>({ version: 1, document: emptyWorkspace().document, view: "draft" });
  const current = useRef(record), uploadLock = useRef(false);
  const [connected, setConnected] = useState(false), [locale, setLocale] = useState<Locale>("zh"), [dark, setDark] = useState(false);
  const [error, setError] = useState<"login" | "access" | "error" | "storage" | "failed" | "queueExpired" | "expired" | "cancelRace" | "insufficient" | "quoteExpired" | "paused" | "offline" | "unknown" | null>(null);
  const [serverJob, setServerJob] = useState<ServiceJob | null>(null), [resume, setResume] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [asset, setAsset] = useState<LocalAsset>(), [result, setResult] = useState<LocalAsset>();
  const [execution,setExecution]=useState<ServiceExecution['status']>('unknown');
  const [savedForeground,setSavedForeground]=useState<LocalAsset>();
  const [pricing,setPricing]=useState<{segment:number;product:number;admissionOpen:boolean}>();
  const [offer,setOffer]=useState<ServiceQuote>(),[quoting,setQuoting]=useState(false);
  const quoteLock=useRef(false);
  // 四候选：报价面板、服务端组视图、已下载的候选图（按资产 ID）、正在预览的候选序号。
  const [candidatesEnabled,setCandidatesEnabled]=useState(false),[groupOffer,setGroupOffer]=useState<ServiceGroupQuote>();
  const [groupView,setGroupView]=useState<ServiceGroup|null>(null),[candidateImages,setCandidateImages]=useState<Record<string,LocalAsset>>({});
  const [preview,setPreview]=useState<number|null>(null),[groupBusy,setGroupBusy]=useState(false),[groupPoll,setGroupPoll]=useState(0);
  const loadingImages=useRef(new Set<string>());
  const input = useRef<HTMLInputElement>(null);
  const t = messages[locale], c = copy[locale];
  const replace = useCallback((next: InternalDraft) => {
    if (!next.authUserId) throw new ServiceError("login_required", 401);
    try { localStorage.setItem(`${storageKey}.${next.authUserId}`, JSON.stringify(next)); }
    catch { throw new ServiceError("storage_error"); }
    current.current = next; setRecord(next);
  }, [storageKey]);
  const report = useCallback((problem: unknown) => {
    setError(problem instanceof ServiceError && problem.status === 401 ? "login" :
      problem instanceof ServiceError && problem.code==='internal_access_required'?'access':
      problem instanceof ServiceError && problem.code==='billing_paused'?'paused':
      problem instanceof ServiceError && problem.code==='quote_expired'?'quoteExpired':
      problem instanceof ServiceError && problem.code==='insufficient'?'insufficient':
      problem instanceof ServiceError && problem.code === "storage_error" ? "storage" : "error");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function initialize() {
      setConnected(false);
      setAsset(undefined); setResult(undefined);setServerJob(null);setOffer(undefined);
      setGroupOffer(undefined);setGroupView(null);setCandidateImages({});setPreview(null);loadingImages.current.clear();
      setDark(document.documentElement.classList.contains("dark"));
      try { setLocale(localStorage.getItem("mc.workbench.locale") === "en" ? "en" : "zh"); } catch { /* Optional. */ }
      try {
        const caps = await api.call<{ mode: string; version: number; identity?: { authUserId: string }; execution?:ServiceExecution; candidates?:{counts?:number[]}|null; billing?: { mode: string; units?: number;segment?:number;product?:number;admissionOpen?:boolean } }>("capabilities", undefined, controller.signal);
        const identity = caps.identity?.authUserId;
        const paid=caps.version===2&&caps.billing?.mode==='credits_internal'&&[caps.billing.segment,caps.billing.product].every(n=>Number.isSafeInteger(n)&&n!>=0);
        if (caps.mode !== "internal" || (!(caps.version===1&&caps.billing?.mode==='unbilled_internal'&&caps.billing.units===0)&&!paid) || !identity || !/^[0-9a-f-]{36}$/i.test(identity)) throw new ServiceError("protocol_mismatch");
        if(!controller.signal.aborted)setPricing(paid?{segment:caps.billing!.segment!,product:caps.billing!.product!,admissionOpen:caps.billing!.admissionOpen===true}:undefined);
        // 候选组依赖积分账本里的组预算；不计费模式下服务端不开放，页面也不显示入口。
        if(!controller.signal.aborted)setCandidatesEnabled(paid&&Array.isArray(caps.candidates?.counts)&&caps.candidates!.counts!.includes(CANDIDATE_COUNT));
        if(!controller.signal.aborted)setExecution(caps.execution?.status==='online'?'online':caps.execution?.status==='offline'?'offline':'unknown');
        let draft: InternalDraft = { version: 1, authUserId: identity, document: emptyWorkspace(crypto.randomUUID()).document, view: "draft" };
        try {
          const saved = JSON.parse(localStorage.getItem(`${storageKey}.${identity}`) || "null");
          if (validInternalDraft(saved) && saved.authUserId === identity) draft = saved;
        } catch { /* Corrupt local records never become service requests. */ }
        if (!controller.signal.aborted) { current.current = draft; setRecord(draft); setConnected(true); setError(null); }
      } catch (e) { if (!controller.signal.aborted) report(e); }
    }
    void initialize(); return () => controller.abort();
  }, [api, storageKey, report, resume]);

  useEffect(()=>{
    if(!connected)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const caps=await api.call<{execution?:ServiceExecution}>('capabilities',undefined,controller.signal);
        if(!controller.signal.aborted)setExecution(caps.execution?.status==='online'?'online':caps.execution?.status==='offline'?'offline':'unknown');
      } catch {if(!controller.signal.aborted)setExecution('unknown');}
      if(!controller.signal.aborted)timer=setTimeout(()=>void refresh(),15000);
    }
    timer=setTimeout(()=>void refresh(),15000);
    return ()=>{controller.abort();clearTimeout(timer);};
  },[api,connected]);

  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === sessionKey) setResume(n => n + 1); };
    window.addEventListener("storage", changed);
    const authChanged=()=>setResume(n=>n+1);window.addEventListener('mc.workbench-auth',authChanged);
    return () => {window.removeEventListener("storage", changed);window.removeEventListener('mc.workbench-auth',authChanged);};
  }, [sessionKey]);

  const pending = record.pending;
  useEffect(() => {
    if (!pending || !connected) return;
    const controller = new AbortController(), signal = controller.signal;
    const same = () => current.current.pending?.request.requestId === pending.request.requestId;
    async function track() {
      try {
        let job: ServiceJob;
        if (!pending!.jobId) {
          job = await api.create(pending!.request, signal,pending!.quoteId);
          if (signal.aborted || !same()) return;
          // Persist the original server job before switching to polling. A lost response retries the same requestId.
          replace({ ...current.current, pending: { ...pending!, jobId: job.jobId } }); return;
        }
        while (!signal.aborted && same()) {
          job = await api.job(pending!.jobId!, signal);
          if (signal.aborted || !same()) return;
          setServerJob(job);
          if (job.state === "succeeded") {
            const next = current.current;
            if (pending!.request.kind === "segment") {
              const foreground = job.outputs?.foreground;
              if (!foreground) throw new ServiceError("missing_foreground");
              replace({ ...next, pending: undefined, view: "draft", document: { ...next.document,
                revision: next.document.revision + 1, foregroundAssetId: foreground.assetId, placement: fitPlacement(foreground) } });
            } else {
              if (!job.outputs?.final) throw new ServiceError("missing_result");
              const r = pending!.request;
              const snapshot: ProductDocument = { id: r.documentId, revision: r.documentRevision, sourceAssetId: r.sourceAssetId,
                foregroundAssetId: r.foregroundAssetId, scene: r.scene!, canvas: r.canvas!, placement: r.placement! };
              replace({ ...next, pending: undefined, result: { assetId: job.outputs.final.assetId, document: snapshot },
                view: next.document.revision === r.documentRevision ? "result" : "draft" });
            }
            setError(null); return;
          }
          if (job.state === "failed" || job.state === "cancelled") {
            replace({ ...current.current, pending: undefined }); setError(job.state === "failed" ? job.error === 'job_expired' ? 'queueExpired' : "failed" : null); return;
          }
          await sleep(2000, signal);
        }
      } catch (e) {
        if (signal.aborted) return;
        if (e instanceof ServiceError && ["asset_not_found", "asset_expired", "foreground_lineage"].includes(e.code) && same()) {
          try {
            replace({ ...current.current, pending: undefined, view: "draft", document: { ...current.current.document,
              revision: current.current.document.revision + 1, sourceAssetId: null, foregroundAssetId: undefined } });
            setError("expired");
          } catch (storageError) { report(storageError); }
        } else if (!pending!.jobId && e instanceof ServiceError && ["invalid_fields", "invalid_placement", "aspect_ratio_changed", "invalid_pixel_placement", "unsupported_canvas", "invalid_product","quote_expired","quote_changed","insufficient","billing_paused"].includes(e.code) && same()) {
          try { replace({ ...current.current, pending: undefined }); setError(e.code==='insufficient'?'insufficient':e.code==='quote_expired'?'quoteExpired':e.code==='billing_paused'?'paused':'failed'); }
          catch (storageError) { report(storageError); }
        } else report(e);
      }
    }
    void track(); return () => controller.abort();
  }, [pending, api, connected, replace, report, resume]);

  const groupRecord = record.group;
  useEffect(() => {
    if (!groupRecord || !connected) return;
    const controller = new AbortController(), signal = controller.signal;
    const same = () => current.current.group?.groupId === groupRecord.groupId;
    async function track() {
      try {
        if (!groupRecord!.confirmed) {
          // 确认请求按 groupId + 请求内容幂等：确认响应丢失或刷新后重发，服务端返回同一个组，不会再冻结积分。
          const view = await api.createGroup(groupRecord!.groupId, groupRecord!.request, signal);
          if (signal.aborted || !same()) return;
          if (!groupMatches(view, groupRecord!)) throw new ServiceError("protocol_mismatch");
          setGroupView(view); replace({ ...current.current, group: { ...groupRecord!, confirmed: true } }); return;
        }
        while (!signal.aborted && same()) {
          const view = await api.group(groupRecord!.groupId, signal);
          if (signal.aborted || !same()) return;
          if (!groupMatches(view, groupRecord!)) throw new ServiceError("protocol_mismatch");
          setGroupView(view);
          // 没有执行中的候选且组不会自己推进（完成、停止、等待积分）时停止轮询；继续或停止操作会重新开始。
          if (!groupActive(view)) return;
          await sleep(2000, signal);
        }
      } catch (e) {
        if (signal.aborted) return;
        const code = e instanceof ServiceError ? e.code : "";
        if (!groupRecord!.confirmed && ["quote_expired", "quote_changed", "quote_not_found", "insufficient", "billing_paused", "invalid_fields", "invalid_group", "group_count"].includes(code) && same()) {
          // 确认没有成功，不存在任何冻结：丢弃这条记录，让用户重新报价。
          try { replace({ ...current.current, group: undefined }); setGroupView(null); setPreview(null); setError(code === "insufficient" ? "insufficient" : code === "quote_expired" ? "quoteExpired" : code === "billing_paused" ? "paused" : "failed"); }
          catch (storageError) { report(storageError); }
        } else if (code === "group_not_found" && same()) {
          try { replace({ ...current.current, group: undefined }); setGroupView(null); setPreview(null); } catch (storageError) { report(storageError); }
        } else report(e);
      }
    }
    void track(); return () => controller.abort();
  }, [groupRecord, api, connected, replace, report, resume, groupPoll]);
  // 只下载已经完成的候选图；下载时校验大小和 SHA-256，失败的下一次轮询再试。
  const candidateAssets = useMemo(() => groupView?.items.flatMap(item => item.result ? [item.result] : []) ?? [], [groupView]);
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    for (const result of candidateAssets) {
      if (loadingImages.current.has(result.assetId)) continue;
      loadingImages.current.add(result.assetId);
      void api.image(result, controller.signal).then(image => {
        if (!controller.signal.aborted) setCandidateImages(images => ({ ...images, [result.assetId]: image }));
      }).catch(() => { loadingImages.current.delete(result.assetId); });
    }
    return () => controller.abort();
  }, [api, connected, candidateAssets]);

  const displayAssetId = record.document.foregroundAssetId || record.document.sourceAssetId;
  useEffect(() => {
    if (!connected || !displayAssetId) return;
    const controller = new AbortController();
    void api.asset(displayAssetId, controller.signal).then(a => api.image(a, controller.signal)).then(image => {
      if (!controller.signal.aborted) setAsset(image);
    }).catch(e => { if (!controller.signal.aborted) report(e); });
    return () => controller.abort();
  }, [api, displayAssetId, connected, report]);
  const resultId = record.result?.assetId;
  useEffect(() => {
    if (!connected || !resultId) return;
    const controller = new AbortController();
    void api.asset(resultId, controller.signal).then(a => api.image(a, controller.signal)).then(image => {
      if (!controller.signal.aborted) setResult(image);
    }).catch(e => { if (!controller.signal.aborted) report(e); });
    return () => controller.abort();
  }, [api, resultId, connected, report]);

  const comparisonDocument=record.result?.document||record.document;
  const comparisonId=comparisonDocument.foregroundAssetId;
  useEffect(()=>{
    if(!connected||!comparisonId||asset?.id===comparisonId)return;
    const controller=new AbortController();
    void api.asset(comparisonId,controller.signal).then(a=>api.image(a,controller.signal)).then(a=>{
      if(!controller.signal.aborted)setSavedForeground(a);
    }).catch(e=>{if(!controller.signal.aborted)report(e);});
    return ()=>controller.abort();
  },[api,connected,comparisonId,asset,report]);

  const edit = (patch: Partial<ProductDocument>) => {
    if (!connected) return;
    setOffer(undefined); setGroupOffer(undefined); setPreview(null);
    try { replace({ ...current.current, view: "draft", document: { ...current.current.document, ...patch, revision: current.current.document.revision + 1 } }); }
    catch (e) { report(e); }
  };
  const uploadFile = async (file: File) => {
    if (uploadLock.current || current.current.pending || !connected || execution!=='online' || pricing?.admissionOpen===false) return;
    const actingUser = current.current.authUserId;
    uploadLock.current = true; setUploadProgress(0); setError(null);
    try {
      const source = await api.upload(file, setUploadProgress), before = current.current;
      if (before.authUserId !== actingUser) return;
      const document = { ...before.document, revision: before.document.revision + 1, sourceAssetId: source.assetId, foregroundAssetId: undefined };
      replace({ ...before, document, view: "draft" });
      await generate('segment');
    } catch (e) { report(e); }
    finally { uploadLock.current = false; setUploadProgress(null); }
  };
  const generate = async (kind: "product" | "segment") => {
    const state = current.current, doc = state.document;
    if(execution!=='online'){setError(execution);return;}
    if (!connected || pricing?.admissionOpen===false || state.pending || quoteLock.current || !doc.sourceAssetId || (kind === "product" && !doc.foregroundAssetId)) return;
    const request: ServiceJobRequest = { version: 1, requestId: crypto.randomUUID(), kind, documentId: doc.id,
      documentRevision: doc.revision, sourceAssetId: doc.sourceAssetId,
      ...(kind === "product" ? { foregroundAssetId: doc.foregroundAssetId, scene: doc.scene, canvas: doc.canvas, placement: doc.placement } : {}) };
    quoteLock.current=true;setQuoting(true);
    try {
      if(pricing) {
        const quote=await api.quote(request);
        if(current.current.authUserId!==state.authUserId||current.current.document.revision!==doc.revision)return;
        if(!Number.isSafeInteger(quote.units)||quote.units<0||quote.expiresAt<=Date.now())throw new ServiceError('invalid_quote');
        if(quote.units>0)setOffer(quote);
        else replace({...current.current,view:'draft',pending:{request,quoteId:quote.quoteId}});
      } else replace({ ...state, view: "draft", pending: { request } });
      setError(null);
    }
    catch (e) { report(e); }
    finally {quoteLock.current=false;setQuoting(false);}
  };
  const acceptOffer=()=>{
    if(execution!=='online'){setError(execution);return;}
    if(!offer||current.current.pending||!connected)return;
    if(offer.expiresAt<=Date.now()){setOffer(undefined);setError('quoteExpired');return;}
    try {replace({...current.current,view:'draft',pending:{request:offer.request,quoteId:offer.quoteId}});setOffer(undefined);setError(null);}
    catch(e){report(e);}
  };
  const cancel = async () => {
    const active = current.current.pending; if (!active?.jobId) return;
    try {
      const job = await api.cancel(active.jobId);
      if (current.current.pending?.request.requestId === active.request.requestId) {
        if(['failed','cancelled'].includes(job.state))replace({ ...current.current, pending: undefined });
        setServerJob(job);
      }
    } catch (e) { if (e instanceof ServiceError && e.code === "cannot_cancel_running") setError("cancelRace"); else report(e); }
  };
  const candidatesBusy = !!groupRecord && (!groupRecord.confirmed || (!!groupView && groupActive(groupView)));
  const generateCandidates = async () => {
    const state = current.current, doc = state.document;
    if (execution !== "online") { setError(execution); return; }
    if (!connected || !pricing || pricing.admissionOpen === false || !candidatesEnabled || quoteLock.current || candidatesBusy) return;
    const request = candidateRequest(doc, crypto.randomUUID()); if (!request) return;
    quoteLock.current = true; setQuoting(true);
    try {
      const quote = await api.groupQuote(request);
      if (current.current.authUserId !== state.authUserId || current.current.document.revision !== doc.revision) return;
      if (!Number.isSafeInteger(quote.units) || quote.units < 0 || quote.expiresAt <= Date.now() || quote.request.requestId !== request.requestId || !/^[0-9a-f-]{36}$/i.test(quote.groupId)) throw new ServiceError("invalid_quote");
      setOffer(undefined); setGroupOffer(quote); setError(null);
    } catch (e) { report(e); }
    finally { quoteLock.current = false; setQuoting(false); }
  };
  const acceptGroupOffer = () => {
    if (execution !== "online") { setError(execution); return; }
    if (!groupOffer || !connected || candidatesBusy) return;
    if (groupOffer.expiresAt <= Date.now()) { setGroupOffer(undefined); setError("quoteExpired"); return; }
    // 先持久化 groupId 再提交确认：确认响应丢失时，刷新后用同一个 groupId 继续，不会建第二组。
    try {
      replace({ ...current.current, group: { groupId: groupOffer.groupId, request: groupOffer.request } });
      // 新的一组开始：清掉上一组的预览和已下载的候选图，释放内存。
      setGroupOffer(undefined); setGroupView(null); setPreview(null); setCandidateImages({}); loadingImages.current.clear(); setError(null);
    }
    catch (e) { report(e); }
  };
  const groupAction = async (action: "stop" | "resume") => {
    const active = current.current.group; if (!active?.confirmed || groupBusy) return;
    setGroupBusy(true);
    try {
      const view = action === "stop" ? await api.cancelGroup(active.groupId) : await api.resumeGroup(active.groupId);
      if (current.current.group?.groupId === active.groupId && groupMatches(view, active)) { setGroupView(view); setGroupPoll(n => n + 1); }
    } catch (e) { report(e); }
    finally { setGroupBusy(false); }
  };
  const previewItem = preview !== null && groupView && groupRecord && groupMatches(groupView, groupRecord) ? groupView.items[preview] : undefined;
  const previewImage = previewItem?.result ? candidateImages[previewItem.result.assetId] : undefined;
  const chooseCandidate = () => {
    const active = current.current.group;
    if (!active || !previewItem?.result) return;
    try { replace({ ...current.current, result: { assetId: previewItem.result.assetId, document: candidateSnapshot(active.request) }, view: "result" }); setPreview(null); }
    catch (e) { report(e); }
  };
  const readonly = record.view === "result" && !!record.result;
  const currentJob = pending?.jobId === serverJob?.jobId ? serverJob : null;
  const billing=(pending?currentJob:serverJob)?.billing;
  const billingMessage=billing?.mode==='credits_internal'?(billing.units===0?(locale==='zh'?'主体提取免费':'Free extraction'):
    billing.state==='confirmed'?(locale==='zh'?`已扣除 ${billing.units} 积分`:`${billing.units} credits charged`):
    billing.state==='released'?(locale==='zh'?`已释放 ${billing.units} 积分预留`:`${billing.units} reserved credits released`):
    (locale==='zh'?`已预留 ${billing.units} 积分`:`${billing.units} credits reserved`)):null;
  const visibleAsset = connected && asset?.id === displayAssetId ? asset : undefined;
  const output = connected && result?.id === resultId ? result : undefined;
  const displayDocument = readonly ? record.result!.document : record.document;
  const limits = visibleAsset ? sizeLimits(visibleAsset) : { min: .2, max: .92 };
  const status = uploadProgress !== null ? `${c.uploading} · ${uploadProgress}%` : pending ?
    !currentJob || currentJob.state === "queued" ? currentJob?.queue?.workerOnline === false ? c.queueOffline : c.queued : currentJob.state === "settling" ? (locale==='zh'?'正在确认积分结算':'Confirming credit settlement') : currentJob.state === "verifying" ? c.verifying : pending.request.kind === "segment" ? c.segment : c.product :
    serverJob?.state === "cancelled" ? c.cancelled : serverJob?.state === "succeeded" ? c.done : connected ? c.ready : c.connecting;
  const move = (placement: Rect) => edit({ placement });
  return <div className="workbench-app internal-workbench">
    <header className="site-header"><div className="header-content"><a className="brand-link" aria-label="MiaoCut" href="https://miaocut.app"><span className="brand-mark"><Scissors size={19} /></span>MiaoCut</a>
      <span className="header-workspace">{pricing?(locale==='zh'?'积分内测':'Credit test'):c.mode}</span><div className="header-actions"><a className="comparison-back" href="/workbench/compare">{locale==='zh'?'查看对比样图':'Compare samples'}</a><button type="button" className="icon-button" aria-label={t.language} onClick={() => { const next = locale === "zh" ? "en" : "zh"; setLocale(next); document.documentElement.lang = next; }}>{locale === "zh" ? "EN" : "中"}</button>
        <button type="button" className="icon-button" aria-label={dark ? t.switchLight : t.switchDark} onClick={() => { setDark(!dark); document.documentElement.classList.toggle("dark", !dark); }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></div></div></header>
    <main className="workspace-main"><div className="page-heading"><div><h1>{c.title}</h1><p>{c.intro}</p></div></div>
      <div className="demo-notice">{pricing?(locale==='zh'?`内测：主体提取 ${pricing.segment} 积分，每张场景图 ${pricing.product} 积分。确认报价后预留积分，完成后扣减。`:`Internal test: extraction ${pricing.segment} credits; each scene ${pricing.product} credits. Credits are reserved after confirmation and charged on completion.`):c.notice}</div>
      {pricing?.admissionOpen===false?<div className="demo-notice" role="status">{c.paused}</div>:null}
      {connected&&execution!=='online'?<div className="demo-notice" role="status">{c[execution]}</div>:null}
      {error ? <div className="error-notice" role="alert"><span>{c[error]}</span>{(error === "login" || error === "access") ? <a href={accountConfigured()?'/workbench/login':"https://miaocut.app/account/"}>{c.account}</a> : <button type="button" className="subtle-button" onClick={() => { setError(null); setResume(n => n + 1); }}>{c.resume}</button>}</div> : null}
      <div className="workspace-grid"><aside className="side-panel asset-panel"><div className="panel-section"><h2>{t.assetTitle}</h2>
        <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.currentTarget.value = ""; }} />
        <button type="button" className="upload-zone" disabled={!connected || execution!=='online' || pricing?.admissionOpen===false || !!pending || quoting || uploadProgress !== null} onClick={() => input.current?.click()}>{visibleAsset ? <span className="asset-thumbnail checkerboard"><BlobImage blob={visibleAsset.blob} alt={t.assetTitle} /></span> : <Upload size={24} />}<span>{visibleAsset ? t.replace : c.upload}</span></button><p className="control-help">{c.uploadHint}</p><p className="control-help">{record.document.sourceAssetId ? c.sourceSaved : c.noSubject}</p>
        {record.document.sourceAssetId && !record.document.foregroundAssetId && !pending ? <button type="button" className="sample-button" disabled={execution!=='online'||quoting||pricing?.admissionOpen===false} onClick={() => void generate("segment")}>{c.extract}</button> : null}
      </div><div className="panel-section scene-section"><h2>{t.sceneTitle}</h2><div className="scene-list">{SCENES.map(scene => <button type="button" key={scene} disabled={!connected} aria-label={t[scene]} aria-pressed={record.document.scene === scene}
        className={`scene-card ${record.document.scene === scene ? "is-selected" : ""}`} onClick={() => edit({ scene })}><span className={`scene-thumbnail ${sceneClasses[scene]}`} /><strong>{t[scene]}</strong></button>)}</div></div></aside>
        <section className="canvas-panel" aria-label={t.canvasLabel}>{previewItem && groupRecord ? <>
          {/* 预览某张候选：只读展示，选定后才成为结果版本；编辑稿保持不变。 */}
          <div className="canvas-toolbar"><span>{c.previewing(previewItem.index + 1)} · {t[candidateSnapshot(groupRecord.request).scene]}</span><button type="button" className="subtle-button" onClick={() => setPreview(null)}>{c.backToDraft}</button></div>
          <div className="canvas-space"><div className="editor-stage completed-stage">{previewImage ? <BlobImage blob={previewImage.blob} alt={c.previewing(previewItem.index + 1)} width={1024} height={1024} /> : <div className="stage-loading">{t.loadingCanvas}</div>}</div></div>
          <div className="canvas-caption">{c.previewing(previewItem.index + 1)}</div></> : <>
          <div className="canvas-toolbar"><span>{readonly ? `${c.viewResult} · ${t[displayDocument.scene]}` : t.draft}</span>{record.result ? <button type="button" className="subtle-button" disabled={!connected || !!pending} onClick={() => { try { replace({ ...current.current, view: readonly ? "draft" : "result" }); } catch(e) { report(e); } }}>{readonly ? c.draft : c.viewResult}</button> : null}</div>
          <div className="canvas-space">{readonly || !displayAssetId ? <div className="editor-stage completed-stage">{readonly && output ? <BlobImage blob={output.blob} alt={c.viewResult} width={1024} height={1024} /> : <div className="stage-loading">{readonly ? t.loadingCanvas : c.noSubject}</div>}</div> : <EditorCanvas document={record.document} asset={visibleAsset} guides={false} onPlacement={move} t={t} />}</div>
          <div className="canvas-caption">{readonly ? c.viewResult : t.canvasHint}</div></>}</section>
        <aside className="side-panel inspector-panel"><div className="panel-section"><h2>{t.composition}</h2><label className="size-label" htmlFor="internal-size">{t.scale}<output>{Math.round(displayDocument.placement.width * 100)}%</output></label>
          <input id="internal-size" type="range" className="size-slider" min={limits.min} max={limits.max} step="0.005" value={record.document.placement.width} disabled={readonly || !visibleAsset || !record.document.foregroundAssetId}
            onChange={e => { if (visibleAsset) move(resizePlacement(record.document.placement, Number(e.target.value), visibleAsset)); }} />
          <button type="button" className="sample-button" disabled={readonly || !visibleAsset} onClick={() => { if (visibleAsset) move(fitPlacement(visibleAsset)); }}>{t.reset}</button><p className="control-help">{c.reuse}</p></div>
          <div className="panel-section output-section"><h2>{t.output}</h2><p className="control-help">1024 × 1024 · PNG</p></div>
          <div className="generate-section">{groupOffer ? <div role="region" aria-label={c.candidates}><p>{c.candidateOffer(groupOffer.units, groupOffer.count, groupOffer.unitUnits, groupOffer.availableCredits)}</p>
            <p className="control-help">{groupOffer.availableCredits < groupOffer.units ? (locale === 'zh' ? '可用积分不足，请前往账户补充积分。' : 'Insufficient credits. Add credits from your account.') : null}</p><p className="control-help">{c.candidateRule}</p>
            <button type="button" className="primary-button" onClick={acceptGroupOffer} disabled={execution !== 'online' || groupOffer.availableCredits < groupOffer.units}>{c.candidateConfirm(groupOffer.units)}</button>
            <button type="button" className="sample-button" onClick={() => setGroupOffer(undefined)}>{locale === 'zh' ? '返回编辑' : 'Back to editing'}</button></div> :
            previewItem?.result ? <div role="region" aria-label={c.previewing(previewItem.index + 1)}><button type="button" className="primary-button" onClick={chooseCandidate}><Check size={17} />{c.choose}</button>
            <button type="button" className="secondary-button" disabled={!previewImage} onClick={() => { if (previewImage) downloadPng(previewImage.blob, `miaocut-candidate-${previewItem.index + 1}-${previewItem.result!.assetId}.png`); }}><Download size={17} />{c.downloadCandidate}</button></div> :
            offer?<div role="region" aria-label={locale==='zh'?'确认本次用量':'Confirm credits'}><p>{locale==='zh'?`本次 ${offer.units} 积分 · 当前可用 ${offer.availableCredits} 积分`:`${offer.units} credits · ${offer.availableCredits} available`}</p><p className="control-help">{offer.availableCredits<offer.units?(locale==='zh'?'可用积分不足，请前往账户补充积分。':'Insufficient credits. Add credits from your account.'):null}</p><p className="control-help">{locale==='zh'?'最终失败或取消排队后按账本释放预留积分。过期积分不会重新变为有效积分。':'A final failure or queued cancellation releases the reservation. Expired credits retain their expiry.'}</p><button type="button" className="primary-button" onClick={acceptOffer} disabled={execution!=='online'||offer.availableCredits<offer.units}>{locale==='zh'?`确认生成 · ${offer.units} 积分`:`Confirm · ${offer.units} credits`}</button><button type="button" className="sample-button" onClick={()=>setOffer(undefined)}>{locale==='zh'?'返回编辑':'Back to editing'}</button></div>:readonly && output ? <button type="button" className="primary-button" onClick={() => downloadPng(output.blob, `miaocut-product-${record.result!.assetId}.png`)}><Download size={17} />{t.download}</button> :
            <><button type="button" className="primary-button" disabled={!connected || execution!=='online' || pricing?.admissionOpen===false || !!pending || quoting || uploadProgress !== null || !record.document.foregroundAssetId} onClick={() => void generate("product")}>{pending||quoting ? <LoaderCircle size={17} className="spinner" /> : null}{pending ? c.waiting : pricing?`${c.generate} · ${pricing.product}${locale==='zh'?' 积分':' credits'}`:c.generate}</button>
            {candidatesEnabled && pricing ? <button type="button" className="secondary-button" disabled={!connected || execution !== 'online' || pricing.admissionOpen === false || quoting || uploadProgress !== null || !record.document.foregroundAssetId || candidatesBusy} onClick={() => void generateCandidates()}>
              {candidatesBusy ? <><LoaderCircle size={15} className="spinner" />{c.candidateBusy}</> : `${c.candidates} · ${CANDIDATE_COUNT * pricing.product}${locale === 'zh' ? ' 积分' : ' credits'}`}</button> : null}</>}<p className="control-help">{pricing?(locale==='zh'?'以确认的报价为准':'The confirmed quote applies'):c.mode}</p></div></aside>
      </div>
      {groupView && groupRecord && groupMatches(groupView, groupRecord) ? <CandidateStrip group={groupView} images={candidateImages} preview={preview} selectedAssetId={record.result?.assetId}
        locale={locale} busy={groupBusy} onPreview={index => setPreview(current => current === index ? null : index)} onStop={() => void groupAction("stop")} onResume={() => void groupAction("resume")} /> : null}
      <div className="job-status" role="status" aria-live="polite"><span className="job-status-leading">{pending || uploadProgress !== null ? <LoaderCircle size={15} className="spinner" /> : <Check size={15} />}{status}</span>
        {billingMessage?<span>{billingMessage}</span>:null}
        {pending?.jobId && currentJob?.state === "queued" ? <button type="button" onClick={() => void cancel()}>{c.cancel}</button> : null}</div>
      <footer className="workspace-footer"><a href="/workbench/product">{c.returnDemo}</a><span>{record.result ? c.viewResult : c.noResult}</span></footer>
      {comparisonId&&connected?<>
        {record.result&&compositionKey(record.document)!==compositionKey(record.result.document)?<p className="control-help">{locale==='zh'?'下方对比使用上次完成结果的构图，当前编辑稿保持不变。':'The comparison uses the completed result’s layout; your current draft is unchanged.'}</p>:null}
        <SceneComparison document={comparisonDocument} foreground={asset?.id===comparisonId?asset:savedForeground?.id===comparisonId?savedForeground:undefined} ai={output?.blob} locale={locale}/>
      </>:null}
    </main></div>;
}
