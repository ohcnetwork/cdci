"use client";
import FlexSearch from "flexsearch";
import { bucketOf } from "./shard";
import type {
  BrandDoc,
  BrandRef,
  BuildManifest,
  ConceptDoc,
  ConceptType,
  GenericDoc,
  SearchRecord,
  SubstanceDoc,
} from "./types";

// Root-absolute so paths resolve correctly from any route (e.g. /concept/).
// Honors an optional basePath for sub-directory deploys.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const TYPE_DIR: Record<"substance" | "generic" | "brand", string> = {
  substance: "concepts/substance",
  generic: "concepts/generic",
  brand: "concepts/brand",
};
const TYPE_BUCKET_KEY: Record<"substance" | "generic" | "brand", keyof BuildManifest["bucketCounts"]> = {
  substance: "substance",
  generic: "generic",
  brand: "brand",
};

function url(path: string): string {
  return `${BASE}/data/${path}`;
}

let manifestP: Promise<BuildManifest> | null = null;
export function getManifest(): Promise<BuildManifest> {
  return (manifestP ??= fetch(url("manifest.json")).then((r) => {
    if (!r.ok) throw new Error("manifest unavailable");
    return r.json();
  }));
}

const bucketCache = new Map<string, Promise<Record<string, ConceptDoc>>>();
function fetchBucket(dir: string, n: number, id: string): Promise<Record<string, ConceptDoc>> {
  const key = `${dir}/${bucketOf(id, n)}`;
  let p = bucketCache.get(key);
  if (!p) {
    p = fetch(url(`${key}.json`)).then((r) => (r.ok ? r.json() : {}));
    bucketCache.set(key, p);
  }
  return p;
}

export async function getConcept<T extends "substance" | "generic" | "brand">(
  type: T,
  id: string,
): Promise<ConceptDoc | null> {
  const m = await getManifest();
  const n = m.bucketCounts[TYPE_BUCKET_KEY[type]];
  const bucket = await fetchBucket(TYPE_DIR[type], n, id);
  return bucket[id] ?? null;
}

/** Resolve a concept when the type is unknown (e.g. a pasted SCTID) by probing. */
export async function resolveConcept(id: string): Promise<ConceptDoc | null> {
  const found = await Promise.all([
    getConcept("generic", id),
    getConcept("substance", id),
    getConcept("brand", id),
  ]);
  return found.find(Boolean) ?? null;
}

const gbCache = new Map<string, Promise<BrandRef[]>>();
export async function getGenericBrands(genericId: string): Promise<BrandRef[]> {
  let p = gbCache.get(genericId);
  if (!p) {
    p = (async () => {
      const m = await getManifest();
      const b = bucketOf(genericId, m.bucketCounts.genericBrands);
      const map: Record<string, BrandRef[]> = await fetch(url(`generic-brands/${b}.json`)).then((r) =>
        r.ok ? r.json() : {},
      );
      return map[genericId] ?? [];
    })();
    gbCache.set(genericId, p);
  }
  return p;
}

// ── search ───────────────────────────────────────────────────────────────────
export interface Hit {
  id: string;
  type: ConceptType;
  name: string;
}
const T2TYPE: Record<SearchRecord["t"], ConceptType> = {
  s: "substance",
  g: "generic",
  b: "brand",
  p: "product",
};

type Idx = { index: FlexSearch.Index; byId: Map<string, Hit> };
let coreP: Promise<Idx> | null = null;
let brandP: Promise<Idx> | null = null;

async function buildIndex(file: string): Promise<Idx> {
  const records: SearchRecord[] = await fetch(url(file)).then((r) => r.json());
  const index = new FlexSearch.Index({ tokenize: "forward", cache: 100 });
  const byId = new Map<string, Hit>();
  for (const r of records) {
    index.add(r.id, r.n);
    byId.set(r.id, { id: r.id, type: T2TYPE[r.t], name: r.n });
  }
  return { index, byId };
}

export function ensureCore(): Promise<Idx> {
  return (coreP ??= buildIndex("search/core.json"));
}
export function ensureBrands(): Promise<Idx> {
  return (brandP ??= buildIndex("search/brands.json"));
}

export interface SearchOpts {
  includeBrands: boolean;
  limit?: number;
}
export async function search(q: string, opts: SearchOpts): Promise<Hit[]> {
  const query = q.trim();
  if (!query) return [];
  const limit = opts.limit ?? 24;
  const idxs: Idx[] = [await ensureCore()];
  if (opts.includeBrands && brandP) idxs.push(await brandP);
  const out: Hit[] = [];
  const seen = new Set<string>();
  for (const idx of idxs) {
    const ids = idx.index.search(query, { limit }) as unknown as string[];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const hit = idx.byId.get(id);
      if (hit) out.push(hit);
    }
  }
  // surface substances/generics before brands when relevance is similar
  const rank: Record<ConceptType, number> = {
    generic: 0,
    substance: 1,
    brand: 2,
    product: 3,
    supplier: 4,
    doseform: 5,
    route: 6,
  };
  return out.sort((a, b) => rank[a.type] - rank[b.type]).slice(0, limit);
}

/** Resolve display names for SCTIDs cheaply from the already-loaded core index
 *  (substances + generics). Avoids extra bucket fetches for cross-links. */
export async function resolveNames(ids: string[]): Promise<Map<string, string>> {
  const { byId } = await ensureCore();
  const out = new Map<string, string>();
  for (const id of ids) {
    const h = byId.get(id);
    if (h) out.set(id, h.name);
  }
  return out;
}

export type { ConceptDoc, SubstanceDoc, GenericDoc, BrandDoc };
