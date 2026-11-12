/**
 * ECHA Guidance on requirements for substances in articles
 * Version 4.0 (June 2017), chapter 2 and Figure 2 (pp. 16-21).
 * This is a transparent rules-based implementation of ECHA's indicative workflow.
 * It is guidance and does NOT replace the REACH Article 3(3) legal definition.
 */
const answered = value => value === "yes" || value === "no";
const state = (status, explanation, step, next = []) => ({
  status, explanation, step, next,
  guidance: "ECHA Guidance on requirements for substances in articles, Version 4.0 (June 2017), sections 2.1-2.3, Figure 2, pp. 16-21"
});
const review = (explanation, step, next) => state("REVIEW_REQUIRED", explanation, step, next);

/** True only if there is a clear majority of answered yes/no responses. */
function majority(values) {
  const yes = values.filter(v => v === "yes").length;
  const no = values.filter(v => v === "no").length;
  const needed = Math.floor(values.length / 2) + 1;
  if (yes >= needed) return "yes";
  if (no >= needed) return "no";
  return "unknown";
}

/**
 * ECHA Article 3(3) classification decision support.
 *
 * Input keys: function, shapeDominates (yes/no/unknown), separableChemical,
 * q4a..q4c, q5a..q5c, q6a..q6d, step6Conclusion, step6Rationale and step6RelevantQuestionsReviewed.
 *
 * A clear answer at Step 2 avoids unnecessary indicative questions.
 * Subsequent answers are only used if Step 2 is genuinely inconclusive.
 */
export function classifyObject(input = {}) {
  const facts = input && typeof input === "object" ? input : {};
  if (!String(facts.function ?? "").trim())
    return review("Describe the object's intended function before applying Article 3(3).", "1",
      ["Describe the object's main intended purpose (not just product name)."]);
  if (facts.shapeDominates === "yes")
    return state("ARTICLE", "The assessor confirmed that shape, surface or design is more important for the object's function than its chemical composition.", "2");
  if (facts.shapeDominates === "no")
    return state("CHEMICAL", "The assessor confirmed that shape, surface or design is no more important for the object's function than chemical composition. Assess as substance or mixture.", "2");

  // ECHA steps 3-6 only support a genuinely ambiguous Step 2; not an autonomous classifier.
  if (!answered(facts.separableChemical))
    return review("The shape-versus-chemistry comparison is unresolved. Establish whether a substance/mixture is physically separable.", "3",
      ["Investigate whether the chemical portion can be poured, wrung out or otherwise physically separated."]);

  if (facts.separableChemical === "yes") {
    const stage4 = majority([facts.q4a, facts.q4b, facts.q4c]);
    if (stage4 === "yes")
      return state("COMBINATION", "Most ECHA step 4 answers indicate a separately supplied chemical and an article serving as container/carrier. Assess their obligations separately.", "4");
    if (stage4 === "unknown")
      return review("ECHA step 4 has no clear majority. Obtain more evidence about delivery, chemical function and consumption.", "4");
    const stage5 = majority([facts.q5a, facts.q5b, facts.q5c]);
    if (stage5 === "yes")
      return state("ARTICLE", "The chemical is likely integral to the article according to ECHA step 5; the main function is not delivery of a chemical.", "5");
    if (stage5 === "no")
      return state("COMBINATION", "The ECHA step 5 cross-check does not support treating the chemical as integral to the article.", "5");
    return review("ECHA step 5 cross-check is inconclusive. A competent review of the object and chemical functions is needed.", "5");
  }

  // Unlike Step 4's explicit 2-of-3 indications, Step 6 does not prescribe
  // equally-weighted votes: relevance and evidential weight vary case by case.
  // Never promote a numerical majority into an automatic legal classification.
  const indications = [facts.q6a, facts.q6b, facts.q6c, facts.q6d];
  if (!indications.some(answered))
    return review("Step 6 needs documented answers to the applicable indicative questions.", "6",
      ["Record the relevant indicators and their evidence."]);
  if (facts.step6RelevantQuestionsReviewed !== "yes")
    return review("Step 6 requires confirmation that all relevant questions and their relative evidential weight were considered.", "6",
      ["Review the relevance and weight of each Step 6 indicator."]);
  const rationale = String(facts.step6Rationale ?? "").trim();
  if (rationale.length < 20)
    return review("Record a substantive evidence-based Step 6 rationale (at least 20 characters).", "6",
      ["Explain why physical form or chemistry determines the function."]);
  if (!["ARTICLE", "CHEMICAL"].includes(facts.step6Conclusion))
    return review("Step 6 is advisory. A documented Article 3(3) conclusion is still needed.", "6",
      ["Record a reviewed Article 3(3) conclusion based on the evidence."]);
  return state(facts.step6Conclusion,
    "Reviewed Step 6 judgement: " + rationale +
    " The indicative answers support this documented Article 3(3) decision; they do not replace the legal definition.", "6");
}

/**
 * ECHA Table 5: For Article 33 the mass-basis must be documented.
 * - constituent_article: an individual article, including coating incorporated into it.
 * - joining_or_coating_complex_object: an SVHC incorporated into the complex object
 *   by joining components or coating the assembled object (Table 5 scenarios II / III.C).
 * Never average SVHC from an individual constituent article over the mass of a larger product.
 *
 * Inputs are the retained SVHC mass and the relevant article / complex-object mass in grams.
 */
export function svhcConcentration(input = {}) {
  const basis = input.basis;
  if (!["constituent_article", "joining_or_coating_complex_object"].includes(basis))
    return { status: "REVIEW_REQUIRED", explanation: "Select the valid ECHA Table 5 reference-mass basis." };
  const mass = Number(input.svhcMassGrams);
  const reference = Number(input.referenceMassGrams);
  if ([input.svhcMassGrams, input.referenceMassGrams].some(v => v === undefined || v === null || String(v).trim() === "") ||
      !Number.isFinite(mass) || !Number.isFinite(reference) || mass < 0 || reference <= 0 || mass > reference)
    return { status: "REVIEW_REQUIRED", explanation: "Provide valid retained SVHC mass and positive reference mass in grams. Retained SVHC mass cannot exceed the reference mass." };
  return {
    status: "CALCULATED",
    percent: (mass / reference) * 100,
    basis,
    explanation: "Calculated as 100 × retained SVHC mass / relevant reference mass. ECHA Table 5, pp. 33-36; Box 1, p. 37."
  };
}
