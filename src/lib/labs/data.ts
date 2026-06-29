"use client";
import FlexSearch from "flexsearch";
import { LOINC_SYSTEM, type LabTest, type LabsManifest } from "./types";

// Root-absolute, basePath-aware (matches src/lib/data.ts for the drug section).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
function url(path: string): string {
  return `${BASE}/data/labs/${path}`;
}

let manifestP: Promise<LabsManifest> | null = null;
export function getLabsManifest(): Promise<LabsManifest> {
  return (manifestP ??= fetch(url("manifest.json")).then((r) => {
    if (!r.ok) throw new Error("labs manifest unavailable");
    return r.json();
  }));
}

// The whole dataset (~216 KB) loads once; everything is filtered in memory.
let testsP: Promise<Record<string, LabTest>> | null = null;
export function getAllLabTests(): Promise<Record<string, LabTest>> {
  return (testsP ??= fetch(url("tests.json")).then((r) => {
    if (!r.ok) throw new Error("labs data unavailable");
    return r.json();
  }));
}

export async function getLabTest(code: string): Promise<LabTest | null> {
  const all = await getAllLabTests();
  return all[code] ?? null;
}

type Idx = { index: FlexSearch.Index; map: Record<string, LabTest> };
let indexP: Promise<Idx> | null = null;
/** FlexSearch index built directly from the already-loaded tests map — no
 *  separate search artifact. Indexes General Name, Long Common Name, and code. */
export function ensureLabIndex(): Promise<Idx> {
  return (indexP ??= (async () => {
    const map = await getAllLabTests();
    const index = new FlexSearch.Index({ tokenize: "forward", cache: 100 });
    for (const t of Object.values(map)) {
      index.add(t.code, `${t.name} ${t.longCommonName} ${t.code}`);
    }
    return { index, map };
  })());
}

export async function searchLabs(q: string, limit = 100): Promise<LabTest[]> {
  const query = q.trim();
  if (!query) return [];
  const { index, map } = await ensureLabIndex();
  const ids = index.search(query, { limit }) as unknown as string[];
  const out: LabTest[] = [];
  for (const id of ids) {
    const t = map[id];
    if (t) out.push(t);
  }
  return out;
}

/** Other tests sharing this test's specimen. Empty when the test is unparsed
 *  (no derived specimen), so the caller can hide the "Related" section. */
export function relatedBySpecimen(
  map: Record<string, LabTest>,
  test: LabTest,
  n = 6,
): LabTest[] {
  if (!test.specimen) return [];
  const out: LabTest[] = [];
  for (const t of Object.values(map)) {
    if (t.code !== test.code && t.specimen === test.specimen) {
      out.push(t);
      if (out.length >= n) break;
    }
  }
  return out;
}

export function labHref(code: string): string {
  return `/lab/?code=${encodeURIComponent(code)}`;
}

export function loincCoding(test: LabTest) {
  return { system: LOINC_SYSTEM, code: test.code, display: test.name };
}
