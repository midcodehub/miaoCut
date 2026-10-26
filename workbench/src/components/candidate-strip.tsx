"use client";

import { Check, LoaderCircle, Pause, Play, Square } from "lucide-react";
import type { LocalAsset, Locale } from "@/domain/contracts";
import type { ServiceGroup, ServiceGroupItem } from "@/domain/service-contracts";
import { groupCounts, groupStoppable } from "@/domain/candidates";
import { BlobImage } from "./blob-image";

const copy = {
  zh: {
    title: "候选", candidate: "候选", waiting: "等待中", requeued: "超时后重新排队", awaiting_credits: "等待积分", queued: "已排队", offline: "服务离线 · 排队中",
    leased: "正在生成", verifying: "正在保存", settling: "正在确认积分", succeeded: "已完成", expired: "排队超时 · 未扣积分", failed: "未完成 · 未扣积分",
    cancelled: "已停止 · 未扣积分", stop: "停止剩余候选", resume: "已补充积分，继续", selected: "已选定",
    insufficient: "可用积分不足，剩余候选已暂停，不会失败也不会超支。补充积分后点“继续”。",
    reservationFailed: "剩余候选暂时无法预留积分，请停止后重新生成。",
    stopHint: "停止后，排队中的候选释放积分；正在生成的那张会继续完成并结算。",
    summary: (c: ReturnType<typeof groupCounts>) => `完成 ${c.done} · 生成中 ${c.running} · 等待 ${c.waiting}${c.stopped ? ` · 未完成 ${c.stopped}` : ""}`,
    credits: (g: ServiceGroup) => `已扣 ${g.settledUnits} · 预留 ${g.heldUnits} / 预算 ${g.budgetUnits} 积分`,
  },
  en: {
    title: "Candidates", candidate: "Candidate", waiting: "Waiting", requeued: "Requeued after timeout", awaiting_credits: "Waiting for credits", queued: "Queued", offline: "Service offline · queued",
    leased: "Generating", verifying: "Saving", settling: "Confirming credits", succeeded: "Ready", expired: "Timed out · not charged", failed: "Not completed · not charged",
    cancelled: "Stopped · not charged", stop: "Stop remaining", resume: "Credits added, continue", selected: "Selected",
    insufficient: "Not enough credits. Remaining candidates are paused; nothing fails or overspends. Add credits, then continue.",
    reservationFailed: "Remaining candidates could not reserve credits. Stop and generate again.",
    stopHint: "Stopping releases queued candidates. The one being generated finishes and is charged.",
    summary: (c: ReturnType<typeof groupCounts>) => `${c.done} ready · ${c.running} running · ${c.waiting} waiting${c.stopped ? ` · ${c.stopped} not completed` : ""}`,
    credits: (g: ServiceGroup) => `${g.settledUnits} charged · ${g.heldUnits} reserved / ${g.budgetUnits} budget`,
  },
};

/** 每张候选的真实状态文案。只展示服务端给出的阶段，不估算进度。 */
function itemLabel(item: ServiceGroupItem, c: typeof copy.zh) {
  if (item.state === "waiting") return item.attempt > 0 ? c.requeued : c.waiting;
  if (item.state === "queued") return item.queue?.workerOnline === false ? c.offline : c.queued;
  if (item.state === "failed") return item.error === "job_expired" ? c.expired : c.failed;
  return c[item.state];
}

export function CandidateStrip({ group, images, preview, selectedAssetId, locale, busy, onPreview, onStop, onResume }: {
  group: ServiceGroup; images: Record<string, LocalAsset>; preview: number | null; selectedAssetId?: string; locale: Locale; busy: boolean;
  onPreview: (index: number) => void; onStop: () => void; onResume: () => void;
}) {
  const c = copy[locale], counts = groupCounts(group), stoppable = groupStoppable(group);
  return <section className="candidate-panel" aria-labelledby="candidate-title">
    <div className="candidate-heading"><div><h2 id="candidate-title">{c.title}</h2><p>{c.summary(counts)}</p></div><span>{c.credits(group)}</span></div>
    {group.status === "paused" ? <p className="candidate-notice" role="status">{group.pauseReason === "insufficient_credits" ? c.insufficient : c.reservationFailed}</p> : null}
    <div className="candidate-list">{group.items.map(item => {
      const image = item.result ? images[item.result.assetId] : undefined;
      const working = ["queued", "leased", "verifying", "settling"].includes(item.state);
      return <button type="button" key={item.index} disabled={!item.result} aria-pressed={preview === item.index}
        className={`candidate-tile ${preview === item.index ? "is-selected" : ""}`} onClick={() => onPreview(item.index)}
        aria-label={`${c.candidate} ${item.index + 1} — ${itemLabel(item, c)}`}>
        <span className="candidate-thumbnail">{image ? <BlobImage blob={image.blob} alt="" width={96} height={96} /> :
          <i className="candidate-state">{working ? <LoaderCircle size={17} className="spinner" /> : item.state === "awaiting_credits" ? <Pause size={16} /> : item.state === "succeeded" ? <LoaderCircle size={17} className="spinner" /> : null}</i>}
          {item.result && item.result.assetId === selectedAssetId ? <i className="result-selected" aria-label={c.selected}><Check size={11} /></i> : null}</span>
        <span className="candidate-info"><strong>{c.candidate} {item.index + 1}</strong><small>{itemLabel(item, c)}</small></span>
      </button>;
    })}</div>
    {stoppable ? <div className="candidate-actions">
      {group.status === "paused" && group.pauseReason === "insufficient_credits" ? <button type="button" className="subtle-button" disabled={busy} onClick={onResume}><Play size={14} />{c.resume}</button> : null}
      <button type="button" className="subtle-button" disabled={busy} onClick={onStop}><Square size={13} />{c.stop}</button>
      <p className="control-help">{c.stopHint}</p>
    </div> : null}
  </section>;
}
