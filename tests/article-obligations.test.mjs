import test from "node:test";
import assert from "node:assert/strict";
import { assessArticleObligations, concentrationOf } from "../src/article-obligations.mjs";
import { assess } from "../src/rules.mjs";
import { ARTICLE_KNOWLEDGE, ARTICLE_THRESHOLDS } from "../src/generated-article-knowledge.mjs";
import fs from "node:fs";

const component = {
  id:"part-A", massGrams:1000, annualUnits:1000000, allSubstancesChecked:"yes",
  substances:[{
    substanceId:"SYNTHETIC-SVHC-A", name:"Synthetic fixture only", candidateList:"yes",
    retainedMassGrams:2, referenceBasis:"constituent_article", evidenceIds:["SUPPLIER-DOC-01"],
    intendedRelease:"no", registeredForUse:"no", exposureExcluded:"no",
    recipientInstructionsProvided:"no", preListingOnly:"no"
  }]
};
const context = {
  actorRole:"producer",placedOnEUMarket:"yes",allComponentsChecked:"yes",
  assessmentDate:"2026-11-12",
  candidateListSnapshot:{asOf:"2026-11-12",
    sourceUrl:"https://echa.europa.eu/candidate-list-table", evidenceId:"ECHA-LIST-01"}
};
const fixture = (mod = {}) => ({
  articleAssessment:{...context,...(mod.articleAssessment||{})},
  articleComponents:mod.articleComponents ?? [structuredClone(component)]
});
const status = (key,mod = {}) => assessArticleObligations(fixture(mod))[key].status;
const withSubstance = (edits,componentEdits={}) => {
  const c=structuredClone(component);
  Object.assign(c,componentEdits);
  Object.assign(c.substances[0],edits);
  return c;
};

test("Article 33, SCIP and Article 7(2) independent positive pathways", () => {
  const r=assessArticleObligations(fixture());
  assert.equal(r.article33.status,"REQUIRED");
  assert.equal(r.scip.status,"REQUIRED");
  assert.equal(r.article7_2.status,"REQUIRED");
  assert.equal(r.article7_1.status,"NOT_REQUIRED");
});
test("strictly above 0.1% w/w, not at threshold", () => {
  const c=withSubstance({retainedMassGrams:1});
  assert.equal(status("article33",{articleComponents:[c]}),"NOT_REQUIRED");
  assert.equal(status("scip",{articleComponents:[c]}),"NOT_REQUIRED");
  assert.equal(status("article7_2",{articleComponents:[c]}),"NOT_REQUIRED");
  assert.equal(concentrationOf(c.substances[0],c).percent,0.1);
});
test("an exceedance in a small constituent article is not diluted by product mass", () => {
  const c=withSubstance({retainedMassGrams:0.02},{massGrams:10});
  assert.equal(status("article33",{articleComponents:[c]}),"REQUIRED");
});
test("missing Candidate List snapshot prohibits negative obligation decisions", () => {
  const noList=withSubstance({candidateList:"no"});
  const r=assessArticleObligations(fixture({articleAssessment:{candidateListSnapshot:null},
    articleComponents:[noList]}));
  assert.equal(r.article33.status,"REVIEW_REQUIRED");
  assert.equal(r.scip.status,"REVIEW_REQUIRED");
});
test("Candidate List snapshot must match assessment date", () => {
  const r=assessArticleObligations(fixture({articleAssessment:{assessmentDate:"2026-11-11"}}));
  assert.equal(r.article33.status,"REVIEW_REQUIRED");
});
test("incomplete component coverage blocks negative decision", () => {
  const c=withSubstance({retainedMassGrams:1});
  assert.equal(status("article33",{articleComponents:[c],articleAssessment:{allComponentsChecked:"unknown"}}),"REVIEW_REQUIRED");
});
test("positive Article 33 trigger remains valid despite other incomplete components", () => {
  const c=withSubstance({}, {allSubstancesChecked:"unknown"});
  assert.equal(status("article33",{articleComponents:[c]}),"REQUIRED");
});
test("wrong constituent reference mass cannot make a legal negative", () => {
  const c=withSubstance({retainedMassGrams:0.01,referenceMassGrams:100000});
  assert.equal(status("article33",{articleComponents:[c]}),"REVIEW_REQUIRED");
});
test("assembled joining/coating basis requires documentation", () => {
  const c=withSubstance({referenceBasis:"joining_or_coating_complex_object",
    referenceMassGrams:3000,retainedMassGrams:4});
  assert.equal(status("article33",{articleComponents:[c]}),"REVIEW_REQUIRED");
});
test("documented joining scenario uses assembled reference mass", () => {
  const c=withSubstance({referenceBasis:"joining_or_coating_complex_object",
    referenceMassGrams:3000,retainedMassGrams:4,
    incorporationStage:"joined_or_coated_assembled_object",referenceEvidenceId:"DRAWING-001"});
  assert.equal(status("article33",{articleComponents:[c]}),"REQUIRED");
});
test("notification needs above one tonne/year, not exactly one", () => {
  const c=withSubstance({retainedMassGrams:2},{annualUnits:500000});
  assert.equal(status("article7_2",{articleComponents:[c]}),"NOT_REQUIRED");
});
test("missing annual quantities prevents negative Article 7(2)", () => {
  const c=withSubstance({}, {annualUnits:undefined});
  assert.equal(status("article7_2",{articleComponents:[c]}),"REVIEW_REQUIRED");
  assert.equal(status("article33",{articleComponents:[c]}),"REQUIRED");
});
test("Article 7(2) only covers relevant qualifying articles", () => {
  const a=withSubstance({retainedMassGrams:2}, {id:"part-A",annualUnits:100000});
  const b=withSubstance({retainedMassGrams:0.5},{id:"part-B",annualUnits:5000000});
  assert.equal(status("article7_2",{articleComponents:[a,b]}),"NOT_REQUIRED");
});
test("registered-for-use exemption does not eliminate Article 33", () => {
  const c=withSubstance({registeredForUse:"yes"});
  assert.equal(status("article7_2",{articleComponents:[c]}),"NOT_REQUIRED");
  assert.equal(status("article33",{articleComponents:[c]}),"REQUIRED");
});
test("pre-Candidate List production-only scenario is not an automatic notification", () => {
  const c=withSubstance({preListingOnly:"yes"});
  assert.equal(status("article7_2",{articleComponents:[c]}),"NOT_REQUIRED");
});
test("exclusion of exposure without recipient instructions cannot be assumed", () => {
  const c=withSubstance({exposureExcluded:"yes",recipientInstructionsProvided:"no"});
  assert.equal(status("article7_2",{articleComponents:[c]}),"REVIEW_REQUIRED");
});
test("documented exposure exclusion and instructions can exempt notification", () => {
  const c=withSubstance({exposureExcluded:"yes",recipientInstructionsProvided:"yes"});
  assert.equal(status("article7_2",{articleComponents:[c]}),"NOT_REQUIRED");
});
test("mixed exemptions per substance require review", () => {
  const a=withSubstance({registeredForUse:"yes"},{id:"part-A"});
  const b=withSubstance({registeredForUse:"no"},{id:"part-B"});
  assert.equal(status("article7_2",{articleComponents:[a,b]}),"REVIEW_REQUIRED");
});
test("distributor has no Article 7(2) notifier role, but can have SCIP", () => {
  assert.equal(status("article7_2",{articleAssessment:{actorRole:"distributor"}}),"NOT_APPLICABLE");
  assert.equal(status("scip",{articleAssessment:{actorRole:"distributor"}}),"REQUIRED");
});
test("consumer-only retailer is outside SCIP but Article 33 still applies", () => {
  assert.equal(status("scip",{articleAssessment:{actorRole:"retailer_exclusively_consumer"}}),"NOT_APPLICABLE");
  assert.equal(status("article33",{articleAssessment:{actorRole:"retailer_exclusively_consumer"}}),"REQUIRED");
});
test("Article 7(1) considers full retained substance amount, not expected release mass", () => {
  const c=withSubstance({candidateList:"no", intendedRelease:"yes",retainedMassGrams:2});
  assert.equal(status("article7_1",{articleComponents:[c]}),"REQUIRED");
  assert.equal(status("article33",{articleComponents:[c]}),"NOT_REQUIRED");
});
test("Article 7(1) is not dependent on Candidate List snapshot", () => {
  const c=withSubstance({candidateList:"no", intendedRelease:"no"});
  assert.equal(status("article7_1",{articleAssessment:{candidateListSnapshot:null},articleComponents:[c]}),"NOT_REQUIRED");
});
test("Article 7(1) registered-for-use exemption handled separately", () => {
  const c=withSubstance({candidateList:"no", intendedRelease:"yes",registeredForUse:"yes"});
  assert.equal(status("article7_1",{articleComponents:[c]}),"NOT_REQUIRED");
});
test("unknown intended-release status blocks negative Article 7(1)", () => {
  const c=withSubstance({intendedRelease:"unknown",registeredForUse:"unknown"});
  assert.equal(status("article7_1",{articleComponents:[c]}),"REVIEW_REQUIRED");
});
test("Article 33 remains separate from ordinary article SDS conclusion", () => {
  const a=assess({productType:"article", classification:{function:"Provide mechanical support",shapeDominates:"yes"},
    pyrotechnicVehicle:"no", separateChemicalPayload:"no", candidateListPresent:"no",
    allComponentsChecked:"yes", ...fixture()});
  assert.equal(a.sds.status,"NOT_REQUIRED");
  assert.equal(a.article33.status,"REQUIRED");
  assert.equal(a.article7_2.status,"REQUIRED");
  assert.equal(a.scip.status,"REQUIRED");
  assert.ok(a.audit.knowledgeVersion);
});
test("contradictory article classification blocks all article obligations", () => {
  const a=assess({productType:"article", classification:{function:"Deliver chemical",shapeDominates:"no"},
    pyrotechnicVehicle:"no", separateChemicalPayload:"no", ...fixture()});
  assert.equal(a.sds.status,"REVIEW_REQUIRED");
  assert.equal(a.article33.status,"REVIEW_REQUIRED");
  assert.equal(a.article7_1.status,"REVIEW_REQUIRED");
  assert.equal(a.scip.status,"REVIEW_REQUIRED");
});
test("rule catalog threshold and bindings are canonical", () => {
  const source=JSON.parse(fs.readFileSync(new URL("../knowledge/eu-articles-llm-rules.json",import.meta.url)));
  assert.deepEqual(ARTICLE_KNOWLEDGE.thresholds,source.thresholds);
  assert.deepEqual(ARTICLE_KNOWLEDGE.fact_bindings,source.fact_bindings);
  assert.deepEqual(ARTICLE_KNOWLEDGE.rules.map(r=>r.id),source.rules.map(r=>r.id));
  assert.equal(ARTICLE_THRESHOLDS.candidate_list_w_w_percent.operator,">");
  assert.equal(ARTICLE_THRESHOLDS.article_7_tonnes_per_year.value,1);
});
