import type { ProductDocument } from "./contracts";
import type { ServiceGroup, ServiceGroupItem, ServiceGroupItemState, ServiceGroupRequest } from "./service-contracts";

/** 四候选：同一构图由服务端固定 4 个不同 seed，逐张生成、逐张结算。 */
export const CANDIDATE_COUNT = 4;
const IN_PROGRESS: ServiceGroupItemState[] = ["queued", "leased", "verifying", "settling"];
const TERMINAL: ServiceGroupItemState[] = ["succeeded", "failed", "cancelled"];

/** 用当前编辑稿生成候选组请求。没有提取好的主体时返回 null，页面不提供生成入口。 */
export function candidateRequest(document: ProductDocument, requestId: string, count = CANDIDATE_COUNT): ServiceGroupRequest | null {
  if (!document.sourceAssetId || !document.foregroundAssetId) return null;
  return { version: 1, requestId, kind: "candidates", count, item: {
    documentId: document.id, documentRevision: document.revision, sourceAssetId: document.sourceAssetId,
    foregroundAssetId: document.foregroundAssetId, scene: document.scene, canvas: { ...document.canvas }, placement: { ...document.placement } } };
}

/** 候选对应的构图快照。结果只挂到发起时的编辑稿版本，用户之后的修改不会改变它。 */
export function candidateSnapshot(request: ServiceGroupRequest): ProductDocument {
  const item = request.item;
  return { id: item.documentId, revision: item.documentRevision, sourceAssetId: item.sourceAssetId, foregroundAssetId: item.foregroundAssetId,
    scene: item.scene, canvas: { ...item.canvas }, placement: { ...item.placement } };
}

export const itemInProgress = (item: ServiceGroupItem) => IN_PROGRESS.includes(item.state);

/**
 * 组是否还会自己变化，用来决定要不要继续轮询：有执行中的项，或组仍在运行且还有没结束的项。
 * 暂停（等待积分）且没有执行中的项时不会再变化，要等用户补充积分后点“继续”。
 */
export function groupActive(group: ServiceGroup): boolean {
  if (group.items.some(itemInProgress)) return true;
  return group.status === "running" && group.items.some(item => !TERMINAL.includes(item.state));
}

/** 组还没结束时可以“停止剩余候选”。 */
export const groupStoppable = (group: ServiceGroup) => group.status === "running" || group.status === "paused";

export function groupCounts(group: ServiceGroup) {
  const count = (states: ServiceGroupItemState[]) => group.items.filter(item => states.includes(item.state)).length;
  return { done: count(["succeeded"]), running: count(IN_PROGRESS), waiting: count(["waiting", "awaiting_credits"]), stopped: count(["failed", "cancelled"]) };
}

/** 服务端返回的组必须对应本地记录的那次确认，避免把其他组的结果挂到当前文档上。 */
export function groupMatches(group: ServiceGroup, record: { groupId: string; request: ServiceGroupRequest }) {
  return group.groupId === record.groupId && group.request?.requestId === record.request.requestId &&
    group.count === record.request.count && Array.isArray(group.items) && group.items.length === record.request.count &&
    group.items.every((item, index) => item.index === index);
}
