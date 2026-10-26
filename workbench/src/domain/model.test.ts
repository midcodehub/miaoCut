import test from "node:test";
import assert from "node:assert/strict";
import type { DemoJob, LocalAsset, WorkspaceState } from "./contracts";
import { busy, createDemoJob, emptyWorkspace, fitPlacement, MAX_RESULTS, movePlacement, reducer, resizePlacement, validWorkspace } from "./model";

function asset(id = "sample", transparent = true): LocalAsset {
  return { id, name: `${id}.png`, blob: new Blob(["fixture"], { type: "image/png" }),
    width: 800, height: 600, bounds: { x: 100, y: 200, width: 600, height: 300 }, transparent, origin: "upload" };
}
function workspace(): WorkspaceState { return reducer(emptyWorkspace("doc"), { type: "asset", asset: asset() }); }
function start(state: WorkspaceState, id = "job"): [WorkspaceState, DemoJob] {
  const job = createDemoJob(state, id, 1000)!;
  assert.ok(job);
  return [reducer(state, { type: "start", job }), job];
}
function complete(state: WorkspaceState, job: DemoJob): WorkspaceState {
  return reducer(state, { type: "complete", id: job.id, result: { id: `result-${job.id}`, jobId: job.id,
    mode: "demo", createdAt: 5000, snapshot: structuredClone(job.snapshot), png: new Blob(["PNG"], { type: "image/png" }) } });
}

test("opaque uploads stay unsegmented and cannot create a demo generation", () => {
  const state = reducer(workspace(), { type: "asset", asset: asset("photo", false) });
  assert.equal(state.document.foregroundAssetId, undefined);
  assert.equal(createDemoJob(state, "job", 1000), undefined);
  assert.equal(state.results.length, 0);
});

test("a job freezes source, placement and scene independently of the editable document", () => {
  const [pending, job] = start(workspace());
  let state = pending;
  state = reducer(state, { type: "scene", scene: "wood" });
  state = reducer(state, { type: "placement", placement: movePlacement(state.document.placement, .03, .1) });
  assert.notDeepEqual(job.snapshot.placement, state.document.placement);
  state = reducer(state, { type: "asset", asset: asset("replacement") });
  assert.equal(job.snapshot.scene, "marble");
  assert.equal(job.request.scene, "marble");
  assert.equal(job.snapshot.sourceAssetId, "sample");
  assert.ok(state.assets.some(a => a.id === "sample"), "running job retains its source");
  state = complete(state, job);
  assert.equal(state.view, "draft");
  assert.equal(state.document.sourceAssetId, "replacement");
  assert.equal(state.results[0].snapshot.sourceAssetId, "sample");
  assert.ok(validWorkspace(state));
});

test("an unchanged draft selects its completed result; continuing edits creates a new revision", () => {
  const [pending, job] = start(workspace());
  const state = complete(pending, job);
  assert.equal(state.view, "result-job");
  const edited = reducer(state, { type: "edit_result", id: state.view });
  assert.equal(edited.view, "draft");
  assert.equal(edited.document.revision, state.document.revision + 1);
  assert.equal(edited.document.id, "doc");
  assert.deepEqual(edited.document.placement, job.snapshot.placement);
});

test("duplicate starts and completions are idempotent, stale callbacks cannot complete another job", () => {
  const [pending, job] = start(workspace());
  assert.equal(createDemoJob(pending, "second", 1000), undefined);
  assert.equal(reducer(pending, { type: "start", job: { ...job, id: "second" } }), pending);
  assert.equal(complete(pending, { ...job, id: "wrong" }), pending);
  const done = complete(pending, job);
  assert.equal(complete(done, job), done);
  assert.equal(done.results.length, 1);
});

test("cancelled and failed jobs cannot publish a late result", () => {
  const [pending, job] = start(workspace());
  for (const terminal of [reducer(pending, { type: "cancel" }), reducer(pending, { type: "fail", id: job.id })]) {
    assert.equal(busy(terminal.job), false);
    assert.equal(complete(terminal, job), terminal);
    assert.equal(terminal.results.length, 0);
  }
});

test("portrait and landscape assets resize proportionally and remain inside the canvas", () => {
  for (const bounds of [{ x: 0, y: 0, width: 600, height: 300 }, { x: 0, y: 0, width: 50, height: 1000 }]) {
    const source = { bounds };
    let rect = fitPlacement(source);
    for (const width of [-10, .15, 10]) {
      rect = resizePlacement(rect, width, source);
      rect = movePlacement(rect, -100, 100);
      assert.ok(Math.abs(rect.width / rect.height - bounds.width / bounds.height) < 1e-10);
      assert.ok(rect.x >= .019999 && rect.y >= .019999);
      assert.ok(rect.x + rect.width <= .980001 && rect.y + rect.height <= .980001);
    }
  }
});

test("history is bounded, selected old results survive completion, and unreferenced sources are pruned", () => {
  let state = workspace();
  let oldest = "";
  for (let i = 0; i < MAX_RESULTS + 3; i++) {
    state = reducer(state, { type: "asset", asset: asset(`source-${i}`) });
    const [pending, job] = start(state, `job-${i}`);
    state = pending;
    if (i === 0) oldest = `result-${job.id}`;
    else state = reducer(state, { type: "view", id: oldest });
    state = complete(state, job);
    assert.ok(state.results.length <= MAX_RESULTS);
    assert.ok(state.results.some(r => r.id === oldest));
    assert.equal(state.results[0].sequence, i + 1);
    assert.ok(validWorkspace(state));
  }
  assert.equal(state.view, oldest);
  assert.equal(state.assets.length, MAX_RESULTS);
  assert.ok(!state.assets.some(a => a.id === "source-1"));
});

test("refresh data validates complete jobs, active jobs and empty drafts; rejects corrupt records", () => {
  const [pending, job] = start(workspace());
  const done = complete(pending, job);
  for (const state of [emptyWorkspace(), workspace(), pending, done]) assert.ok(validWorkspace(structuredClone(state)));
  const malformed: unknown[] = [null, {}, { ...pending, assets: [null] }, { ...pending, assets: [] },
    { ...pending, view: "missing" }, { ...done, results: [null] },
    { ...pending, job: { ...job, request: { ...job.request, scene: "wood" } } },
    { ...pending, document: { ...pending.document, placement: { width: .5, height: .5 } } }];
  for (const value of malformed) assert.equal(validWorkspace(value), false);
});
