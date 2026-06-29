// Domain types for the Lab tests (CLCI / LOINC) section.
// Lab tests are keyed by LOINC code under system http://loinc.org — a separate
// identity space from the SNOMED-coded drug concepts, hence a self-contained module.

export const LOINC_SYSTEM = "http://loinc.org";

/** "parsed" → the FSN decomposed cleanly into validated axes.
 *  "unparsed" → the FSN couldn't be trusted (no colons, or a drifted split);
 *  the UI falls back to the raw FSN + the always-clean Long Common Name. */
export type LoincAxisStatus = "parsed" | "unparsed";

/** One LOINC axis: the exact token from the FSN plus a plain-English gloss
 *  (undefined when the token isn't in the curated glossary — the raw still shows). */
export interface LoincAxis {
  raw: string;
  gloss?: string;
}

/** The six LOINC axes: Component:Property:Time:System:Scale[:Method]. */
export interface LoincParts {
  component?: LoincAxis; // what is measured (the analyte)
  property?: LoincAxis; // kind of quantity (MCnc, ACnc, PrThr…)
  time?: LoincAxis; // timing (Pt, 24H…)
  system?: LoincAxis; // specimen (Ser, Bld, Urine…)
  scale?: LoincAxis; // Qn / Ord / Nom / SemiQn…
  method?: LoincAxis; // optional measurement method
  status: LoincAxisStatus;
}

export interface LabTest {
  code: string; // LOINC code — the canonical id, e.g. "6025-1"
  name: string; // General Name (India-friendly primary display)
  longCommonName: string; // authoritative human-readable display
  fsn: string; // raw Fully-Specified Name (source of truth for the split)
  parts: LoincParts; // best-effort, validated decomposition
  specimen?: string; // normalized specimen facet label (undefined when unparsed)
  scale?: string; // coarse scale facet bucket (undefined when unparsed)
  categories: string[]; // derived clinical disciplines (best-effort, >=1)
}

export interface LabsManifest {
  count: number;
  loincVersion: string; // "2.82"
  sourceReleaseDate: string;
  builtAt: string; // ISO timestamp
  facets: {
    specimen: Record<string, number>;
    scale: Record<string, number>;
    category: Record<string, number>;
  };
  parse: { parsed: number; unparsed: number }; // FSN split coverage
}
