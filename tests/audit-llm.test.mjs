import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { stableStringify, sha256Audit } from "../src/audit.mjs";
import { vetLLMProposals } from "../src/llm-fact-proposals.mjs";

test("canonical audit serialization is independent of key ordering", () => {
  assert.equal(stableStringify({b:{y:2,x:1},a:[{z:0,w:3}]}),
    stableStringify({a:[{w:3,z:0}],b:{x:1,y:2}}));
});
test("SHA256 audit digest matches standard SHA256 of canonical JSON", async () => {
  const input={version:2,b:{z:1},a:[0,2]};
  const expected=createHash("sha256").update(stableStringify(input)).digest("hex");
  assert.equal(await sha256Audit(input),expected);
});
test("LLM facts always require human review, even when well sourced", () => {
  const r=vetLLMProposals({schemaVersion:"llm-extraction-v1",proposals:[{
    path:"classification.function",certainty:"asserted",suggestedValue:"To support a load",
    sourceRef:"doc-1:p2",evidenceExcerpt:"The intended purpose of this bracket is to support a load."
  }]});
  assert.equal(r.errors.length,0);
  assert.equal(r.reviewQueue.length,1);
  assert.deepEqual(r.acceptedForDecision,[]);
  assert.equal(r.reviewQueue[0].reviewerRequired,true);
});
test("LLM cannot assert legal conclusion from documents", () => {
  const r=vetLLMProposals({schemaVersion:"llm-extraction-v1",proposals:[{
    path:"article33.status",certainty:"asserted",suggestedValue:"NOT_REQUIRED",
    sourceRef:"doc-1",evidenceExcerpt:"We have not tested this material."
  }]});
  assert.ok(r.errors.length>0);
});
test("LLM cannot make an Article 3(3) judgement", () => {
  const r=vetLLMProposals({schemaVersion:"llm-extraction-v1",proposals:[{
    path:"classification.shapeDominates",certainty:"asserted",suggestedValue:"yes",
    sourceRef:"doc-1",evidenceExcerpt:"The item has a defined shape."
  }]});
  assert.match(r.errors.join(";"),/reviewed legal judgement/);
});
test("Unknown data cannot be changed into an unproven negative", () => {
  const r=vetLLMProposals({schemaVersion:"llm-extraction-v1",proposals:[{
    path:"productType",certainty:"unknown",suggestedValue:"article",
    sourceRef:"doc-1",evidenceExcerpt:"No technical information was provided."
  }]});
  assert.match(r.errors.join(";"),/Unknown information/);
});
test("Malformed LLM packet produces no facts or decisions", () => {
  const r=vetLLMProposals({schemaVersion:"unknown",proposals:[]});
  assert.deepEqual(r.acceptedForDecision,[]);
  assert.ok(r.errors.length);
});
