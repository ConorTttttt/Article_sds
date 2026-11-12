/**
 * Create a deterministic checksum manifest of an ECHA Candidate List export.
 * Does NOT validate substance membership, group entries or source authenticity.
 * Usage: node scripts/candidate-list-manifest.mjs ECHA-export.csv YYYY-MM-DD
 */
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
const [file,asOf] = process.argv.slice(2);
if (!file || !/^\d{4}-\d{2}-\d{2}$/.test(asOf||"") || Number.isNaN(Date.parse(asOf))) {
  process.stderr.write("Usage: node scripts/candidate-list-manifest.mjs <local-file> YYYY-MM-DD\n");
  process.exit(2);
}
const input=fs.readFileSync(file);
const manifest={
  schema:"candidate-list-evidence-manifest-v1",
  asOf,
  filename:path.basename(file),
  bytes:input.length,
  sha256:createHash("sha256").update(input).digest("hex"),
  declaredSource:"https://echa.europa.eu/candidate-list-table",
  evidentiaryNotice:"Hash proves only integrity of this local file, not ECHA origin or completeness of grouped substance entries."
};
process.stdout.write(JSON.stringify(manifest,null,2)+"\n");
