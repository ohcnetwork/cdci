// No-backend community contribution: build prefilled GitHub URLs so a user
// commits an enrichment file to their fork and opens a PR entirely in GitHub's UI.
import { bucketOf } from "./shard";
import type { ConceptDoc } from "./types";

export const REPO = "ohcnetwork/cdci";
const BRANCH = "main";
const ENRICH_BUCKETS = 64;

/** Enrichment overlay template, mirroring the fields the build merges by SCTID.
 *  Safety-affecting fields require curator sign-off (see GOVERNANCE.md). */
function template(c: ConceptDoc) {
  const base = {
    sctid: c.id,
    type: c.type,
    name: c.name,
    review_status: "draft",
    contributor: "<your name or @handle>",
    sources: ["<URL to an authoritative reference — required>"],
    evidence_type: "<regulatory | clinical_trial | literature | label>",
  };
  if (c.type === "generic") {
    return {
      ...base,
      therapeutic_role: "",
      indication: "",
      contra_indication: "",
      classification: "",
      // strength corrections: [{ substance_sctid, value, unit_ucum, denom_value, denom_unit_ucum }]
      strength_corrections: [],
      base_unit_ucum: "",
    };
  }
  if (c.type === "substance") {
    return { ...base, rxcui: [], atc: [], notes: "" };
  }
  return { ...base, notes: "" };
}

export function suggestEditUrl(c: ConceptDoc): string {
  const shard = bucketOf(c.id, ENRICH_BUCKETS);
  const path = `enrichments/${c.type}/${shard}/${c.id}.json`;
  const value = JSON.stringify(template(c), null, 2);
  const qs = new URLSearchParams({ filename: path, value });
  return `https://github.com/${REPO}/new/${BRANCH}?${qs.toString()}`;
}

export function reportIssueUrl(c: ConceptDoc): string {
  const title = `Data issue: ${c.name} (${c.id})`;
  const body = [
    `**Concept:** \`${c.type}\` / SCTID \`${c.id}\``,
    `**Name:** ${c.name}`,
    "",
    "**What's wrong / what should it be?**",
    "",
    "<!-- Please add a source or reference if you can. -->",
  ].join("\n");
  const qs = new URLSearchParams({ title, body, labels: "data-quality" });
  return `https://github.com/${REPO}/issues/new?${qs.toString()}`;
}
