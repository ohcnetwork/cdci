/**
 * CLCI Lab-codes build pipeline.
 * CSV (NRCeS Common Lab Codes for India, a LOINC v2.82 subset) → FSN-parsed +
 * categorized → bucketless JSON artifacts + manifest. The dataset is small
 * (~1.5k rows, ~216 KB) so the client loads it whole and searches/facets in
 * memory — no sharding.
 *
 * Run: npm run build:data:labs   (tsx scripts/build-labs.ts)
 *
 * Cleanup is SCOPED to public/data/labs so it never collides with the drug
 * build's output under the shared public/data tree.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseLabCsv } from "./lib/loinc";
import type { LabsManifest, LabTest } from "../src/lib/labs/types";

const SRC = "data/source/clci/common-lab-codes-for-india.csv";
const OVERRIDES = "data/source/clci/categories.json";
const OUT = "public/data/labs";
const LOINC_VERSION = "2.82";
const SOURCE_RELEASE_DATE = "2026-06-29"; // NRCeS CLCI release packaged

function inc(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function main() {
  const t0 = Date.now();
  console.log("→ reading CLCI CSV from", SRC);
  const { tests, skipped } = parseLabCsv(readFileSync(SRC, "utf8"));
  console.log(`  parsed ${tests.length} lab tests (${skipped.length} rows skipped)`);

  // curated discipline overrides (replace derived categories per LOINC code)
  let overrides: Record<string, string[]> = {};
  if (existsSync(OVERRIDES)) {
    try {
      overrides = JSON.parse(readFileSync(OVERRIDES, "utf8"));
    } catch (e) {
      console.warn(`  ! ignoring invalid ${OVERRIDES}: ${(e as Error).message}`);
    }
  }
  let overridden = 0;
  for (const t of tests) {
    const ov = overrides[t.code];
    if (ov && ov.length) {
      t.categories = ov;
      overridden++;
    }
  }
  if (overridden) console.log(`  applied ${overridden} category override(s)`);

  // facet histograms + parse coverage
  const facets = {
    specimen: {} as Record<string, number>,
    scale: {} as Record<string, number>,
    category: {} as Record<string, number>,
  };
  const parse = { parsed: 0, unparsed: 0 };
  const byCode: Record<string, LabTest> = {};
  for (const t of tests) {
    byCode[t.code] = t;
    if (t.parts.status === "parsed") parse.parsed++;
    else parse.unparsed++;
    if (t.specimen) inc(facets.specimen, t.specimen);
    if (t.scale) inc(facets.scale, t.scale);
    for (const c of t.categories) inc(facets.category, c);
  }

  // emit artifacts (scoped cleanup — only our own subtree)
  console.log("→ writing artifacts to", OUT);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "tests.json"), JSON.stringify(byCode));

  const manifest: LabsManifest = {
    count: tests.length,
    loincVersion: LOINC_VERSION,
    sourceReleaseDate: SOURCE_RELEASE_DATE,
    builtAt: new Date().toISOString(),
    facets,
    parse,
  };
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("\n── labs build summary ──────────────────────────");
  console.log("FSN split coverage:", parse);
  console.log("specimens:", Object.keys(facets.specimen).length, "· categories:", Object.keys(facets.category).length);
  if (skipped.length) {
    console.log(`⚠ ${skipped.length} skipped rows (first 3):`, skipped.slice(0, 3));
  }
  console.log(`\n✓ labs done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  if (tests.length === 0) {
    console.error("\n✗ no lab tests parsed — source missing or malformed.");
    process.exitCode = 1;
  }
}

main();
