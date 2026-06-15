import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface EnrichmentFile {
  sctid: string;
  type: "substance" | "generic" | "brand";
  review_status?: "draft" | "community_reviewed" | "expert_approved";
  contributor?: string;
  sources?: string[];
  evidence_type?: string;
  updated_at?: string;
  // generic fields
  therapeutic_role?: string;
  indication?: string;
  contra_indication?: string;
  classification?: string;
  base_unit_ucum?: string;
  // substance fields
  rxcui?: string[];
  atc?: string[];
  notes?: string;
}

/** Walk enrichments/<type>/<shard>/<sctid>.json into a Map keyed by SCTID. */
export function loadEnrichments(dir: string): Map<string, EnrichmentFile> {
  const out = new Map<string, EnrichmentFile>();
  if (!existsSync(dir)) return out;
  for (const type of ["substance", "generic", "brand"]) {
    const typeDir = join(dir, type);
    if (!existsSync(typeDir)) continue;
    for (const shard of readdirSync(typeDir)) {
      const shardDir = join(typeDir, shard);
      let files: string[] = [];
      try {
        files = readdirSync(shardDir).filter((f) => f.endsWith(".json"));
      } catch {
        continue;
      }
      for (const f of files) {
        try {
          const data = JSON.parse(readFileSync(join(shardDir, f), "utf8")) as EnrichmentFile;
          if (data.sctid) out.set(data.sctid, data);
        } catch (e) {
          console.warn(`  ! skipping invalid enrichment ${type}/${shard}/${f}: ${(e as Error).message}`);
        }
      }
    }
  }
  return out;
}
