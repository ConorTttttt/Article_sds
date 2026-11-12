import test from "node:test";
import assert from "node:assert/strict";
import { assess, mixtureRequestTriggers, RULESET_VERSION, SOURCES } from "../src/rules.mjs";

const article = {
  productType: "article", pyrotechnicVehicle: "no", separateChemicalPayload: "no",
  candidateListPresent: "no", allComponentsChecked: "yes", intendedRelease: "no"
};
const substance = {
  productType: "substance", clpHazardous: "no", pbtOrVpVb: "no",
  substanceCandidateList: "no", offeredToPublic: "no", downstreamRequest: "no"
};
const mixture = {
  productType: "mixture", clpHazardous: "no", mixturePhysical: "nongas",
  offeredToPublic: "no", downstreamRequest: "no",
  allMixtureIngredientsChecked: "yes",
  ingredients: [{ name: "A", percent: "1", category: "none" }]
};
const status = input => assess(input).sds.status;
const info = input => assess(input).article33.status;
test("ordinary article does not require Article 31 SDS", () => assert.equal(status(article), "NOT_REQUIRED"));
test("ordinary article can independently trigger Article 33", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: "0.15" }), "REQUIRED"));
test("Article 33 strict above-0.1 threshold", () => {
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: "0.1" }), "NOT_REQUIRED");
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: "0.100001" }), "REQUIRED");
});
test("Article 33 threshold is per constituent article, not total product", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: ".25" }), "REQUIRED"));
test("candidate substance unknown does not produce a negative Article 33 conclusion", () =>
  assert.equal(info({ ...article, candidateListPresent: "unknown", allComponentsChecked: "no" }), "REVIEW_REQUIRED"));
test("unverified other article components mean review", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: ".05", allComponentsChecked: "no" }), "REVIEW_REQUIRED"));
test("missing Article 33 concentration means review", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", maxComponentSvhcPercent: "" }), "REVIEW_REQUIRED"));
test("vehicle pyrotechnic professional-user exception", () =>
  assert.equal(status({ ...article, pyrotechnicVehicle: "yes", professionalRecipient: "yes" }), "REQUIRED"));
test("vehicle pyrotechnic consumer supply differs", () =>
  assert.equal(status({ ...article, pyrotechnicVehicle: "yes", professionalRecipient: "no" }), "NOT_REQUIRED_FOR_THIS_SUPPLY"));
test("unknown pyrotechnic status requires review", () =>
  assert.equal(status({ ...article, pyrotechnicVehicle: "unknown" }), "REVIEW_REQUIRED"));
test("separate chemical payload requires independent assessment", () =>
  assert.equal(status({ ...article, separateChemicalPayload: "yes" }), "REVIEW_REQUIRED"));
test("unknown chemical payload requires review", () =>
  assert.equal(status({ ...article, separateChemicalPayload: "unknown" }), "REVIEW_REQUIRED"));
test("article plus separate mixture requires review", () =>
  assert.equal(status({ productType: "combination" }), "REVIEW_REQUIRED"));
test("hazardous substance requires SDS for B2B", () =>
  assert.equal(status({ ...substance, clpHazardous: "yes" }), "REQUIRED"));
test("PBT/vPvB substance requires SDS", () =>
  assert.equal(status({ ...substance, pbtOrVpVb: "yes" }), "REQUIRED"));
test("Candidate List substance requires SDS", () =>
  assert.equal(status({ ...substance, substanceCandidateList: "yes" }), "REQUIRED"));
test("confirmed negative substance facts produce no Article 31 trigger", () =>
  assert.equal(status(substance), "NOT_REQUIRED"));
test("unknown substance classification cannot create negative assessment", () =>
  assert.equal(status({ ...substance, clpHazardous: "unknown" }), "REVIEW_REQUIRED"));
test("public supply sufficient info and no downstream request excludes auto-delivery", () =>
  assert.equal(status({ ...substance, clpHazardous: "yes", offeredToPublic: "yes", publicInformationSufficient: "yes", downstreamRequest: "no" }), "NOT_REQUIRED_FOR_THIS_SUPPLY"));
test("inadequate public safety information cannot invoke public exception", () =>
  assert.equal(status({ ...substance, clpHazardous: "yes", offeredToPublic: "yes", publicInformationSufficient: "no", downstreamRequest: "no" }), "REQUIRED"));
test("downstream request overrides public supply exception", () =>
  assert.equal(status({ ...substance, clpHazardous: "yes", offeredToPublic: "yes", publicInformationSufficient: "yes", downstreamRequest: "yes" }), "REQUIRED"));
test("unknown public exception facts do not create certainty", () =>
  assert.equal(status({ ...substance, clpHazardous: "yes", offeredToPublic: "yes", publicInformationSufficient: "unknown" }), "REVIEW_REQUIRED"));
test("hazardous mixture requires SDS", () =>
  assert.equal(status({ ...mixture, clpHazardous: "yes" }), "REQUIRED"));
test("non-gaseous health-hazard ingredient exactly 1% triggers on request", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: "1", category: "ordinary_hazard" }] }), "REQUIRED_ON_REQUEST"));
test("non-gaseous health-hazard ingredient below 1% does not meet screened threshold", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: ".999", category: "ordinary_hazard" }] }), "NOT_REQUIRED"));
test("gaseous health-hazard ingredient exactly 0.2% triggers on request", () =>
  assert.equal(status({ ...mixture, mixturePhysical: "gas", ingredients: [{ name: "B", percent: ".2", category: "ordinary_hazard" }] }), "REQUIRED_ON_REQUEST"));
test("special Article 31(3)(b) ingredient exactly 0.1% triggers on request", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: ".1", category: "special_31_3b" }] }), "REQUIRED_ON_REQUEST"));
test("Union workplace exposure limit ingredient triggers on request", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: ".0001", category: "union_oel" }] }), "REQUIRED_ON_REQUEST"));
test("ED2 note can trigger on request", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: ".1", category: "ed2" }] }), "REQUIRED_ON_REQUEST"));
test("explicit recipient request changes on-request status to required", () =>
  assert.equal(status({ ...mixture, downstreamRequest: "yes", ingredients: [{ name: "B", percent: "2", category: "ordinary_hazard" }] }), "REQUIRED"));
test("incomplete ingredients must not be interpreted as negative", () =>
  assert.equal(status({ ...mixture, allMixtureIngredientsChecked: "unknown", ingredients: [{ name: "A", percent: ".001", category: "ordinary_hazard" }] }), "REVIEW_REQUIRED"));
test("positive trigger survives incomplete composition", () => {
  const x = mixtureRequestTriggers({ ...mixture, allMixtureIngredientsChecked: "no", ingredients: [
    { name: "A", percent: "1", category: "ordinary_hazard" }, { name: "B", percent: "", category: "unknown" }
  ] });
  assert.equal(x.matched.length, 1);
});
test("unassessed category fails safely", () =>
  assert.equal(status({ ...mixture, ingredients: [{ name: "B", percent: "3", category: "unknown" }] }), "REVIEW_REQUIRED"));
test("unknown product type requires review", () => assert.equal(status({ productType: "unknown" }), "REVIEW_REQUIRED"));
test("rule evaluation is exactly reproducible", () => {
  const a = assess({ ...article, intendedRelease: "yes" });
  const b = assess({ ...article, intendedRelease: "yes" });
  assert.deepEqual(a, b);
  assert.equal(a.rulesetVersion, RULESET_VERSION);
});
test("every cited rule exists and has a legal-source URL", () => {
  for (const obj of [assess(article).sds, assess(article).article33, assess(substance).sds,
    assess({ ...mixture, ingredients: [{ name: "B", percent: ".1", category: "ed2" }] }).sds]) {
    for (const rule of obj.rules) assert.match(SOURCES[rule]?.url ?? "", /^https:\/\//);
  }
});
