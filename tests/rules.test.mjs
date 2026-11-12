import test from "node:test";
import assert from "node:assert/strict";
import { assess, mixtureRequestTriggers, RULESET_VERSION, SOURCES } from "../src/rules.mjs";
import { classifyObject, svhcConcentration } from "../src/echa-articles.mjs";

const article = {
  classification: { function: "To support an intended physical function", shapeDominates: "yes" },
  productType: "article", pyrotechnicVehicle: "no", separateChemicalPayload: "no",
  candidateListPresent: "no", allComponentsChecked: "yes", intendedRelease: "no"
};
const substance = {
  classification: { function: "To provide chemical action", shapeDominates: "no" },
  productType: "substance", clpHazardous: "no", clpLabellingDerogation: "no", pbtOrVpVb: "no",
  substanceCandidateList: "no", offeredToPublic: "no", downstreamRequest: "no"
};
const mixture = {
  classification: { function: "To provide chemical action", shapeDominates: "no" },
  productType: "mixture", clpHazardous: "no", clpLabellingDerogation: "no", mixturePhysical: "nongas",
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

test("CLP special labelling derogation can independently require SDS for substance", () =>
  assert.equal(status({ ...substance, clpLabellingDerogation: "yes" }), "REQUIRED"));
test("CLP special labelling derogation can independently require SDS for mixture", () =>
  assert.equal(status({ ...mixture, clpLabellingDerogation: "yes" }), "REQUIRED"));
test("unassessed CLP labelling derogation blocks negative substance result", () =>
  assert.equal(status({ ...substance, clpLabellingDerogation: "unknown" }), "REVIEW_REQUIRED"));
test("unassessed CLP labelling derogation blocks negative mixture result", () =>
  assert.equal(status({ ...mixture, clpLabellingDerogation: "unknown" }), "REVIEW_REQUIRED"));


// ECHA Guidance (2017), Figure 2: article determination, not a probabilistic classifier.
test("ECHA Figure 2 step 2 direct article outcome", () =>
  assert.equal(classifyObject({ function: "To write on paper", shapeDominates: "yes" }).status, "ARTICLE"));
test("ECHA Figure 2 step 2 direct chemical outcome", () =>
  assert.equal(classifyObject({ function: "To colour paper", shapeDominates: "no" }).status, "CHEMICAL"));
test("ECHA step 4 majority yes gives article-plus-chemical combination (printer cartridge)", () =>
  assert.equal(classifyObject({ function: "To bring ink onto paper", shapeDominates: "unknown",
    separableChemical: "yes", q4a: "yes", q4b: "yes", q4c: "yes" }).status, "COMBINATION"));
test("ECHA step 5 integral liquid can yield article (thermometer)", () =>
  assert.equal(classifyObject({ function: "To indicate temperature", shapeDominates: "unknown",
    separableChemical: "yes", q4a: "no", q4b: "no", q4c: "no",
    q5a: "yes", q5b: "yes", q5c: "yes" }).status, "ARTICLE"));
test("ECHA step 5 majority no yields combination", () =>
  assert.equal(classifyObject({ function: "To deliver chemical", shapeDominates: "unknown",
    separableChemical: "yes", q4a: "no", q4b: "no", q4c: "yes",
    q5a: "no", q5b: "no", q5c: "yes" }).status, "COMBINATION"));
test("ECHA step 6 predominant article indicators", () =>
  assert.equal(classifyObject({ function: "To enclose a parcel", shapeDominates: "unknown",
    separableChemical: "no", q6a: "yes", q6b: "yes", q6c: "yes", q6d: "no" }).status, "ARTICLE"));
test("ECHA step 6 predominant substance indicators", () =>
  assert.equal(classifyObject({ function: "To serve as feedstock", shapeDominates: "unknown",
    separableChemical: "no", q6a: "no", q6b: "no", q6c: "no", q6d: "yes" }).status, "CHEMICAL"));
test("ECHA step 6 tie means review, not a guessed article", () =>
  assert.equal(classifyObject({ function: "To serve a function", shapeDominates: "unknown",
    separableChemical: "no", q6a: "no", q6b: "yes", q6c: "no", q6d: "yes" }).status, "REVIEW_REQUIRED"));
test("No function prevents a classification even if a yes answer supplied", () =>
  assert.equal(classifyObject({ function: " ", shapeDominates: "yes" }).status, "REVIEW_REQUIRED"));
test("unconfirmed article definition cannot create SDS not-required conclusion", () =>
  assert.equal(status({ ...article, classification: { function: "Unknown", shapeDominates: "unknown" } }), "REVIEW_REQUIRED"));
test("classification contradiction triggers a review", () =>
  assert.equal(status({ ...article, classification: { function: "Deliver ink", shapeDominates: "no" } }), "REVIEW_REQUIRED"));
test("classification contradiction blocks positive Article 33 assertion", () =>
  assert.equal(info({ ...article, classification: { function: "Deliver ink", shapeDominates: "no" },
    candidateListPresent: "yes", maxComponentSvhcPercent: ".4" }), "REVIEW_REQUIRED"));
test("a classified chemical cannot be declared an article to avoid SDS", () =>
  assert.equal(status({ ...article, classification: { function: "Deliver ink", shapeDominates: "no" } }), "REVIEW_REQUIRED"));
test("retained SVHC mass ratio derives ECHA example 8 coating result of 0.15%", () =>
  assert.equal(svhcConcentration({basis: "constituent_article", svhcMassGrams: 7.5,
    referenceMassGrams: 5000}).percent, 0.15));
test("ECHA complex-object joining mixture reference uses the assembled mass", () =>
  assert.equal(Math.round(svhcConcentration({basis: "joining_or_coating_complex_object",
    svhcMassGrams: 200, referenceMassGrams: 63000}).percent * 100) / 100, 0.32));
test("Article 33 mass-based concentration triggers above 0.1%", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", svhcConcentrationMode: "mass",
    svhcBasis: "constituent_article", svhcMassGrams: "7.5", referenceMassGrams: "5000" }), "REQUIRED"));
test("Article 33 mass calculation exactly 0.1% is not above threshold", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", svhcConcentrationMode: "mass",
    svhcBasis: "constituent_article", svhcMassGrams: "1", referenceMassGrams: "1000" }), "NOT_REQUIRED"));
test("Article 33 rejects invalid component mass", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", svhcConcentrationMode: "mass",
    svhcBasis: "constituent_article", svhcMassGrams: "120", referenceMassGrams: "100" }), "REVIEW_REQUIRED"));
test("Article 33 rejects wrong reference basis", () =>
  assert.equal(info({ ...article, candidateListPresent: "yes", svhcConcentrationMode: "mass",
    svhcBasis: "whole_product_average", svhcMassGrams: "10", referenceMassGrams: "1000" }), "REVIEW_REQUIRED"));
test("concentration calculation is deterministic across repeats", () => {
  const facts = {basis: "constituent_article", svhcMassGrams: 0.12, referenceMassGrams: 10};
  assert.deepEqual(svhcConcentration(facts), svhcConcentration(facts));
});
