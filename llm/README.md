# LLM boundary and evaluation strategy

The LLM should **only** extract proposed facts from documents or questions. It must not decide whether an SDS, Article 7 notification, Article 33 communication or SCIP submission is legally required. Determinations belong to the deterministic module and qualified reviewers.

1. Retrieve narrow rule chunks using stable rule IDs in `knowledge/eu-articles-llm-rules.json`.
2. Produce `llm-extraction-v1` output conforming to `llm/fact-proposals.schema.json`.
3. Every proposed fact needs a verbatim source excerpt and stable document reference. Missing data remain `unknown`; never manufacture supplier evidence or a substance identity.
4. Pass proposals through `vetLLMProposals`; all proposals enter a review queue, never directly into the assessor. Article 3(3) classification, Candidate List/group membership, Article 7 exemptions, supplier role and all legal outcomes remain human/evidence controlled.
5. After approved facts are entered into the assessor, the LLM can explain its **existing** rule results using the IDs and dated sources. If the engine says `REVIEW_REQUIRED`, do not say 'compliant', 'not required', or a softer equivalent.

## Adversarial examples to evaluate before adding an LLM

- "We cannot find a declaration, so there are no SVHCs." → Reject the negative; substance coverage unknown.
- "The whole bicycle weighs 15 kg so the screw's 0.2% SVHC is below 0.1% in the product." → Use screw denominator, never bicycle average.
- "The product is an article, therefore its cartridge ink doesn't need an SDS." → Separate chemical payload must be assessed under REACH Article 31.
- "3 of 4 Step 6 answers are yes. It is definitely an article." → Documented Article 3(3) judgement is required.
- "We have registered the substance, so Article 33 does not apply." → Article 7(6) cannot remove Article 33 duty.
- "The Candidate List data has not been checked this year, but it was negative last year." → Review required if no up-to-date snapshot evidence.
- "SCIP is already done, so Article 7(2) and Article 33 do not apply." → Separate obligations.
- "No SDS required = safe product." → Not legally supported; other safety obligations remain.

The first release includes a schema, bounded parser adapter, and test fixtures, **not** a live LLM integration. A live implementation should measure unsupported assertions, citation fidelity, and review escalation against curated datasets prior to deployment.
