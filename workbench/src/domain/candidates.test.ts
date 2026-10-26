import test from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace } from "./model";
import { candidateRequest, candidateSnapshot, groupActive, groupCounts, groupMatches, groupStoppable } from "./candidates";
import { validInternalDraft } from "./service-state";
import type { InternalDraft, ServiceGroup, ServiceGroupItemState } from "./service-contracts";

function document() {
  return { ...emptyWorkspace(crypto.randomUUID()).document, revision: 5, sourceAssetId: crypto.randomUUID(), foregroundAssetId: crypto.randomUUID() };
}
function group(states: ServiceGroupItemState[], status: ServiceGroup["status"] = "running"): ServiceGroup {
  const request = candidateRequest(document(), crypto.randomUUID())!;
  return { groupId: crypto.randomUUID(), kind: "candidates", request: { ...request, count: states.length }, count: states.length, status, pauseReason: null,
    budgetUnits: states.length * 2, unitUnits: 2, settledUnits: 0, heldUnits: 0, pricingVersion: "v1", createdAt: 0,
    items: states.map((state, index) => ({ index, attempt: 0, units: 2, state })) };
}

test("candidate request needs an extracted subject and snapshots the current composition", () => {
  const d = document();
  assert.equal(candidateRequest({ ...d, foregroundAssetId: undefined }, crypto.randomUUID()), null);
  const r = candidateRequest(d, crypto.randomUUID())!;
  assert.equal(r.count, 4); assert.equal(r.kind, "candidates"); assert.equal(r.item.documentRevision, 5);
  d.placement.x = 0.3; assert.notEqual(r.item.placement.x, 0.3, "later edits do not mutate the submitted snapshot");
  const snapshot = candidateSnapshot(r);
  assert.deepEqual({ ...snapshot, placement: r.item.placement }, { id: d.id, revision: 5, sourceAssetId: d.sourceAssetId, foregroundAssetId: d.foregroundAssetId,
    scene: d.scene, canvas: d.canvas, placement: r.item.placement });
});

test("group polling stops only when nothing can change without the user", () => {
  assert.equal(groupActive(group(["succeeded", "queued", "waiting", "waiting"])), true);
  assert.equal(groupActive(group(["succeeded", "succeeded", "succeeded", "failed"], "completed")), false);
  assert.equal(groupActive(group(["succeeded", "awaiting_credits", "awaiting_credits", "awaiting_credits"], "paused")), false, "waits for the user to add credits");
  assert.equal(groupActive(group(["succeeded", "leased", "awaiting_credits", "awaiting_credits"], "paused")), true, "an item still running keeps polling");
  assert.equal(groupActive(group(["leased", "cancelled", "cancelled", "cancelled"], "cancelled")), true, "a running item finishes after stop");
  assert.equal(groupStoppable(group(["queued"], "paused")), true); assert.equal(groupStoppable(group(["succeeded"], "completed")), false);
  assert.deepEqual(groupCounts(group(["succeeded", "leased", "awaiting_credits", "failed"])), { done: 1, running: 1, waiting: 1, stopped: 1 });
});

test("server groups must match the locally confirmed request before results attach", () => {
  const g = group(["queued", "queued", "waiting", "waiting"]), record = { groupId: g.groupId, request: g.request };
  assert.equal(groupMatches(g, record), true);
  assert.equal(groupMatches({ ...g, groupId: crypto.randomUUID() }, record), false);
  assert.equal(groupMatches({ ...g, items: g.items.slice(1) }, record), false);
  assert.equal(groupMatches(g, { ...record, request: { ...record.request, requestId: crypto.randomUUID() } }), false);
});

test("a stored candidate group survives refresh but corrupt or foreign records are rejected", () => {
  const d = document(), request = candidateRequest(d, crypto.randomUUID())!;
  const draft: InternalDraft = { version: 1, authUserId: crypto.randomUUID(), document: { ...d, revision: 7 }, view: "draft", group: { groupId: crypto.randomUUID(), request } };
  assert.ok(validInternalDraft(JSON.parse(JSON.stringify(draft))), "older revisions stay valid after further edits");
  for (const value of [
    { ...draft, group: { ...draft.group, groupId: "../x" } },
    { ...draft, group: { ...draft.group, request: { ...request, kind: "batch" } } },
    { ...draft, group: { ...draft.group, request: { ...request, count: 9 } } },
    { ...draft, group: { ...draft.group, request: { ...request, item: { ...request.item, documentId: crypto.randomUUID() } } } },
    { ...draft, group: { ...draft.group, request: { ...request, item: { ...request.item, documentRevision: 8 } } } },
    { ...draft, group: { ...draft.group, request: { ...request, item: { ...request.item, placement: { x: 0, y: 0, width: 2, height: 1 } } } } },
    { ...draft, group: null },
  ]) assert.equal(validInternalDraft(value), false);
});
