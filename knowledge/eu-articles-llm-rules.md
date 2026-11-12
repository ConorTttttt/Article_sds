# EU Article Rules — LLM-optimised regulatory knowledge (v1)

> **Source-of-truth note (v2):** This Markdown file is a readable companion, not the executable authority. Machine thresholds, field bindings and rule IDs are authored in [eu-articles-llm-rules.json](./eu-articles-llm-rules.json) and compiled into `src/generated-article-knowledge.mjs`; CI detects compilation drift. Article 31 SDS remains governed by the separately reviewed `src/rules.mjs`. ECHA indicative Step 6 questions now require a documented reviewer judgement rather than automated majority voting.

> **Use:** Retrieval and grounded explanation; NOT an autonomous legal decision engine. Generated from the user's ECHA `articles_en.PDF` (Version 4.0, June 2017), REACH provisions, and explicitly identified later law/guidance. The ECHA guidance itself says REACH law is the only authentic legal reference. Last reviewed **12 November 2026**. EU/EEA scope only.

## Operating contract for an LLM
1. **Extract, do not decide.** Identify factual claims and their evidence from user material; call the repository's deterministic assessment engine for legal status. Do not substitute your own probabilistic classification.
2. **Separate objects and obligations.** An article, a separable substance/mixture it carries, and each constituent article in a complex object need distinct checks.
3. **Separate legal duties.** REACH Article 31 SDS, Article 33 communication, Article 7(1) registration, Article 7(2) notification, SCIP, and sector duties are independent outputs.
4. **No invented negatives.** Unknown product classification, chemical identity, Candidate List status, component completeness, percentage reference mass, actor role or annual tonnage means `REVIEW_REQUIRED` on the affected branch.
5. **Strict thresholds.** Article 33 / SCIP / Article 7(2) concentration trigger is **>0.1% w/w**, not >=. Article 7 quantity is **>1 tonne per actor per year**, not >=. Article 33 has **no** tonnage condition.
6. **Citation discipline.** Say which rule ID and law/guidance source supports each explanation. Identify the source date. The 2017 PDF cannot support SCIP duties added later.
7. **No cross-exemption.** Article 7(3) and 7(6) do not remove Article 33 duties. A missing or unrequired SDS does not eliminate article safety information duties.
8. **Current-list check.** A substance is not a Candidate List substance merely because it is hazardous or suspected SVHC. Verify dated ECHA Candidate List inclusion for the supply/assessment event.
9. **Legal scope.** Do not generalise to UK REACH, sectoral restrictions, POPs, RoHS, product safety, or other laws without separate rules.
10. **Audit trace.** Record rule version, law date, raw facts, evidence links, component identifiers, calculated numerators/denominators, decision states, and reasons.

## Stable evaluation order
`jurisdiction/date -> product function and article classification -> article vs separable chemical -> per-component substances and mass bases -> REACH SDS -> Article 33 -> Article 7(2) -> Article 7(1) -> SCIP -> special-case checks -> explanations and evidence gaps`.

## Machine-facing output contract
Provide one result per module rather than one generic "compliant" verdict:
```json
{
  "ruleset_version": "eu-articles-llm-2026-11-12-v1",
  "as_of": "YYYY-MM-DD",
  "product_classification": {"state":"ARTICLE|CHEMICAL|COMBINATION|REVIEW_REQUIRED","evidence":[]},
  "reach_article31_sds": {"state":"NOT_REQUIRED|REQUIRED|REVIEW_REQUIRED|NOT_APPLICABLE","rule_ids":[]},
  "article33": {"state":"REQUIRED|NOT_REQUIRED|REVIEW_REQUIRED","rule_ids":[]},
  "article7_2": {"state":"REQUIRED|NOT_REQUIRED|REVIEW_REQUIRED|NOT_APPLICABLE","rule_ids":[]},
  "article7_1": {"state":"REQUIRED|NOT_REQUIRED|REVIEW_REQUIRED|NOT_APPLICABLE","rule_ids":[]},
  "scip": {"state":"REQUIRED|NOT_REQUIRED|REVIEW_REQUIRED|NOT_APPLICABLE","rule_ids":[]},
  "sector_sds": {"state":"REQUIRED|NOT_REQUIRED|REVIEW_REQUIRED|NOT_APPLICABLE","rule_ids":[]},
  "missing_evidence": [],
  "citations": []
}
```
This is a proposed **knowledge-layer interchange contract**; it does not replace existing `src/rules.mjs` status enums or implement the additional branches by itself.

## ECHA Figure 2: when a product is an article
- **Step 1:** Record object function/purpose (not only commercial name).
- **Step 2:** Compare whether deliberately given shape, surface or design is more important for that function than chemistry. Yes -> article; no -> substance/mixture. Unclear -> deeper assessment.
- **Step 3:** Is a substance or mixture physically separable (can be poured, wrung out, etc.)? Yes -> Steps 4/5; no -> Step 6.
- **Step 4 (container/carrier indications):** Can separated chemistry still deliver the object's function? Is the object mainly a delivery container/carrier? Is chemistry used up/eliminated in the service life while the container becomes useless? Predominantly yes suggests combination of article plus chemical.
- **Step 5 (integral chemistry cross-check):** Would removing chemistry prevent intended use? Is the main purpose other than delivery of chemistry? Is the whole object discarded with chemistry? Predominantly yes suggests an article with integral content.
- **Step 6 (further-processing indications):** End-use function beyond processing? Bought primarily for shape/design? Only light processing planned? Chemical composition retained? These are indicators, not a dispositive standalone legal formula.
- **Examples in the PDF:** Printer cartridge + ink = separate chemical plus article (§2.3 p.20); thermometer + integral liquid = article (§2.3 p.20); packaging = separate article (§2.5 p.23). Borderline decisions require review.

## Fast legal distinction
- Ordinary article: no REACH Article 31 SDS as such. **Do not** mistake this for a blanket ban on SDS or for absence of legal duties.
- Article + distinct ink, cleaning fluid, adhesive or similar chemical product: screen chemical supply separately for SDS.
- Vehicle pyrotechnic articles for professional users have a **special** SDS duty under Directive 2013/29/EU Article 11(3).
- Candidate List SVHC above 0.1% in one constituent article: may trigger Article 33 and SCIP even though ordinary article SDS remains not required.
- Intended fragrance release is an Article 7(1) registration question, **not** an automatic SDS trigger.

## Core rules (independently retrievable chunks)
### ART-001 — Legal definition and classification gate
**Module:** classification · **Authority:** REACH Article 3(3) · **Scope:** Each object/constituent object
**IF / question:** Decide the intended function, then whether shape, surface or design determines that function more than chemical composition.
**THEN / effect:** Article if physical form dominates; otherwise substance or mixture. If borderline, record REVIEW_REQUIRED rather than guessing.
**Required evidence:** object_function; shape_surface_design_vs_chemistry; classification_evidence.
**Guardrails:** An object marketed as a 'product' is not necessarily an article. ECHA indicative questions aid judgement; they are not alternative legal definitions.
**Traceability:** ECHA 2017 §§2.1–2.3, Figure 2, pp.16–21. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-002 — Ambiguous container or carrier
**Module:** classification · **Authority:** REACH Article 3(3); ECHA indicative Steps 3–5 · **Scope:** Borderline object with separable substance/mixture
**IF / question:** If Step 2 is inconclusive, determine whether a substance or mixture can be physically separated. If yes, assess whether it works without the carrier, whether the carrier mainly delivers it, and whether it is used up before the carrier is discarded (Step 4). Cross-check integral-content questions in Step 5 if Step 4 points away from a combination.
**THEN / effect:** Potential ARTICLE_PLUS_SUBSTANCE_OR_MIXTURE (printer cartridge) or ARTICLE_WITH_INTEGRAL_CONTENT (thermometer). Separate chemical payload needs a distinct SDS assessment.
**Required evidence:** separable_chemical; step4_delivery_indicators; step5_integral_indicators.
**Guardrails:** Do not treat separable hazardous ink as exempt merely because the cartridge is an article. Where relevant indicators conflict, REVIEW_REQUIRED.
**Traceability:** ECHA 2017 §2.3 pp.18–20; Appendix 3. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-003 — Further processing and packaging
**Module:** classification · **Authority:** REACH Article 3(3); ECHA indicative Step 6 · **Scope:** Semifinished materials, complex products, packaging
**IF / question:** For unclear objects without a separable chemical, evaluate intended end-use, purchase rationale, light vs gross shape changes during further processing, and chemical-composition changes. Treat packaging as a separate article.
**THEN / effect:** Classification supported by evidence; no automatic result from material solidity or packaging alone.
**Required evidence:** end_use; further_processing; packaging_components.
**Guardrails:** A complex object contains distinct constituent articles; assembly normally does not erase their article status.
**Traceability:** ECHA 2017 §§2.3–2.5 pp.21–23. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-004 — Ordinary article is outside REACH Article 31 SDS duty
**Module:** sds · **Authority:** REACH Article 31 and Article 3(3) · **Scope:** Confirmed ordinary article
**IF / question:** Product is a confirmed article, without an independently supplied substance/mixture and without an applicable sector-specific SDS rule.
**THEN / effect:** REACH Article 31 SDS NOT_REQUIRED for the article as such; evaluate the Article 33, Article 7 and SCIP duties independently.
**Required evidence:** confirmed_article_classification; separate_chemical_payload; special_article_regime.
**Guardrails:** Do not infer that an article containing a classified hazardous substance, or a Candidate List substance above 0.1%, requires an SDS. Unknown pyrotechnic/other sector regime may require REVIEW_REQUIRED rather than an unconditional global 'no SDS'.
**Traceability:** The uploaded 2017 ECHA article guidance covers Articles 7 and 33, not a standalone Article 31 SDS duty.. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_SME](https://echa.europa.eu/documents/10162/21332507/guide_chemical_safety_sme_en.pdf/09a01b3e-6a31-4311-8eae-8363730a23b3).

### ART-005 — Substance or mixture supplied with an article
**Module:** sds · **Authority:** REACH Article 31 · **Scope:** Article-plus-chemical combinations (e.g., printer cartridge with ink)
**IF / question:** The product includes a distinct substance/mixture on or in a carrier/container.
**THEN / effect:** Assess substance or mixture independently under REACH Article 31 (including its applicable triggers and supply exceptions); do not conclude NOT_REQUIRED from the article's status.
**Required evidence:** chemical_payload_classification; recipient_supply_context.
**Guardrails:** Never collapse article and chemical payload into one legal classification.
**Traceability:** ECHA 2017 §2.3 p.20, printer cartridge example. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-006 — Vehicle pyrotechnic article special SDS duty
**Module:** sds · **Authority:** Directive 2013/29/EU Article 11(3) · **Scope:** Pyrotechnic articles for vehicles supplied to professional users
**IF / question:** The article is a vehicle pyrotechnic article and is supplied to a professional user.
**THEN / effect:** SDS compiled under REACH Annex II is REQUIRED for the professional user in the requested language.
**Required evidence:** vehicle_pyrotechnic_article; professional_recipient.
**Guardrails:** This is an exception to 'no SDS for articles' under sector-specific legislation, not a REACH Article 31 article rule.
**Traceability:** Not derived from ECHA 2017 articles guidance; sector-specific law. Sources: [PYRO_DIRECTIVE](https://eur-lex.europa.eu/eli/dir/2013/29/oj/eng).

### ART-007 — Candidate List communication to recipients and consumers
**Module:** article_33 · **Authority:** REACH Article 33(1) and 33(2) · **Scope:** Supplier of article, including any constituent article of a complex object
**IF / question:** Candidate List substance present at STRICTLY GREATER THAN 0.1% w/w in any relevant article.
**THEN / effect:** Provide sufficient safe-use information, at minimum substance name, to professional/business recipients; to consumers on request free of charge within 45 days. No annual tonnage threshold.
**Required evidence:** current_candidate_list_status; substance_identity; each_relevant_article_mass; svhc_retained_mass_or_percent; supplier_role.
**Guardrails:** At exactly 0.1% this specific >0.1% trigger is not met. The tonnage threshold and Article 7 exemptions do not remove Article 33. No SDS substitute is required; an Article 33 information format can be used.
**Traceability:** ECHA 2017 §§3.2.1, 3.4.1 pp.26–27, 49–51. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-008 — Concentration denominator and component rule
**Module:** threshold · **Authority:** REACH Article 33; CJEU C-106/14; ECHA Table 5 · **Scope:** Each constituent article within a complex object, with documented joining/coating cases
**IF / question:** Calculate retained Candidate List substance mass as percent of correct reference mass: usually the individual constituent article; for a substance incorporated by joining or coating a complex object use the applicable ECHA Table 5 reference scenario.
**THEN / effect:** Apply percent = (retained SVHC mass / relevant reference mass)*100 separately for each relevant substance and component/reference basis.
**Required evidence:** reference_basis; retained_substance_mass; reference_object_mass; joining_or_coating_production_stage.
**Guardrails:** Never dilute an SVHC in a screw or other constituent article over the total bicycle/vehicle mass. Dry coatings, adhesives, and EU assembly stages require specific scenario review; do not assume one universal denominator. Averaging across different article types can conceal a positive obligation.
**Traceability:** ECHA 2017 §3.2.3.1 Table 5 pp.33–36 and Preface p.3. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-009 — Candidate List Article 7(2) notification
**Module:** article_7_2 · **Authority:** REACH Article 7(2), 7(3), 7(6), 7(7) · **Scope:** EU article producers and importers; per actor and per substance
**IF / question:** Candidate List substance >0.1% w/w in relevant article(s), AND total amount of that substance in those relevant articles >1 tonne/actor/year, AND no applicable exemption.
**THEN / effect:** NOTIFICATION_REQUIRED; ECHA indicates deadline no later than six months after Candidate List inclusion. Below/equal either strict numeric threshold => no Article 7(2) notification trigger for that substance on known facts.
**Required evidence:** candidate_list_date; producer_or_importer_role; each_relevant_article_concentration; substance_tonnes_in_relevant_articles_per_actor_per_year; exemption_evidence.
**Guardrails:** Aggregate substance mass across relevant qualifying articles, not only total finished-product mass. An assembler of pre-existing EU-supplied articles without adding substances normally does not repeat upstream notification; see ECHA Table 3. Article 33 can apply even where 7(2) does not.
**Traceability:** ECHA 2017 §§3.2.2, 3.2.3, 3.3 pp.27–49. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf), [ECHA_NOTIFICATION](https://echa.europa.eu/regulations/reach/candidate-list-substances-in-articles/notification-of-substances-in-articles).

### ART-010 — Registered-for-that-use exemption
**Module:** exemptions · **Authority:** REACH Article 7(6) · **Scope:** Article 7(1) registration and Article 7(2) notification only
**IF / question:** Verified substance identity AND an existing registration that actually covers its use in the article.
**THEN / effect:** Article 7(1) or 7(2) obligation may be exempt for this substance/use; keep documentary evidence.
**Required evidence:** matching_substance_identity; registration_evidence; precise_use_coverage.
**Guardrails:** Registration somewhere is not enough unless the particular use is covered. This does not waive Article 33 or SCIP duties.
**Traceability:** ECHA 2017 §§3.3.1 and 4.3.2 pp.46–47,59. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-011 — Exclusion-of-exposure notification exemption
**Module:** exemptions · **Authority:** REACH Article 7(3) · **Scope:** Article 7(2) notification ONLY
**IF / question:** Producer/importer can substantiate exclusion of human and environmental exposure during normal or reasonably foreseeable use, including disposal.
**THEN / effect:** Article 7(2) notification exemption can be claimed, with appropriate instructions to recipient and documented basis.
**Required evidence:** use_and_disposal_exposure_assessment; documentary_exclusion_of_exposure; recipient_instructions.
**Guardrails:** Not simply 'no intentional release': migration, abrasion and disposal can still create exposure. Does not exempt Article 33 information obligations or automatically exempt SCIP.
**Traceability:** ECHA 2017 §3.3.2 pp.48–49. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-012 — Registration of intentionally released substances
**Module:** article_7_1 · **Authority:** REACH Article 7(1), 7(6) · **Scope:** EU producers/importers of articles with intended release
**IF / question:** Substance is deliberately released to fulfil an accessory function during normal or reasonably foreseeable use AND total amount of that substance in the relevant articles >1 tonne per actor per year AND no applicable registration exemption.
**THEN / effect:** Registration assessment/registration REQUIRED, unless substance already registered for that use or a general statutory exemption applies.
**Required evidence:** accessory_release_function; conditions_of_use; substance_total_mass_in_articles_tonnes_per_year; registered_for_use; general_exemption_evidence.
**Guardrails:** Count the total substance contained in articles with intended release, not just the fraction expected to be released. Leakage, abrasion, accidental breakage and release during disposal do not by themselves constitute intended release. An intended release does not, without more, trigger an SDS for the article.
**Traceability:** ECHA 2017 §§4.1–4.3 pp.53–59. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).

### ART-013 — SCIP submission (post-2017 obligation)
**Module:** scip · **Authority:** Waste Framework Directive Article 9(1)(i); ECHA SCIP guidance · **Scope:** Relevant suppliers placing articles/complex objects on EU market (EU producers, assemblers, importers, distributors)
**IF / question:** Candidate List SVHC STRICTLY GREATER THAN 0.1% w/w in an article/constituent article placed on EU market, and supplier is covered by SCIP.
**THEN / effect:** SCIP_SUBMISSION_REQUIRED, subject to actor-specific applicability; there is no 1 tonne annual threshold. Direct-to-consumer-only retailers and other exclusively consumer-supplying downstream actors are excluded by ECHA.
**Required evidence:** eu_market_placement; candidate_list_membership_at_assessment_date; component_level_concentration; supplier_type_and_customer_channel.
**Guardrails:** Do not equate Article 7(2) notification to SCIP: the obligations and thresholds differ. The 2017 guidance cannot be cited as support for SCIP: cite the later Waste Framework Directive/ECHA resource.
**Traceability:** NOT in uploaded ECHA June 2017 guidance; applies from 5 January 2021. Sources: [ECHA_SCIP](https://echa.europa.eu/scip-suppliers-of-articles).

### ART-014 — Missing facts, jurisdiction and temporal validity
**Module:** governance · **Authority:** REACH legal text and ECHA guidance legal note · **Scope:** All assessments
**IF / question:** One or more material facts, up-to-date substance status, or jurisdiction/date is unavailable or contradictory.
**THEN / effect:** Return REVIEW_REQUIRED on affected branch and specify exact missing facts; never silently fill in a negative.
**Required evidence:** jurisdiction; assessment_date; rule_version; actor_role; article_component_coverage; evidence_references.
**Guardrails:** This ruleset is for EU/EEA REACH context; do not silently apply to UK REACH or NI-specific conditions. Candidate List membership is time-varying. Capture list date/source. 2017 ECHA guidance is not legislation and predates SCIP. Check Annex XVII restrictions, product-specific rules, national obligations and other REACH provisions separately.
**Traceability:** ECHA 2017 legal note p.2 and §2.6 p.23. Sources: [REACH_2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622), [ECHA_ARTICLES_2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).
## Test questions / expected reasoning (not substitute for engine tests)
- Ordinary verified bicycle with no chemical payload: REACH Article 31 SDS is not required; Article 33, Article 7 and SCIP are **separate** assessments.
- Bicycle contains a screw with 0.20% Candidate List substance: component threshold is exceeded even if the whole bicycle is <0.1%; Article 33 may apply. Do not average over bicycle mass.
- The same screw contains exactly 0.100%: threshold is not exceeded **for that substance/screw**, but other unassessed components keep the overall decision under review.
- Candidate List SVHC >0.1%, with only 0.5 t/year in qualifying articles: Article 33 communication remains potentially required, Article 7(2) >1t requirement is not met; SCIP may still apply.
- Qualifying substance >0.1%, >1t/year, no exemption: Article 7(2) notification trigger, subject to producer/importer role and Candidate List timing.
- Registered for article use? Can exempt Article 7 registration/notification if proven; **never** Article 33.
- Article with scented textile intentionally releasing fragrance: screen total amount of fragrance substance in those articles for Article 7(1), including unreleased part.
- Printer cartridge + toner: assess cartridge as article and toner as chemical separately; do not conclude toner SDS exemption from cartridge status.
- Vehicle pyrotechnic article supplied to professional user: check Directive 2013/29/EU special SDS duty.
- SCIP from 5 January 2021: not present in the uploaded 2017 document. Use later ECHA/WFD source.

## Explicitly OUT OF SCOPE for this v1 knowledge pack
Complete REACH Article 31 mixture hazard/ingredient logic (already implemented separately in the repo); Annex XVII restrictions; substances of concern not on Candidate List; SCIP data-submission format and dossier mechanics; registration tonnage nuances not covered above; national law; UK REACH; product-category-specific controls other than vehicle pyrotechnics; automated live Candidate List lookup; legal advice.

## Sources and provenance
- **REACH_2026** (law): [REACH Regulation (EC) No 1907/2006, consolidated 22 June 2026](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622).
- **ECHA_ARTICLES_2017** (guidance): [ECHA Guidance on requirements for substances in articles, Version 4.0, June 2017](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf).
- **ECHA_NOTIFICATION** (agency_explanation): [ECHA: Notification of substances in articles](https://echa.europa.eu/regulations/reach/candidate-list-substances-in-articles/notification-of-substances-in-articles).
- **ECHA_SCIP** (agency_explanation): [ECHA: SCIP suppliers of articles](https://echa.europa.eu/scip-suppliers-of-articles).
- **PYRO_DIRECTIVE** (law): [Directive 2013/29/EU, Article 11(3)](https://eur-lex.europa.eu/eli/dir/2013/29/oj/eng).
- **ECHA_SME** (agency_explanation): [ECHA: Chemical safety in your business, guidance for SMEs](https://echa.europa.eu/documents/10162/21332507/guide_chemical_safety_sme_en.pdf/09a01b3e-6a31-4311-8eae-8363730a23b3).

**Source separation:** ECHA 2017 supports article definition, Articles 7 and 33 application, concentration scenarios and exemptions. REACH consolidated text supports binding article obligations; 2021+ SCIP and the vehicle-pyrotechnic SDS special case rely on **separate** current/sector sources.