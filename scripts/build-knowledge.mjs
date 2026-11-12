/**
 * Compile the canonical articles knowledge JSON to an offline browser-friendly ES module.
 * Usage: node scripts/build-knowledge.mjs [--check]
 * A check failure means the LLM's catalog and runtime may be out of sync.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "knowledge/eu-articles-llm-rules.json");
const outputPath = path.join(root, "src/generated-article-knowledge.mjs");
const data = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function validate(catalog) {
  if (catalog.schema_version !== 2 || !catalog.version || !Array.isArray(catalog.rules)) throw new Error("Invalid knowledge catalog header");
  if (!catalog.thresholds || !catalog.fact_bindings) throw new Error("Missing executable threshold/field mappings");
  const ids = new Set();
  for (const rule of catalog.rules) {
    if (ids.has(rule.id)) throw new Error("Duplicate rule ID: " + rule.id);
    ids.add(rule.id);
    if (!rule.authority || !rule.machine || !Array.isArray(rule.source_ids) || !rule.source_ids.every(id => Boolean(catalog.sources[id])))
      throw new Error("Invalid legal-source or machine mapping: " + rule.id);
    for (const k of [rule.machine.threshold, ...(rule.machine.thresholds || [])].filter(Boolean)) {
      if (!catalog.thresholds[k]) throw new Error("Missing threshold: " + k);
    }
  }
  const conc = catalog.thresholds.candidate_list_w_w_percent, tonnes = catalog.thresholds.article_7_tonnes_per_year;
  if (conc.operator !== ">" || conc.value !== 0.1 || tonnes.operator !== ">" || tonnes.value !== 1)
    throw new Error("Thresholds changed: legal review and regression updates required");
}
validate(data);

const canonical = {schema_version: data.schema_version, version: data.version, law_as_of: data.last_reviewed,
  thresholds: data.thresholds, fact_bindings: data.fact_bindings, sources: data.sources, rules: data.rules};
const generated = "// Generated from knowledge/eu-articles-llm-rules.json; DO NOT EDIT.\\n" +
  "export const ARTICLE_KNOWLEDGE = Object.freeze(" + JSON.stringify(canonical, null, 2) + ");\\n" +
  "export const ARTICLE_THRESHOLDS = Object.freeze(ARTICLE_KNOWLEDGE.thresholds);\\n" +
  "export const ARTICLE_RULES_BY_ID = Object.freeze(Object.fromEntries(ARTICLE_KNOWLEDGE.rules.map(r => [r.id, r])));\\n";
if (process.argv.includes("--check")) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== generated) {
    process.stderr.write("Generated article knowledge is stale; run node scripts/build-knowledge.mjs\\n");
    process.exit(1);
  }
  console.log("Knowledge compiled artifact is in sync (" + data.rules.length + " rules)");
} else {
  fs.writeFileSync(outputPath, generated);
  console.log("Regenerated " + path.relative(root, outputPath));
}
