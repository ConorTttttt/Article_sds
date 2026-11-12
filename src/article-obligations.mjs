/**
 * Optional component-level deterministic screening for REACH Articles 7 and 33
 * and the later SCIP information duty. Never infer Candidate List membership:
 * each substance status is supplied and backed by a dated dataset assertion.
 * The 2017 ECHA guidance is used for Article 7/33 reference masses; SCIP
 * is based on later EU legislation and ECHA explanations.
 */
import { ARTICLE_THRESHOLDS, ARTICLE_KNOWLEDGE } from "./generated-article-knowledge.mjs";

export const ARTICLE_MODEL_VERSION = ARTICLE_KNOWLEDGE.version;
const tri = x => ["yes", "no"].includes(x) ? x : "unknown";
const number = x => (x === "" || x === null || x === undefined ||
  !Number.isFinite(Number(x))) ? null : Number(x);
const info = (status, title, detail, rules, next = [], trace = []) =>
  ({status, title, detail, rules, next, trace});
const review = (title, missing, rules) =>
  info("REVIEW_REQUIRED", title, "Insufficient verified information for a negative regulatory conclusion.",
    rules, [...new Set(missing)].filter(Boolean));
const percentRule = ARTICLE_THRESHOLDS.candidate_list_w_w_percent;
const quantityRule = ARTICLE_THRESHOLDS.article_7_tonnes_per_year;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) &&
  !Number.isNaN(Date.parse(value));
const applies = (v, rule) => rule.operator === ">" && Number.isFinite(v) ? v > rule.value : null;

/** ECHA Table 5: the relevant denominator must be evident, never assumed to be a whole product. */
export function concentrationOf(entry, component) {
  const mass = number(entry.retainedMassGrams);
  const basis = entry.referenceBasis;
  const reference = basis === "constituent_article"
    ? number(component.massGrams) : number(entry.referenceMassGrams);
  if (!["constituent_article", "joining_or_coating_complex_object"].includes(basis))
    return {status:"REVIEW_REQUIRED", issue:"Select an ECHA Table 5 reference mass basis."};
  if (basis === "joining_or_coating_complex_object" &&
      (entry.incorporationStage !== "joined_or_coated_assembled_object" || !entry.referenceEvidenceId))
    return {status:"REVIEW_REQUIRED", issue:"Document assembled-object joining/coating scenario and its denominator evidence."};
  if (basis === "constituent_article" && entry.referenceMassGrams !== undefined &&
      number(entry.referenceMassGrams) !== reference)
    return {status:"REVIEW_REQUIRED", issue:"Constituent-article mass conflicts with the supplied denominator."};
  if (mass === null || mass < 0 || reference === null || reference <= 0 || mass > reference)
    return {status:"REVIEW_REQUIRED", issue:"Valid retained substance mass and reference mass are required."};
  const percent = 100 * mass / reference;
  return {status:"CALCULATED", percent, exceeds:applies(percent,percentRule), retainedMassGrams:mass,
    referenceMassGrams:reference, referenceBasis:basis};
}

/**
 * Input:
 * articleComponents: [{id, massGrams, annualUnits, allSubstancesChecked:"yes",
 *   substances:[{substanceId,name,candidateList:"yes|no|unknown",
 *     retainedMassGrams,referenceBasis,referenceMassGrams?,
 *     evidenceIds, intendedRelease:"yes|no|unknown",
 *     registeredForUse:"yes|no|unknown", exposureExcluded:"yes|no|unknown",
 *     recipientInstructionsProvided:"yes|no|unknown"}]}]
 * articleAssessment: {assessmentDate, allComponentsChecked, actorRole,
 *   placedOnEUMarket, candidateListSnapshot:{asOf,sourceUrl,evidenceId}}
 * Each annualUnits is the number of this specific component made/imported by
 * the assessed actor in one year. Unknown totals prevent negative Article 7 decisions.
 */
export function assessArticleObligations(facts = {}) {
  const comps = facts.articleComponents;
  const ctx = facts.articleAssessment || {};
  const missing = [];
  const checks = [];
  const candidates = [];
  const allSubstances = [];
  let incomplete = false;
  const snapshot = ctx.candidateListSnapshot || {};
  const snapshotOk = validDate(ctx.assessmentDate) && validDate(snapshot.asOf) &&
    snapshot.asOf === ctx.assessmentDate && /^https:\/\/echa\.europa\.eu\//.test(snapshot.sourceUrl || "") &&
    Boolean(String(snapshot.evidenceId || "").trim());
  if (!snapshotOk) {
    incomplete = true;
    missing.push("Attach a dated ECHA Candidate List snapshot matching the assessment date, with evidence ID.");
  }
  if (!Array.isArray(comps) || comps.length === 0) {
    return {article33:review("Article 33 component evidence needed", ["Provide individual constituent articles."], ["ART-007"]),
      article7_2:review("Article 7(2) assessment incomplete", ["Provide component-level substances and quantities."], ["ART-009"]),
      article7_1:review("Article 7(1) assessment incomplete", ["Provide intended-release screening."], ["ART-012"]),
      scip:review("SCIP assessment incomplete", ["Provide constituent article composition."], ["ART-013"]),
      components:[], missingEvidence:["Provide one or more constituent articles."]};
  }
  if (ctx.allComponentsChecked !== "yes") {
    incomplete = true;
    missing.push("Confirm that all constituent articles in the supplied product were checked.");
  }
  const seenIds = new Set();
  for (const component of comps) {
    const id = String(component?.id ?? "").trim();
    if (!id || seenIds.has(id)) {
      incomplete = true;
      missing.push("Each article component requires a unique non-empty identifier.");
    }
    seenIds.add(id);
    if (component?.allSubstancesChecked !== "yes") {
      incomplete = true;
      missing.push("Confirm substance coverage for component " + (id || "(unnamed)") + ".");
    }
    if (!Array.isArray(component?.substances)) {
      incomplete = true;
      missing.push("Provide a substances array (possibly empty after a complete verified review) for " + id + ".");
      continue;
    }
    for (const entry of component.substances) {
      const substanceId = String(entry?.substanceId ?? "").trim();
      const list = tri(entry?.candidateList);
      const evidenceIds = Array.isArray(entry?.evidenceIds) ?
        entry.evidenceIds.filter(x => typeof x === "string" && x.trim()) : [];
      const calc = concentrationOf(entry || {}, component);
      const row = {componentId:id, substanceId, candidateList:list,
        concentration:calc, evidenceIds, annualUnits:number(component.annualUnits),
        intendedRelease:tri(entry?.intendedRelease),registeredForUse:tri(entry?.registeredForUse),
        exposureExcluded:tri(entry?.exposureExcluded),
        recipientInstructionsProvided:tri(entry?.recipientInstructionsProvided),
        preListingOnly:tri(entry?.preListingOnly),
        registrationEvidenceId:String(entry?.registrationEvidenceId || "").trim(),
        registeredUseDescription:String(entry?.registeredUseDescription || "").trim(),
        exposureEvidenceId:String(entry?.exposureEvidenceId || "").trim(),
        preListingEvidenceId:String(entry?.preListingEvidenceId || "").trim(),
        listingDate:entry?.listingDate || "",
        latestProductionImportDate:entry?.latestProductionImportDate || ""};
      checks.push(row);
      allSubstances.push(row);
      if (!substanceId || list === "unknown" || evidenceIds.length === 0 ||
        calc.status !== "CALCULATED") {
        incomplete = true;
        missing.push("Verify substance ID, Candidate List status, concentration and supporting evidence for " + id + "/" + (substanceId || "?") + ".");
      }
      if (list === "yes" && calc.status === "CALCULATED" && calc.exceeds) candidates.push(row);
    }
  }

  const matched = candidates.map(c => c.componentId + "/" + c.substanceId + " (" +
    c.concentration.percent.toPrecision(4) + "% w/w)");
  const positive = matched.length > 0;
  const role = ctx.actorRole || "unknown";
  const actorProducer = ["producer","importer"].includes(role);
  const coveredScip = ["producer","importer","assembler","distributor"].includes(role);
  const market = tri(ctx.placedOnEUMarket);
  const actorKnown = ["producer","importer","assembler","distributor",
    "retailer_exclusively_consumer"].includes(role);
  let article33;
  if (market === "no") {
    article33 = info("NOT_APPLICABLE", "No EU article supply in the assessed transaction",
      "The Article 33 communication duty applies to a supplier of an article in scope.", ["ART-007"]);
  } else if (market !== "yes" || !actorKnown) {
    article33 = review("Confirm Article 33 supplier scope",
      ["Establish EU supply/market placement and supplier role."],["ART-007"]);
  } else if (positive && snapshotOk) {
    article33 = info("REQUIRED", "Article 33 communication triggered",
      "One or more constituent articles exceed 0.1% w/w. Communicate safe-use information (at least the substance name) to business recipients; respond to consumer requests within 45 days.",
      ["ART-007","ART-008"],missing,matched);
  } else if (incomplete) {
    article33 = review("Article 33 evidence incomplete",missing,["ART-007","ART-008"]);
  } else {
    article33 = info("NOT_REQUIRED", "No Article 33 threshold trigger",
      "Declared complete component assessment contains no Candidate List substance above 0.1% w/w.",
      ["ART-007","ART-008"],[],checks.map(x=>x.componentId+"/"+x.substanceId));
  }

  let scip;
  if (market === "no" || role === "retailer_exclusively_consumer") {
    scip = info("NOT_APPLICABLE", "No SCIP submission by this actor in the assessed supply",
      "EU market placement or actor-specific SCIP scope is not met as declared.", ["ART-013"]);
  } else if (market !== "yes" || !coveredScip) {
    scip = review("Confirm SCIP supplier and market scope", ["Confirm EU market placement and supplier role."],["ART-013"]);
  } else if (positive && snapshotOk) {
    scip = info("REQUIRED", "SCIP information submission triggered",
      "The actor places an article containing a Candidate List substance above 0.1% w/w on the EU market. SCIP dossier details need separate validation.",
      ["ART-013"],missing,matched);
  } else if (incomplete) {
    scip = review("SCIP evidence incomplete",missing,["ART-013"]);
  } else {
    scip = info("NOT_REQUIRED", "No SCIP concentration trigger identified",
      "No covered article exceeds the Candidate List 0.1% w/w threshold on the complete declared data.",["ART-013"]);
  }

  // Article 7(2) counts only the amount of each SVHC in qualifying articles,
  // aggregated by substance and producer/importer per year (grams -> tonnes).
  let article7_2;
  if (!actorProducer && ["distributor","retailer_exclusively_consumer"].includes(role))
    article7_2 = info("NOT_APPLICABLE", "Article 7(2) notifier role not met",
      "The declared actor is neither an article producer nor importer.",["ART-009"]);
  else if (!actorProducer)
    article7_2 = review("Confirm Article 7(2) actor role",["Confirm producer/importer responsibility for each article."],["ART-009"]);
  else {
    const groups = new Map();
    for (const c of candidates) {
      if (!groups.has(c.substanceId)) groups.set(c.substanceId,[]);
      groups.get(c.substanceId).push(c);
    }
    const triggered = [];
    const blockers = [...missing];
    for (const [id, entries] of groups) {
      const validAmounts = entries.every(x => x.annualUnits !== null && x.annualUnits >= 0);
      if (!validAmounts) {blockers.push("Provide annual unit counts for every qualifying article containing " + id + "."); continue;}
      const tonnes = entries.reduce((sum,x)=>sum+x.concentration.retainedMassGrams*x.annualUnits/1000000,0);
      if (!applies(tonnes,quantityRule)) continue;
      if (entries.every(x => x.registeredForUse === "yes")) {
        if (entries.every(x => x.registrationEvidenceId && x.registeredUseDescription)) continue;
        blockers.push("Provide registration-for-that-use evidence and covered-use details for " + id + ".");
        continue;
      }
      if (entries.every(x => x.preListingOnly === "yes")) {
        if (entries.every(x => x.preListingEvidenceId && validDate(x.listingDate) &&
            validDate(x.latestProductionImportDate) &&
            x.latestProductionImportDate < x.listingDate)) continue;
        blockers.push("Document Candidate List inclusion and final production/import dates for " + id + ".");
        continue;
      }
      if (entries.every(x => x.exposureExcluded === "yes" && x.recipientInstructionsProvided === "yes")) {
        if (entries.every(x => x.exposureEvidenceId)) continue;
        blockers.push("Provide normal/foreseeable-use and waste-stage exposure-exclusion evidence for " + id + ".");
        continue;
      }
      if (entries.some(x => x.registeredForUse === "yes" || x.preListingOnly === "yes" ||
        x.exposureExcluded === "yes")) {
        blockers.push("Resolve use-specific exemptions and relevant tonnage allocations for " + id + ".");
        continue;
      }
      if (entries.some(x => x.registeredForUse === "unknown" || x.exposureExcluded === "unknown" ||
        x.preListingOnly === "unknown")) {
        blockers.push("Determine registration-for-use and Article 7(2) exemptions for " + id + ".");
      }
      else triggered.push(id + ": " + tonnes.toPrecision(4) + " tonnes/year");
    }
    article7_2 = triggered.length && snapshotOk
      ? info("REQUIRED", "Article 7(2) notification trigger", "A Candidate List substance exceeds both the component-level 0.1% threshold and the 1 tonne/year actor threshold without an evidenced exemption.",
        ["ART-009","ART-010","ART-011"],blockers,triggered)
      : (incomplete || blockers.length || (positive && !snapshotOk))
        ? review("Article 7(2) quantity or exemption evidence incomplete",blockers,["ART-009","ART-010","ART-011"])
        : info("NOT_REQUIRED", "No screened Article 7(2) notification trigger",
          "Complete declared substance totals do not exceed the applicable threshold or documented exemptions apply.",["ART-009","ART-010","ART-011"]);
  }

  // Article 7(1) covers intended-release substances, not just SVHCs.
  let article7_1;
  if (!actorProducer && ["distributor","retailer_exclusively_consumer"].includes(role))
    article7_1 = info("NOT_APPLICABLE", "Article 7(1) registration actor role not met",
      "The declared actor is not an article producer or importer.", ["ART-012"]);
  else if (!actorProducer)
    article7_1 = review("Confirm Article 7(1) actor role", ["Confirm producer/importer responsibility."],["ART-012"]);
  else {
    const releaseGroups = new Map();
    const blockers = [];
    for (const row of allSubstances) {
      if (row.intendedRelease === "unknown")
        blockers.push("Establish intended release status for " + row.componentId + "/" + row.substanceId + ".");
      if (row.intendedRelease === "yes") {
        if (!releaseGroups.has(row.substanceId)) releaseGroups.set(row.substanceId,[]);
        releaseGroups.get(row.substanceId).push(row);
      }
    }
    const triggered=[];
    for (const [id, entries] of releaseGroups) {
      if (entries.some(x => x.annualUnits === null || x.annualUnits < 0 ||
          x.concentration.status !== "CALCULATED")) {
        blockers.push("Provide total retained substance mass and article units/year for " + id + ".");
        continue;
      }
      const tonnes = entries.reduce((sum,x)=>sum + x.concentration.retainedMassGrams*x.annualUnits/1000000,0);
      if (!applies(tonnes,quantityRule)) continue;
      if (entries.every(x => x.registeredForUse === "yes")) {
        if (entries.every(x => x.registrationEvidenceId && x.registeredUseDescription)) continue;
        blockers.push("Provide Article 7(1) registration-for-use evidence and covered-use details for " + id + ".");
        continue;
      }
      if (entries.some(x => x.registeredForUse === "yes")) {
        blockers.push("Resolve mixed use-specific Article 7(1) registration exemptions for " + id + ".");
        continue;
      }
      if (entries.some(x => x.registeredForUse === "unknown")) {
        blockers.push("Confirm registered-for-that-use exemption for " + id + ".");
        continue;
      }
      triggered.push(id + ": " + tonnes.toPrecision(4) + " tonnes/year");
    }
    article7_1 = triggered.length ? info("REQUIRED", "Article 7(1) intended-release registration trigger",
      "The substance intended to be released is present above 1 tonne per producer/importer/year in the relevant articles; validate all statutory exemptions and registration steps.",
      ["ART-012","ART-010"],blockers,triggered)
      : blockers.length || ctx.allComponentsChecked !== "yes" || comps.some(x => x?.allSubstancesChecked !== "yes")
        ? review("Article 7(1) intended-release screening incomplete",blockers,["ART-012"])
        : info("NOT_REQUIRED", "No screened Article 7(1) intended-release registration trigger",
          "No known intended-release substance exceeds 1 tonne/year without an exemption.",["ART-012"]);
  }
  return {article33,article7_2,article7_1,scip,components:checks,
    missingEvidence:[...new Set(missing)], candidateListSnapshot: snapshotOk? snapshot : null};
}
