// Generated from knowledge/eu-articles-llm-rules.json; DO NOT EDIT.
export const ARTICLE_KNOWLEDGE = Object.freeze({
  "schema_version": 2,
  "version": "eu-articles-llm-2026-11-12-v2",
  "law_as_of": "2026-11-12",
  "thresholds": {
    "candidate_list_w_w_percent": {
      "operator": ">",
      "value": 0.1,
      "unit": "percent_w_w",
      "reference": "relevant constituent article or documented ECHA Table 5 scenario"
    },
    "article_7_tonnes_per_year": {
      "operator": ">",
      "value": 1,
      "unit": "tonnes_per_actor_year",
      "reference": "relevant qualifying articles for Article 7(2); all intended-release articles for Article 7(1)"
    },
    "article_33_consumer_response_days": {
      "operator": "<=",
      "value": 45,
      "unit": "calendar_days"
    },
    "scip_first_effective_date": "2021-01-05"
  },
  "fact_bindings": {
    "object_function": "classification.function",
    "shape_surface_design_vs_chemistry": "classification.shapeDominates",
    "separable_chemical": "classification.separableChemical",
    "step4_delivery_indicators": "classification.q4a..q4c",
    "step5_integral_indicators": "classification.q5a..q5c",
    "step6_indicators": "classification.q6a..q6d",
    "step6_reviewed_conclusion": "classification.step6Conclusion",
    "step6_rationale": "classification.step6Rationale",
    "product_type": "productType",
    "legacy_candidate_list_present": "candidateListPresent",
    "legacy_component_coverage": "allComponentsChecked",
    "components": "articleComponents[]",
    "components_all_reviewed": "articleAssessment.allComponentsChecked",
    "candidate_list_snapshot": "articleAssessment.candidateListSnapshot",
    "supplier_role": "articleAssessment.actorRole",
    "eu_market": "articleAssessment.placedOnEUMarket",
    "substance_identity": "articleComponents[].substances[].substanceId",
    "substance_retained_mass": "articleComponents[].substances[].retainedMassGrams",
    "amount_produced_per_year": "articleComponents[].annualUnits",
    "registered_for_use": "articleComponents[].substances[].registeredForUse",
    "exposure_excluded": "articleComponents[].substances[].exposureExcluded"
  },
  "sources": {
    "REACH_2026": {
      "title": "REACH Regulation (EC) No 1907/2006, consolidated 22 June 2026",
      "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622",
      "kind": "law"
    },
    "ECHA_ARTICLES_2017": {
      "title": "ECHA Guidance on requirements for substances in articles, Version 4.0, June 2017",
      "url": "https://echa.europa.eu/documents/10162/2324906/articles_en.pdf",
      "kind": "guidance"
    },
    "ECHA_NOTIFICATION": {
      "title": "ECHA: Notification of substances in articles",
      "url": "https://echa.europa.eu/regulations/reach/candidate-list-substances-in-articles/notification-of-substances-in-articles",
      "kind": "agency_explanation"
    },
    "ECHA_SCIP": {
      "title": "ECHA: SCIP suppliers of articles",
      "url": "https://echa.europa.eu/scip-suppliers-of-articles",
      "kind": "agency_explanation"
    },
    "PYRO_DIRECTIVE": {
      "title": "Directive 2013/29/EU, Article 11(3)",
      "url": "https://eur-lex.europa.eu/eli/dir/2013/29/oj/eng",
      "kind": "law"
    },
    "ECHA_SME": {
      "title": "ECHA: Chemical safety in your business, guidance for SMEs",
      "url": "https://echa.europa.eu/documents/10162/21332507/guide_chemical_safety_sme_en.pdf/09a01b3e-6a31-4311-8eae-8363730a23b3",
      "kind": "agency_explanation"
    }
  },
  "rules": [
    {
      "id": "ART-001",
      "module": "classification",
      "title": "Legal definition and classification gate",
      "authority": "REACH Article 3(3)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §§2.1–2.3, Figure 2, pp.16–21",
      "scope": "Each object/constituent object",
      "trigger": "Decide the intended function, then whether shape, surface or design determines that function more than chemical composition.",
      "effect": "Article if physical form dominates; otherwise substance or mixture. If borderline, record REVIEW_REQUIRED rather than guessing.",
      "required_facts": [
        "object_function",
        "shape_surface_design_vs_chemistry",
        "classification_evidence"
      ],
      "cautions": [
        "An object marketed as a 'product' is not necessarily an article.",
        "ECHA indicative questions aid judgement; they are not alternative legal definitions."
      ],
      "machine": {
        "runtime": "classifyObject",
        "mode": "documented_judgement",
        "fact_paths": [
          "classification.function",
          "classification.shapeDominates"
        ]
      }
    },
    {
      "id": "ART-002",
      "module": "classification",
      "title": "Ambiguous container or carrier",
      "authority": "REACH Article 3(3); ECHA indicative Steps 3–5",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §2.3 pp.18–20; Appendix 3",
      "scope": "Borderline object with separable substance/mixture",
      "trigger": "If Step 2 is inconclusive, determine whether a substance or mixture can be physically separated. If yes, assess whether it works without the carrier, whether the carrier mainly delivers it, and whether it is used up before the carrier is discarded (Step 4). Cross-check integral-content questions in Step 5 if Step 4 points away from a combination.",
      "effect": "Potential ARTICLE_PLUS_SUBSTANCE_OR_MIXTURE (printer cartridge) or ARTICLE_WITH_INTEGRAL_CONTENT (thermometer). Separate chemical payload needs a distinct SDS assessment.",
      "required_facts": [
        "separable_chemical",
        "step4_delivery_indicators",
        "step5_integral_indicators"
      ],
      "cautions": [
        "Do not treat separable hazardous ink as exempt merely because the cartridge is an article.",
        "Where relevant indicators conflict, REVIEW_REQUIRED."
      ],
      "machine": {
        "runtime": "classifyObject",
        "mode": "indicative",
        "fact_paths": [
          "classification.separableChemical",
          "classification.q4a..q4c",
          "classification.q5a..q5c"
        ]
      }
    },
    {
      "id": "ART-003",
      "module": "classification",
      "title": "Further processing and packaging",
      "authority": "REACH Article 3(3); ECHA indicative Step 6",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §§2.3–2.5 pp.21–23",
      "scope": "Semifinished materials, complex products, packaging",
      "trigger": "For unclear objects without a separable chemical, evaluate intended end-use, purchase rationale, light vs gross shape changes during further processing, and chemical-composition changes. Treat packaging as a separate article.",
      "effect": "Classification supported by evidence; no automatic result from material solidity or packaging alone.",
      "required_facts": [
        "end_use",
        "further_processing",
        "packaging_components"
      ],
      "cautions": [
        "A complex object contains distinct constituent articles; assembly normally does not erase their article status."
      ],
      "machine": {
        "runtime": "classifyObject",
        "mode": "human_review_required_at_step6",
        "fact_paths": [
          "classification.q6a..q6d",
          "classification.step6Conclusion",
          "classification.step6Rationale",
          "classification.step6RelevantQuestionsReviewed"
        ]
      }
    },
    {
      "id": "ART-004",
      "module": "sds",
      "title": "Ordinary article is outside REACH Article 31 SDS duty",
      "authority": "REACH Article 31 and Article 3(3)",
      "source_ids": [
        "REACH_2026",
        "ECHA_SME"
      ],
      "guidance": "The uploaded 2017 ECHA article guidance covers Articles 7 and 33, not a standalone Article 31 SDS duty.",
      "scope": "Confirmed ordinary article",
      "trigger": "Product is a confirmed article, without an independently supplied substance/mixture and without an applicable sector-specific SDS rule.",
      "effect": "REACH Article 31 SDS NOT_REQUIRED for the article as such; evaluate the Article 33, Article 7 and SCIP duties independently.",
      "required_facts": [
        "confirmed_article_classification",
        "separate_chemical_payload",
        "special_article_regime"
      ],
      "cautions": [
        "Do not infer that an article containing a classified hazardous substance, or a Candidate List substance above 0.1%, requires an SDS.",
        "Unknown pyrotechnic/other sector regime may require REVIEW_REQUIRED rather than an unconditional global 'no SDS'."
      ],
      "machine": {
        "runtime": "assess",
        "mode": "classification_based",
        "fact_paths": [
          "productType",
          "classification",
          "separateChemicalPayload",
          "pyrotechnicVehicle"
        ]
      }
    },
    {
      "id": "ART-005",
      "module": "sds",
      "title": "Substance or mixture supplied with an article",
      "authority": "REACH Article 31",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §2.3 p.20, printer cartridge example",
      "scope": "Article-plus-chemical combinations (e.g., printer cartridge with ink)",
      "trigger": "The product includes a distinct substance/mixture on or in a carrier/container.",
      "effect": "Assess substance or mixture independently under REACH Article 31 (including its applicable triggers and supply exceptions); do not conclude NOT_REQUIRED from the article's status.",
      "required_facts": [
        "chemical_payload_classification",
        "recipient_supply_context"
      ],
      "cautions": [
        "Never collapse article and chemical payload into one legal classification."
      ],
      "machine": {
        "runtime": "assess",
        "mode": "separate_payload_review",
        "fact_paths": [
          "separateChemicalPayload"
        ]
      }
    },
    {
      "id": "ART-006",
      "module": "sds",
      "title": "Vehicle pyrotechnic article special SDS duty",
      "authority": "Directive 2013/29/EU Article 11(3)",
      "source_ids": [
        "PYRO_DIRECTIVE"
      ],
      "guidance": "Not derived from ECHA 2017 articles guidance; sector-specific law",
      "scope": "Pyrotechnic articles for vehicles supplied to professional users",
      "trigger": "The article is a vehicle pyrotechnic article and is supplied to a professional user.",
      "effect": "SDS compiled under REACH Annex II is REQUIRED for the professional user in the requested language.",
      "required_facts": [
        "vehicle_pyrotechnic_article",
        "professional_recipient"
      ],
      "cautions": [
        "This is an exception to 'no SDS for articles' under sector-specific legislation, not a REACH Article 31 article rule."
      ],
      "machine": {
        "runtime": "assess",
        "mode": "sector",
        "fact_paths": [
          "pyrotechnicVehicle",
          "professionalRecipient"
        ]
      }
    },
    {
      "id": "ART-007",
      "module": "article_33",
      "title": "Candidate List communication to recipients and consumers",
      "authority": "REACH Article 33(1) and 33(2)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §§3.2.1, 3.4.1 pp.26–27, 49–51",
      "scope": "Supplier of article, including any constituent article of a complex object",
      "trigger": "Candidate List substance present at STRICTLY GREATER THAN 0.1% w/w in any relevant article.",
      "effect": "Provide sufficient safe-use information, at minimum substance name, to professional/business recipients; to consumers on request free of charge within 45 days. No annual tonnage threshold.",
      "required_facts": [
        "current_candidate_list_status",
        "substance_identity",
        "each_relevant_article_mass",
        "svhc_retained_mass_or_percent",
        "supplier_role"
      ],
      "cautions": [
        "At exactly 0.1% this specific >0.1% trigger is not met.",
        "The tonnage threshold and Article 7 exemptions do not remove Article 33.",
        "No SDS substitute is required; an Article 33 information format can be used."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "threshold",
        "threshold": "candidate_list_w_w_percent",
        "fact_paths": [
          "articleComponents[].substances[]",
          "articleAssessment"
        ]
      }
    },
    {
      "id": "ART-008",
      "module": "threshold",
      "title": "Concentration denominator and component rule",
      "authority": "REACH Article 33; CJEU C-106/14; ECHA Table 5",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §3.2.3.1 Table 5 pp.33–36 and Preface p.3",
      "scope": "Each constituent article within a complex object, with documented joining/coating cases",
      "trigger": "Calculate retained Candidate List substance mass as percent of correct reference mass: usually the individual constituent article; for a substance incorporated by joining or coating a complex object use the applicable ECHA Table 5 reference scenario.",
      "effect": "Apply percent = (retained SVHC mass / relevant reference mass)*100 separately for each relevant substance and component/reference basis.",
      "required_facts": [
        "reference_basis",
        "retained_substance_mass",
        "reference_object_mass",
        "joining_or_coating_production_stage"
      ],
      "cautions": [
        "Never dilute an SVHC in a screw or other constituent article over the total bicycle/vehicle mass.",
        "Dry coatings, adhesives, and EU assembly stages require specific scenario review; do not assume one universal denominator.",
        "Averaging across different article types can conceal a positive obligation."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "calculation",
        "fact_paths": [
          "articleComponents[].massGrams",
          "articleComponents[].substances[].retainedMassGrams",
          "articleComponents[].substances[].referenceBasis"
        ]
      }
    },
    {
      "id": "ART-009",
      "module": "article_7_2",
      "title": "Candidate List Article 7(2) notification",
      "authority": "REACH Article 7(2), 7(3), 7(6), 7(7)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017",
        "ECHA_NOTIFICATION"
      ],
      "guidance": "ECHA 2017 §§3.2.2, 3.2.3, 3.3 pp.27–49",
      "scope": "EU article producers and importers; per actor and per substance",
      "trigger": "Candidate List substance >0.1% w/w in relevant article(s), AND total amount of that substance in those relevant articles >1 tonne/actor/year, AND no applicable exemption.",
      "effect": "NOTIFICATION_REQUIRED; ECHA indicates deadline no later than six months after Candidate List inclusion. Below/equal either strict numeric threshold => no Article 7(2) notification trigger for that substance on known facts.",
      "required_facts": [
        "candidate_list_date",
        "producer_or_importer_role",
        "each_relevant_article_concentration",
        "substance_tonnes_in_relevant_articles_per_actor_per_year",
        "exemption_evidence"
      ],
      "cautions": [
        "Aggregate substance mass across relevant qualifying articles, not only total finished-product mass.",
        "An assembler of pre-existing EU-supplied articles without adding substances normally does not repeat upstream notification; see ECHA Table 3.",
        "Article 33 can apply even where 7(2) does not."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "two_thresholds",
        "thresholds": [
          "candidate_list_w_w_percent",
          "article_7_tonnes_per_year"
        ],
        "fact_paths": [
          "articleComponents[]",
          "articleAssessment.actorRole"
        ]
      }
    },
    {
      "id": "ART-010",
      "module": "exemptions",
      "title": "Registered-for-that-use exemption",
      "authority": "REACH Article 7(6)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §§3.3.1 and 4.3.2 pp.46–47,59",
      "scope": "Article 7(1) registration and Article 7(2) notification only",
      "trigger": "Verified substance identity AND an existing registration that actually covers its use in the article.",
      "effect": "Article 7(1) or 7(2) obligation may be exempt for this substance/use; keep documentary evidence.",
      "required_facts": [
        "matching_substance_identity",
        "registration_evidence",
        "precise_use_coverage"
      ],
      "cautions": [
        "Registration somewhere is not enough unless the particular use is covered.",
        "This does not waive Article 33 or SCIP duties."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "exemption",
        "fact_paths": [
          "articleComponents[].substances[].registeredForUse"
        ]
      }
    },
    {
      "id": "ART-011",
      "module": "exemptions",
      "title": "Exclusion-of-exposure notification exemption",
      "authority": "REACH Article 7(3)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §3.3.2 pp.48–49",
      "scope": "Article 7(2) notification ONLY",
      "trigger": "Producer/importer can substantiate exclusion of human and environmental exposure during normal or reasonably foreseeable use, including disposal.",
      "effect": "Article 7(2) notification exemption can be claimed, with appropriate instructions to recipient and documented basis.",
      "required_facts": [
        "use_and_disposal_exposure_assessment",
        "documentary_exclusion_of_exposure",
        "recipient_instructions"
      ],
      "cautions": [
        "Not simply 'no intentional release': migration, abrasion and disposal can still create exposure.",
        "Does not exempt Article 33 information obligations or automatically exempt SCIP."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "exemption",
        "fact_paths": [
          "articleComponents[].substances[].exposureExcluded"
        ]
      }
    },
    {
      "id": "ART-012",
      "module": "article_7_1",
      "title": "Registration of intentionally released substances",
      "authority": "REACH Article 7(1), 7(6)",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 §§4.1–4.3 pp.53–59",
      "scope": "EU producers/importers of articles with intended release",
      "trigger": "Substance is deliberately released to fulfil an accessory function during normal or reasonably foreseeable use AND total amount of that substance in the relevant articles >1 tonne per actor per year AND no applicable registration exemption.",
      "effect": "Registration assessment/registration REQUIRED, unless substance already registered for that use or a general statutory exemption applies.",
      "required_facts": [
        "accessory_release_function",
        "conditions_of_use",
        "substance_total_mass_in_articles_tonnes_per_year",
        "registered_for_use",
        "general_exemption_evidence"
      ],
      "cautions": [
        "Count the total substance contained in articles with intended release, not just the fraction expected to be released.",
        "Leakage, abrasion, accidental breakage and release during disposal do not by themselves constitute intended release.",
        "An intended release does not, without more, trigger an SDS for the article."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "threshold",
        "threshold": "article_7_tonnes_per_year",
        "fact_paths": [
          "articleComponents[].substances[].intendedRelease",
          "articleComponents[].annualUnits"
        ]
      }
    },
    {
      "id": "ART-013",
      "module": "scip",
      "title": "SCIP submission (post-2017 obligation)",
      "authority": "Waste Framework Directive Article 9(1)(i); ECHA SCIP guidance",
      "source_ids": [
        "ECHA_SCIP"
      ],
      "guidance": "NOT in uploaded ECHA June 2017 guidance; applies from 5 January 2021",
      "scope": "Relevant suppliers placing articles/complex objects on EU market (EU producers, assemblers, importers, distributors)",
      "trigger": "Candidate List SVHC STRICTLY GREATER THAN 0.1% w/w in an article/constituent article placed on EU market, and supplier is covered by SCIP.",
      "effect": "SCIP_SUBMISSION_REQUIRED, subject to actor-specific applicability; there is no 1 tonne annual threshold. Direct-to-consumer-only retailers and other exclusively consumer-supplying downstream actors are excluded by ECHA.",
      "required_facts": [
        "eu_market_placement",
        "candidate_list_membership_at_assessment_date",
        "component_level_concentration",
        "supplier_type_and_customer_channel"
      ],
      "cautions": [
        "Do not equate Article 7(2) notification to SCIP: the obligations and thresholds differ.",
        "The 2017 guidance cannot be cited as support for SCIP: cite the later Waste Framework Directive/ECHA resource."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "threshold",
        "threshold": "candidate_list_w_w_percent",
        "fact_paths": [
          "articleComponents[]",
          "articleAssessment.placedOnEUMarket",
          "articleAssessment.actorRole"
        ]
      }
    },
    {
      "id": "ART-014",
      "module": "governance",
      "title": "Missing facts, jurisdiction and temporal validity",
      "authority": "REACH legal text and ECHA guidance legal note",
      "source_ids": [
        "REACH_2026",
        "ECHA_ARTICLES_2017"
      ],
      "guidance": "ECHA 2017 legal note p.2 and §2.6 p.23",
      "scope": "All assessments",
      "trigger": "One or more material facts, up-to-date substance status, or jurisdiction/date is unavailable or contradictory.",
      "effect": "Return REVIEW_REQUIRED on affected branch and specify exact missing facts; never silently fill in a negative.",
      "required_facts": [
        "jurisdiction",
        "assessment_date",
        "rule_version",
        "actor_role",
        "article_component_coverage",
        "evidence_references"
      ],
      "cautions": [
        "This ruleset is for EU/EEA REACH context; do not silently apply to UK REACH or NI-specific conditions.",
        "Candidate List membership is time-varying. Capture list date/source.",
        "2017 ECHA guidance is not legislation and predates SCIP.",
        "Check Annex XVII restrictions, product-specific rules, national obligations and other REACH provisions separately."
      ],
      "machine": {
        "runtime": "assessArticleObligations",
        "mode": "gate",
        "fact_paths": [
          "articleAssessment.allComponentsChecked",
          "articleAssessment.candidateListSnapshot",
          "articleComponents[].substances[].evidenceIds"
        ]
      }
    }
  ]
});
export const ARTICLE_THRESHOLDS = Object.freeze(ARTICLE_KNOWLEDGE.thresholds);
export const ARTICLE_RULES_BY_ID = Object.freeze(Object.fromEntries(ARTICLE_KNOWLEDGE.rules.map(r => [r.id, r])));
