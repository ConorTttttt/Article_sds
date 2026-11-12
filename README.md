# EU Article SDS — deterministic legal decision support

A static, offline-first application that explains **when a safety data sheet (SDS) must be provided under selected EU laws**, with special emphasis on distinguishing REACH **articles** from **substances/mixtures**.

**Status:** MVP screening tool, **not** regulatory certification or a chemical classification engine. No AI or probabilistic decisions are involved in assessments. Unknown facts lead to **Further assessment needed**, never an invented conclusion.

## Run it

1. Open `index.html` with a static HTTP server. For example, from the repository root:
   ```sh
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000`.
3. Select a product category, enter known facts, assess and optionally download the JSON audit record.

The site has no npm dependencies or server-side processing. Assessment results remain in the user's browser. It can be hosted on GitHub Pages from the repository root (Settings → Pages → Deploy from branch), after merging the implementation branch.

## Deterministic result states

| Status | Meaning |
| --- | --- |
| `REQUIRED` | A specified legal SDS trigger was found for the assessed supply, subject to the stated scope. |
| `NOT_REQUIRED` | No SDS trigger was found **under the assessed rules and confirmed factual inputs**. |
| `REQUIRED_ON_REQUEST` | SDS is required if the relevant recipient requests it; not automatically required to be sent. |
| `NOT_REQUIRED_FOR_THIS_SUPPLY` | An SDS can be withheld for this particular recipient/transaction under a specified supply exception. |
| `REVIEW_REQUIRED` | A necessary legal or factual element remains unknown; a negative conclusion is prohibited. |

The Article 33 communication assessment is **separate** from SDS status.

## Implemented legal branches

1. **REACH Article 3(3):** Article identification must be based on whether shape, surface or design determines function more than chemical composition. The UI asks for a **user-supported classification**: it does not automatically label an object an article.
2. **REACH Article 31(1):** Hazardous substances/mixtures and PBT, vPvB or Candidate List substances can require an SDS.
3. **REACH Annex II section 0.7:** SDSs are also required for the CLP Annex I 1.3 labelling-derogation special cases. The assessor asks this explicitly; an unknown answer blocks a negative decision.
4. **REACH Article 31(3):** For non-hazard-classified mixtures, the tool screens *individual* ingredient concentrations for request-only SDS duties: ordinary human-health/environmental hazard `>=1% w/w` non-gas or `>=0.2% v/v` gas; specified special hazards `>=0.1% w/w` non-gas; Union workplace exposure limits. Certain CLP endocrine-disruptor category 2 mixture request notes (`>=0.1%`) are included. The user must confirm that all ingredients, relevant classifications and specific limits were reviewed for a negative result.
5. **REACH Article 31(4):** General-public supply where adequate safe-use information is available may not need automatic SDS delivery; downstream-user or distributor requests override the exception.
6. **REACH Article 33:** A Candidate List SVHC **above** `0.1% w/w` of an **individual constituent article** triggers safe-use information (minimum: substance name) to business recipients and, on consumer request, a response within **45 days**.
7. **Directive 2013/29/EU Article 11(3):** Vehicle pyrotechnic articles require an SDS for professional users, in the requested language.
8. **Article plus chemical payload:** For a cartridge, wipe or similar combination, the chemical substance/mixture requires a **separate** SDS assessment. The engine does not assume the whole combination is exempt.

Source texts are linked directly in `src/rules.mjs`. The pinned baseline is **EU REACH consolidated 22 June 2026**, reviewed for this implementation on **12 November 2026**. `RULESET_VERSION` is part of every result.

## Important boundaries

- **Jurisdiction:** EU law only. Do not apply results to UK REACH, Northern Ireland-specific circumstances, or other jurisdictions without a separate ruleset.
- **No automatic CLP classification:** You must supply documented classification, ingredient identity, and Candidate List status. The tool does not retrieve ECHA live data or calculate mixture CLP hazard classification, harmonised classification, SCLs, M-factors or ATEs.
- **Not all legislation covered:** REACH Article 2 exclusions/derogations, sector-specific law (e.g. medical, food, cosmetics, waste), national implementation, REACH Article 7 registration/notification, Article 32 communication, SCIP, Annex XVII restrictions, and other cases require separate assessment.
- **Temporal validity:** The assessed legal rules are pinned, not updated automatically. Changes to CLP (including endocrine-disruptor transitional provisions), Annex II and REACH or the Candidate List may affect an assessment. Verify applicable effective dates and any transition rules for the item.
- **Article 33 completeness:** The concentration threshold applies to each constituent article in complex objects. Checking only the weight of an assembled product is insufficient. User attestations of full coverage are not independently verified.
- **Positive mixture screening is narrower than full classification:** All relevant hazard classes and specific concentration limits must be assessed by a competent classifier. A `NOT_REQUIRED` result is conditional on that input attestation, and should not be used as a substitute for a full legal/chemical assessment.
- **SDS absence does not mean absence of safety duties:** Article 33, Article 32, Article 7 and other EU duties may still apply.

## Legal references

- [REACH Regulation (EC) 1907/2006, consolidated 22 June 2026 (Articles 3, 31, 33)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02006R1907-20260622)
- [Directive 2013/29/EU, Article 11(3)](https://eur-lex.europa.eu/eli/dir/2013/29/oj/eng)
- [Commission Regulation (EU) 2020/878, Annex II section 0.7](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0878)
- [Commission Delegated Regulation (EU) 2023/707 (CLP endocrine-disruptor classes)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0707)
- [ECHA Guidance in a Nutshell: Requirements for substances in articles (2017)](https://echa.europa.eu/documents/10162/2324906/nutshell_guidance_articles2_en.pdf)
- [ECHA: Extended safety data sheets](https://echa.europa.eu/safety-data-sheets)

## Testing

Run `node --test tests/*.test.mjs` on Node 20+ (or `npm test`). Tests cover SDS triggers, conditions, uncertain facts, and the 0.1% Article 33 boundary. GitHub Actions reruns the tests on pushes and pull requests.

## Project structure

```text
index.html              # Accessible form, report container
src/app.mjs             # UI interactions and downloadable JSON record
src/rules.mjs           # Pure deterministic legal engine and source citations
src/styles.css          # Responsive visual design
tests/rules.test.mjs    # Regression tests
.github/workflows/test.yml
```

## Recommended next iteration

Add (1) country/jurisdiction and product-specific exemption modules, (2) validated substance and Candidate List datasets with publication dates and effective dates, (3) a complete CLP/REACH Annex II classification and composition input model, (4) structured attached evidence, and (5) reviewer sign-off with immutable legal-version/hash references. Keep any future AI assistance **outside** the rule engine: it may explain provisions or propose fields, but not determine legal status.
