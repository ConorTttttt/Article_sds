/**
 * Read-only LLM fact-extraction boundary.
 * LLM proposals are NEVER merged into assessment inputs by this module.
 * A qualified reviewer must accept them in a separate, auditable workflow.
 */
import { ARTICLE_KNOWLEDGE } from "./generated-article-knowledge.mjs";

const EXPLICIT = new Set([
  "productType", "classification.function", "classification.shapeDominates",
  "classification.separableChemical", "classification.step6Rationale",
  "articleAssessment.actorRole", "articleAssessment.placedOnEUMarket",
  "articleAssessment.allComponentsChecked", "articleAssessment.assessmentDate",
  "articleComponents[].id", "articleComponents[].massGrams",
  "articleComponents[].annualUnits", "articleComponents[].allSubstancesChecked",
  "articleComponents[].substances[].substanceId",
  "articleComponents[].substances[].retainedMassGrams",
  "articleComponents[].substances[].referenceBasis",
  "articleComponents[].substances[].intendedRelease"
]);
export const ALLOWED_FACT_PATHS = Object.freeze([...EXPLICIT]);

export function vetLLMProposals(packet) {
  const errors=[],reviewQueue=[];
  if (!packet || packet.schemaVersion !== "llm-extraction-v1" ||
      !Array.isArray(packet.proposals))
    return {acceptedForDecision:[],reviewQueue:[],errors:["Invalid proposal packet schema."]};
  for (const [i,p] of packet.proposals.entries()) {
    const reason=[];
    if (!EXPLICIT.has(p?.path)) reason.push("Unknown or non-LLM-writable fact path");
    if (!["asserted","unknown"].includes(p?.certainty)) reason.push("Invalid epistemic status");
    if (!p?.sourceRef || !p?.evidenceExcerpt || String(p.evidenceExcerpt).trim().length < 5)
      reason.push("Verbatim source excerpt and stable document reference required");
    if (p?.certainty === "unknown" && p?.suggestedValue !== "unknown")
      reason.push("Unknown information cannot be converted into a positive or negative claim");
    if (!["string","number","boolean"].includes(typeof p?.suggestedValue))
      reason.push("Value must be a primitive; never supply a calculated legal outcome");
    if (p?.path === "classification.shapeDominates")
      reason.push("Article 3(3) comparison is a reviewed legal judgement, not LLM-executable");
    if (p?.path?.startsWith("articleAssessment.") && p?.certainty !== "unknown")
      reason.push("Actor and dated regulatory context require assessor confirmation");
    // Explicit block against assigning a legal decision, an official Candidate List
    // membership, or an exemption based solely on generative model output.
    if (/(decision|status|candidateList|exempt|registeredForUse|step6Conclusion)/i.test(p?.path || ""))
      reason.push("Prohibited legal or dataset authority field");
    reviewQueue.push({index:i,path:p?.path??null,suggestedValue:p?.suggestedValue??null,
      sourceRef:p?.sourceRef??null,evidenceExcerpt:p?.evidenceExcerpt??null,
      reviewerRequired:true,reviewReasons:reason});
    if (reason.length) errors.push("Proposal " + i + ": " + [...new Set(reason)].join("; "));
  }
  return {acceptedForDecision:[],reviewQueue,errors,
    catalogVersion:ARTICLE_KNOWLEDGE.version,
    note:"Fact proposals are untrusted suggestions, not completed legal decisions."};
}
