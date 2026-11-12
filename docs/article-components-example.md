# Advanced article component input and audit model

The advanced editor accepts a JSON object with two properties: `articleComponents` (array) and `articleAssessment` (object). It is optional. Leave it blank to keep the original Article 31 SDS and Article 33 screening workflow.

**Illustration only:** The identifiers and the alleged Candidate List status below are synthetic. The ECHA link is a source location, **not** evidence that these fictional substances are listed. Replace all data with dated, validated facts before using regulatory decisions.

```json
{
  "articleComponents": [
    {
      "id": "fastener-1",
      "massGrams": 10,
      "annualUnits": 10000,
      "allSubstancesChecked": "yes",
      "substances": [
        {
          "substanceId": "REPLACE-WITH-IDENTITY",
          "name": "REPLACE-WITH-REAL-NAME",
          "candidateList": "unknown",
          "retainedMassGrams": 0.02,
          "referenceBasis": "constituent_article",
          "evidenceIds": ["REPLACE-WITH-SUPPLIER-DECLARATION"],
          "intendedRelease": "no",
          "registeredForUse": "unknown",
          "exposureExcluded": "unknown",
          "recipientInstructionsProvided": "unknown",
          "preListingOnly": "unknown",
          "registrationEvidenceId": "",
          "registeredUseDescription": "",
          "exposureEvidenceId": "",
          "preListingEvidenceId": "",
          "listingDate": "",
          "latestProductionImportDate": ""
        }
      ]
    }
  ],
  "articleAssessment": {
    "assessmentDate": "2026-11-12",
    "actorRole": "importer",
    "placedOnEUMarket": "yes",
    "allComponentsChecked": "yes",
    "candidateListSnapshot": {
      "asOf": "2026-11-12",
      "sourceUrl": "https://echa.europa.eu/candidate-list-table",
      "evidenceId": "REPLACE-WITH-ACTUAL-DATED-SNAPSHOT"
    },
    "evidenceRegister": [
      {
        "id": "REPLACE-WITH-SUPPLIER-DECLARATION",
        "type": "supplier_declaration",
        "documentRef": "supplier-document-reference",
        "reviewed": "no"
      }
    ],
    "review": {"reviewer": null, "approved": false, "date": null}
  }
}
```

## Data model details

- **Constituent articles:** each `id` must be unique; the `massGrams` value is for the individual article, not a whole assembled product.
- **Substances:** each `substanceId` must identify the same chemical across relevant article records. Group-entry or salt interpretations require expert confirmation; absence of a CAS number from a simple lookup is **not** evidence of absence from the Candidate List.
- **Mass and reference basis:** `retainedMassGrams` is the mass remaining in the supplied article. A `referenceBasis` of `joining_or_coating_complex_object` requires `referenceMassGrams`, `incorporationStage: "joined_or_coated_assembled_object"`, and a nonempty `referenceEvidenceId` explaining the ECHA Table 5 denominator.
- **Annual quantity:** `annualUnits` is the number of each specific article/component made/imported by the assessed actor per year. Totals for the same substance are aggregated for Article 7, but not for Article 33's concentration threshold. Ensure quantities do not double-count one constituent across multiple BOM representations.
- **Article 7(2) exemptions:** `registeredForUse` must cover the actual use, supported by `registrationEvidenceId` and `registeredUseDescription`. `exposureExcluded` requires `exposureEvidenceId` covering normal and reasonably foreseeable use, disposal, and `recipientInstructionsProvided: "yes"`. `preListingOnly` requires the relevant `listingDate`, `latestProductionImportDate` strictly before inclusion, and `preListingEvidenceId`. Mixed or uncertain exemptions require review.
- **Article 7(1):** `intendedRelease` is a substance-by-substance, normal/foreseeable-use fact. Total relevant substance mass, not just released amount, counts against the quantity trigger.
- **EU supply and SCIP:** Article 33 and SCIP require an assessed EU supply/market context. SCIP actor scope is separately assessed. This module does **not** prepare a SCIP dossier or decide all supply-chain special cases.
- **Candidate List:** a dated `candidateListSnapshot` is a **user assertion** backed by an evidence ID. The offline application cannot authenticate the supplied dataset or determine whether a substance belongs to a group entry. Missing or stale metadata prevents negative Article 33/SCIP/7(2) assessments.
- **Audit:** downloaded records include facts, rule versions, evidence identifiers, open questions, and (when WebCrypto is available) a SHA-256 fingerprint of the report. That fingerprint is not a signature or regulatory approval.

## Outcomes

`REQUIRED`, `NOT_REQUIRED`, `REVIEW_REQUIRED`, or `NOT_APPLICABLE` are reported **per duty**. The ordinary article SDS answer is independent of the Article 7, Article 33, and SCIP results.

## Authentic sources

- [REACH Articles 3, 7, 31, 33](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622)
- [ECHA articles guidance, v4.0 2017, Figure 2 and Table 5](https://echa.europa.eu/documents/10162/2324906/articles_en.pdf)
- [ECHA notification of substances in articles](https://echa.europa.eu/regulations/reach/candidate-list-substances-in-articles/notification-of-substances-in-articles)
- [ECHA SCIP supplier obligations](https://echa.europa.eu/scip-suppliers-of-articles)
- [Authentic ECHA Candidate List](https://echa.europa.eu/candidate-list-table)
