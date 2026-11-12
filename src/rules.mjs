/**
 * Deterministic, offline EU SDS screening.
 * Scope: EU law, facts supplied by the assessor. This is NOT a chemical-classification engine.
 * Ruleset version is pinned; update only after legal review and regression tests.
 */
export const RULESET_VERSION = "eu-sds-2026-11-v1";
export const LAW_AS_OF = "2026-11-12";
export const SOURCES = Object.freeze({
  REACH_DEFINITION: {
    name: "REACH Article 3(3)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
    description: "An article's shape, surface or design determines its function more than chemical composition."
  },
  REACH_31_1: {
    name: "REACH Article 31(1)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
    description: "Mandatory SDS for applicable hazardous substances/mixtures and certain PBT, vPvB and Candidate List substances."
  },
  REACH_ANNEXII_07: {
    name: "REACH Annex II section 0.7",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0878",
    description: "SDSs are required for certain CLP Annex I 1.3 labelling-derogation special cases."
  },
  REACH_31_3: {
    name: "REACH Article 31(3)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
    description: "SDS on recipient request for certain non-classified mixtures containing specified substances."
  },
  REACH_31_4: {
    name: "REACH Article 31(4)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
    description: "Public supply exception when sufficient safe-use information is provided, unless requested by a downstream user or distributor."
  },
  REACH_33: {
    name: "REACH Article 33",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
    description: "Information duty for Candidate List substances above 0.1% w/w in each article, including constituent articles of complex objects."
  },
  PYRO_11_3: {
    name: "Directive 2013/29/EU Article 11(3)",
    url: "https://eur-lex.europa.eu/eli/dir/2013/29/oj/eng",
    description: "SDS for pyrotechnic articles for vehicles supplied to professional users."
  },
  CLP_ED2: {
    name: "CLP Annex I (ED category 2 mixture notes)",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0707",
    description: "Certain category 2 endocrine disruptors at 0.1% in mixtures trigger SDS availability upon request."
  },
  ECHA_ARTICLES: {
    name: "ECHA guidance: substances in articles",
    url: "https://echa.europa.eu/documents/10162/2324906/nutshell_guidance_articles2_en.pdf",
    description: "Explains separate chemical payloads, constituent articles and Article 33 communication."
  }
});

const TRI = ["yes", "no", "unknown"];
const tri = value => TRI.includes(value) ? value : "unknown";
const decision = (status, title, detail, rules, next = []) => ({ status, title, detail, rules, next });
const unresolved = (detail, next = []) => decision("REVIEW_REQUIRED", "Further assessment needed", detail, [], next);
const num = v => (typeof v === "number" || (typeof v === "string" && v.trim() !== "")) && Number.isFinite(Number(v)) ? Number(v) : null;

/** Always returns an independent Article 33 result; this is NOT an SDS assessment. */
function article33(facts) {
  const listed = tri(facts.candidateListPresent);
  const complete = tri(facts.allComponentsChecked);
  if (listed === "yes") {
    const p = num(facts.maxComponentSvhcPercent);
    if (p === null || p < 0 || p > 100)
      return decision("REVIEW_REQUIRED", "Article 33: concentration needed",
        "Enter the Candidate List substance concentration by weight in the affected constituent article (not the mass of the whole assembled product).", ["REACH_33"], ["Provide component-level concentration evidence."]);
    if (p > 0.1)
      return decision("REQUIRED", "Article 33 information required",
        "A Candidate List substance exceeds 0.1% w/w in a constituent article. Communicate sufficient safe-use information, at least the substance name, to business recipients; respond to consumer requests free of charge within 45 days.", ["REACH_33"]);
    if (complete !== "yes")
      return decision("REVIEW_REQUIRED", "Article 33: other components unverified",
        "This substance is not above 0.1% w/w in the assessed component, but other constituent articles/substances have not been fully checked.", ["REACH_33"]);
    return decision("NOT_REQUIRED", "No Article 33 trigger identified",
      "The stated Candidate List concentrations are not above 0.1% w/w in any constituent article, according to the completed assessment.", ["REACH_33"]);
  }
  if (listed === "no" && complete === "yes")
    return decision("NOT_REQUIRED", "No Article 33 trigger identified",
      "All constituent articles were checked and no Candidate List substance above the threshold was identified.", ["REACH_33"]);
  return decision("REVIEW_REQUIRED", "Article 33: substances not fully assessed",
    "Confirm Candidate List status and review every constituent article. Do not infer absence of SVHCs from missing supplier data.", ["REACH_33"], ["Obtain supplier declarations or laboratory/technical evidence."]);
}

function applyPublicException(facts, base) {
  if (base.status !== "REQUIRED") return base;
  const suppliedToPublic = tri(facts.offeredToPublic);
  const downstreamRequest = tri(facts.downstreamRequest);
  if (downstreamRequest === "yes") return base;
  if (suppliedToPublic === "no") return base;
  if (suppliedToPublic === "yes") {
    const adequate = tri(facts.publicInformationSufficient);
    if (adequate === "no") return base;
    if (adequate === "yes" && downstreamRequest === "no")
      return decision("NOT_REQUIRED_FOR_THIS_SUPPLY", "SDS not automatically supplied in this transaction",
        "A substance or mixture offered/sold to the general public has sufficient safe-use information and no downstream-user/distributor request. The underlying hazard-based SDS obligation is not erased.", [...base.rules, "REACH_31_4"]);
    return decision("REVIEW_REQUIRED", "Check REACH public-supply exception",
      "Confirm whether sufficient safe-use information is supplied and whether a downstream user/distributor requested an SDS.", [...base.rules, "REACH_31_4"]);
  }
  return decision("REVIEW_REQUIRED", "Confirm supply channel",
    "A positive Article 31 trigger exists, but it is not known whether the general-public exception applies.", [...base.rules, "REACH_31_4"]);
}

/**
 * Ingredient categories: ordinary_hazard, special_31_3b, union_oel, ed2, none, unknown.
 * Concentrations must be the percentage of EACH INDIVIDUAL substance (w/w except gas v/v).
 * This screens positive request triggers, not mixture CLP classification.
 */
export function mixtureRequestTriggers(facts) {
  const physical = facts.mixturePhysical;
  if (!["gas", "nongas"].includes(physical))
    return { known: false, matched: [], issue: "Mixture physical form is unknown." };
  const ingredients = facts.ingredients;
  if (!Array.isArray(ingredients) || !ingredients.length)
    return { known: false, matched: [], issue: "No ingredient assessment supplied." };
  const matched = [];
  let missing = false;
  for (const ingredient of ingredients) {
    const p = num(ingredient.percent);
    const category = ingredient.category;
    if (p === null || p <= 0 || p > 100 || !["ordinary_hazard", "special_31_3b", "union_oel", "ed2", "none"].includes(category)) {
      missing = true;
      continue;
    }
    const name = (ingredient.name || "Unnamed ingredient").trim();
    if (category === "ordinary_hazard" && p >= (physical === "gas" ? 0.2 : 1))
      matched.push({ name, rule: "REACH_31_3", text: "health/environment hazard concentration threshold met" });
    if (category === "special_31_3b" && physical === "nongas" && p >= 0.1)
      matched.push({ name, rule: "REACH_31_3", text: "Article 31(3)(b) 0.1% threshold met" });
    if (category === "union_oel")
      matched.push({ name, rule: "REACH_31_3", text: "Union workplace exposure limit" });
    if (category === "ed2" && p >= 0.1)
      matched.push({ name, rule: "CLP_ED2", text: "ED category 2 0.1% request threshold" });
  }
  if (matched.length) return { known: true, matched };
  if (missing || tri(facts.allMixtureIngredientsChecked) !== "yes")
    return { known: false, matched: [], issue: "Ingredient coverage/identification is incomplete." };
  return { known: true, matched: [] };
}

export function assess(raw = {}) {
  const facts = raw && typeof raw === "object" ? raw : {};
  const kind = facts.productType;
  const related = [];
  let sds;
  let articleInformation = null;

  if (kind === "article") {
    articleInformation = article33(facts);
    if (tri(facts.pyrotechnicVehicle) === "yes" && tri(facts.separateChemicalPayload) !== "no")
      related.push("Any separately supplied substance/mixture in this vehicle pyrotechnic product needs its own SDS assessment as well.");
    if (tri(facts.intendedRelease) === "yes")
      related.push("Intended substance release from an article may create a separate REACH Article 7 registration check; it does not by itself create a REACH Article 31 SDS duty.");
    const pyro = tri(facts.pyrotechnicVehicle);
    const separate = tri(facts.separateChemicalPayload);
    if (pyro === "yes") {
      const professional = tri(facts.professionalRecipient);
      if (professional === "yes")
        sds = decision("REQUIRED", "SDS required for vehicle pyrotechnic article",
          "Directive 2013/29/EU requires a REACH Annex II-style SDS to be supplied to professional users in the language requested.", ["PYRO_11_3"]);
      else if (professional === "no")
        sds = decision("NOT_REQUIRED_FOR_THIS_SUPPLY", "No professional-user SDS supply identified",
          "The specific Article 11(3) duty is to professional users. Check whether any other rule applies to this transaction.", ["PYRO_11_3"]);
      else
        sds = decision("REVIEW_REQUIRED", "Confirm recipient type",
          "Vehicle pyrotechnic articles need an SDS for professional users; recipient status is unknown.", ["PYRO_11_3"]);
    } else if (pyro === "unknown") {
      sds = decision("REVIEW_REQUIRED", "Confirm pyrotechnic status",
        "Ordinary articles are outside the REACH Article 31 SDS mechanism, but vehicle pyrotechnic articles have a special requirement.", ["REACH_DEFINITION", "PYRO_11_3"]);
    } else if (separate === "yes") {
      sds = decision("REVIEW_REQUIRED", "Assess separately supplied chemical payload",
        "A container/carrier and a substance or mixture can form one marketed product. Assess that chemical portion separately under REACH Article 31.", ["REACH_DEFINITION", "ECHA_ARTICLES"], ["Run a separate substance/mixture assessment."]);
    } else if (separate === "unknown") {
      sds = decision("REVIEW_REQUIRED", "Confirm article versus chemical combination",
        "Determine whether the object includes a distinct supplied substance/mixture (e.g. ink cartridge, wet wipe).", ["REACH_DEFINITION", "ECHA_ARTICLES"]);
    } else {
      sds = decision("NOT_REQUIRED", "SDS not required for the ordinary article",
        "On the declared facts, this is an article with no separate supplied chemical payload and not a vehicle pyrotechnic article. REACH Article 31 addresses substances and mixtures, not articles. Article 33 is assessed separately.", ["REACH_DEFINITION", "REACH_31_1", "REACH_33"]);
    }
  } else if (kind === "combination") {
    sds = decision("REVIEW_REQUIRED", "Separate the article and chemical assessments",
      "A combination product may contain both an article and an independently supplied substance/mixture. Evaluate the chemical portion using the substance or mixture pathway.", ["ECHA_ARTICLES", "REACH_31_1"]);
  } else if (kind === "substance") {
    const hazardous = tri(facts.clpHazardous), pbt = tri(facts.pbtOrVpVb), svhc = tri(facts.substanceCandidateList);
    const special = tri(facts.clpLabellingDerogation);
    if (special === "yes") {
      sds = applyPublicException(facts, decision("REQUIRED", "SDS required for CLP special case",
        "REACH Annex II section 0.7 requires SDSs for specified CLP Annex I 1.3 labelling derogation cases.", ["REACH_ANNEXII_07"]));
    } else if ([hazardous, pbt, svhc].includes("yes")) {
      sds = applyPublicException(facts, decision("REQUIRED", "SDS required for substance",
        "One or more REACH Article 31(1) conditions were confirmed (CLP hazardous, PBT/vPvB, or Candidate List).", ["REACH_31_1"]));
    } else if ([hazardous, pbt, svhc, special].includes("unknown")) {
      sds = decision("REVIEW_REQUIRED", "Substance hazard/list/special-case status incomplete",
        "Confirm CLP classification, CLP labelling-derogation special cases, PBT/vPvB and Candidate List status before determining SDS duties.", ["REACH_31_1", "REACH_ANNEXII_07"]);
    } else {
      sds = decision("NOT_REQUIRED", "No REACH Article 31 SDS trigger identified",
        "All three Article 31(1) conditions were declared absent. Other information and sector-specific obligations may still apply.", ["REACH_31_1"]);
    }
  } else if (kind === "mixture") {
    const hazardous = tri(facts.clpHazardous);
    const special = tri(facts.clpLabellingDerogation);
    if (special === "yes") {
      sds = applyPublicException(facts, decision("REQUIRED", "SDS required for CLP special case",
        "REACH Annex II section 0.7 requires SDSs for specified CLP Annex I 1.3 labelling derogation cases.", ["REACH_ANNEXII_07"]));
    } else if (hazardous === "yes") {
      sds = applyPublicException(facts, decision("REQUIRED", "SDS required for hazardous mixture",
        "The mixture meets CLP hazardous-classification criteria.", ["REACH_31_1"]));
    } else if (hazardous === "unknown" || special === "unknown") {
      sds = decision("REVIEW_REQUIRED", "CLP classification/special-case status incomplete",
        "Confirm documented CLP mixture classification and any CLP Annex I 1.3 labelling derogation. The engine cannot infer this from ingredient percentages.", ["REACH_31_1", "REACH_ANNEXII_07"]);
    } else {
      const x = mixtureRequestTriggers(facts);
      if (x.matched.length) {
        sds = decision(tri(facts.downstreamRequest) === "yes" ? "REQUIRED" : "REQUIRED_ON_REQUEST",
          tri(facts.downstreamRequest) === "yes" ? "SDS required following recipient request" : "SDS required if requested",
          "Non-hazard-classified mixture contains an ingredient meeting an Article 31(3) or CLP endocrine-disruptor request condition: " +
          x.matched.map(t => t.name + " (" + t.text + ")").join("; ") + ".", [...new Set(x.matched.map(t => t.rule))]);
      } else if (!x.known) {
        sds = decision("REVIEW_REQUIRED", "Mixture data incomplete",
          x.issue + " No negative SDS conclusion can be made.", ["REACH_31_3"], ["Review full composition and applicable specific concentration limits."]);
      } else {
        sds = decision("NOT_REQUIRED", "No screened SDS trigger identified",
          "On the declared full composition and non-hazard classification, no covered Article 31(3) request trigger was found. Confirm any substance-specific limits and sector rules before regulatory sign-off.", ["REACH_31_1", "REACH_31_3", "CLP_ED2"]);
      }
    }
  } else {
    sds = decision("REVIEW_REQUIRED", "Determine product category",
      "First classify the item under REACH as an article, substance, mixture or combination.", ["REACH_DEFINITION"]);
  }

  if (["substance", "mixture"].includes(kind) && sds.status !== "REQUIRED")
    related.push("REACH Article 32 may still require supply-chain information when an SDS is not provided; this assessment does not determine Article 32 compliance.");
  return {
    rulesetVersion: RULESET_VERSION,
    lawAsOf: LAW_AS_OF,
    scope: "EU REACH / Directive 2013/29/EU; input-based screening, not legal certification.",
    sds,
    article33: articleInformation,
    related,
    inputs: JSON.parse(JSON.stringify(facts))
  };
}
