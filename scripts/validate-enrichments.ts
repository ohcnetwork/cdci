/**
 * Validate community enrichment files. Run in CI on every PR.
 *   npx tsx scripts/validate-enrichments.ts
 * Exits non-zero on any error (blocks merge).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { bucketOf } from "../src/lib/shard";

const ROOT = "enrichments";
const TYPES = new Set(["substance", "generic", "brand"]);
const STATUSES = new Set(["draft", "community_reviewed", "expert_approved"]);
const SHARDS = 64;
// Fields that affect prescribing safety → require ≥1 real source + expert sign-off to publish.
const SAFETY_FIELDS = ["indication", "contra_indication", "therapeutic_role"];
const PLACEHOLDER = /^<.*>$/;

const errors: string[] = [];
const seen = new Set<string>();
let count = 0;

function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/.test(s);
}

function validateFile(type: string, shard: string, file: string, path: string) {
  count++;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${path}: invalid JSON — ${(e as Error).message}`);
    return;
  }
  const id = String(data.sctid ?? "");
  const at = (m: string) => errors.push(`${path}: ${m}`);

  if (!/^\d{5,}$/.test(id)) at(`"sctid" must be a numeric SNOMED id`);
  if (data.type !== type) at(`"type" (${data.type}) must match folder "${type}"`);
  if (file !== `${id}.json`) at(`filename must be <sctid>.json (got ${file})`);
  if (id && bucketOf(id, SHARDS) !== Number(shard)) at(`wrong shard: belongs in ${bucketOf(id, SHARDS)}/, not ${shard}/`);
  if (id && seen.has(id)) at(`duplicate enrichment for ${id}`);
  seen.add(id);

  if (!STATUSES.has(String(data.review_status))) at(`"review_status" must be one of ${[...STATUSES].join(", ")}`);
  if (!data.contributor || PLACEHOLDER.test(String(data.contributor))) at(`"contributor" is required (fill in the placeholder)`);

  const sources = Array.isArray(data.sources) ? (data.sources as string[]) : [];
  const realSources = sources.filter((s) => isUrl(s) && !PLACEHOLDER.test(s));

  const touchesSafety = SAFETY_FIELDS.some((f) => data[f]);
  if (touchesSafety) {
    if (realSources.length === 0) at(`safety-affecting fields require at least one source URL`);
    // expert sign-off is enforced at merge via CODEOWNERS; warn if claimed without sources
  }
  if (sources.length && realSources.length === 0) at(`"sources" contains only placeholders — add a real URL or remove`);
}

if (!existsSync(ROOT)) {
  console.log("no enrichments/ directory — nothing to validate");
  process.exit(0);
}

for (const type of readdirSync(ROOT)) {
  if (type === "schema") continue;
  const typeDir = join(ROOT, type);
  if (!TYPES.has(type)) {
    errors.push(`${typeDir}: unknown type folder (expected substance|generic|brand)`);
    continue;
  }
  for (const shard of readdirSync(typeDir)) {
    const shardDir = join(typeDir, shard);
    let files: string[];
    try {
      files = readdirSync(shardDir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".json")) {
        errors.push(`${join(shardDir, f)}: only .json files allowed`);
        continue;
      }
      validateFile(type, shard, f, join(shardDir, f));
    }
  }
}

console.log(`validated ${count} enrichment file(s)`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s):`);
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log("✓ all enrichment files valid");
