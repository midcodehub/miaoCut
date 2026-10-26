import test from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace } from "./model";
import { validInternalDraft } from "./service-state";
import type { InternalDraft } from "./service-contracts";

function draft(): InternalDraft {
  const document = { ...emptyWorkspace(crypto.randomUUID()).document, revision: 3, sourceAssetId: crypto.randomUUID() };
  return { version: 1, authUserId: crypto.randomUUID(), document, view: "draft", pending: { request: { version: 1, requestId: crypto.randomUUID(), kind: "segment",
    documentId: document.id, documentRevision: 3, sourceAssetId: document.sourceAssetId } } };
}
test("internal pending request survives JSON restoration with or without a known server job", () => {
  const d = draft(); assert.ok(validInternalDraft(JSON.parse(JSON.stringify(d))));
  d.pending!.quoteId = crypto.randomUUID();
  d.pending!.jobId = crypto.randomUUID(); d.document.revision++;
  assert.ok(validInternalDraft(JSON.parse(JSON.stringify(d))), "edits during a job do not invalidate its older snapshot");
});
test("corrupt local metadata cannot become an internal API submission or invalid canvas", () => {
  const d = draft();
  for (const value of [null, {}, { ...d, authUserId: undefined }, { ...d, document: { ...d.document, placement: {} } },
    { ...d, view: "result" }, { ...d, pending: {} },
    { ...d, pending: { ...d.pending, jobId: "../other" } },
    { ...d, pending: { ...d.pending, quoteId: "../other" } },
    { ...d, pending: { request: { ...d.pending!.request, sourceAssetId: crypto.randomUUID() } } }]) {
    assert.equal(validInternalDraft(value), false);
  }
});
