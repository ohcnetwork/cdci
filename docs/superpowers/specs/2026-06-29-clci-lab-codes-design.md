# Design: Adding Common Lab Codes for India (CLCI) to the site

**Date:** 2026-06-29
**Status:** Approved design — ready for implementation planning
**Author:** Brainstormed with Bodhish Thomas

## Summary

The repo currently ships **CDCI Browser** — a frontend-only (Next.js static export)
browser over NRCeS **Common Drug Codes for India** (SNOMED CT). This change adds a
second national terminology: **Common Lab Codes for India (CLCI)**, a curated subset of
**LOINC v2.82** (1,473 lab tests) published by NRCeS/C-DAC.

The site becomes a two-section **"Clinical Codes Browser"** hub:

- **Drugs** — existing CDCI / SNOMED CT browser (unchanged behaviour).
- **Lab tests** — new CLCI / LOINC browser (this spec).

The headline goal: lab codes must be **easy to search, navigate, and "split" so users
understand them** — i.e. decompose each cryptic LOINC Fully-Specified Name into plain
English.

### Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Positioning | Two-section clinical hub (Drugs + Labs), shared chrome, unified home |
| Umbrella wordmark | **"Clinical Codes Browser"** (repo/package stay `cdci` internally) |
| CARE export for labs | **Deferred to v2** (v1 = browse + search + copy LOINC/FHIR Coding) |
| Navigation | Specimen + scale facets (from data) **and** curated discipline categories |

## Source data

Location today: untracked folder `common-lab-codes-for-india-20260629/` at repo root,
containing `common-lab-codes-for-india.csv`, `README.txt`, `NOTICE.txt`.

CSV: 1,473 data rows (~216 KB), no duplicate LOINC codes. Columns:

| Column | Meaning |
|---|---|
| `General Name` | India-friendly local test name (the primary display name) |
| `LOINC Code` | Unique LOINC identifier, e.g. `6025-1` |
| `Fully-Specified Name (FSN)` | Colon-delimited `Component:Property:Time:System:Scale[:Method]` |
| `Long Common Name` | Fully spelled-out human-readable name (always clean) |

### Observed data-quality facts (verified against the file)

- FSN axis-count: 892 rows have 5 parts (no method), 566 have 6 (with method), and
  **15 rows have a non-colon FSN** — their FSN field actually contains a Long-Common-Name
  string (e.g. `Aspergillus...` → `Grey Alder IgE Ab [Units/volume] in Serum`).
- A further ~7 rows produce a **drifted axis split** under naive colon-splitting — the
  component itself contains a colon (e.g. HLA alleles `HLA-B*57:01`, lipids
  `Lysophosphatidylcholine(16:0)`, newborn-screen panels), shifting every later axis by one.
  These surface as an out-of-place scale token (`"Plas"`, `"Bld/Tiss"`, or a stray `"-"`),
  which the validation step (below) catches. Note `-` is itself a *legitimate* LOINC
  property token on some valid panel rows, so validation keys primarily off the **scale**
  position, not off `-` alone. Total expected `unparsed` ≈ 22 (15 no-colon + ~7 drift).
- **The Long Common Name is always present and clean** and is the authoritative human
  display. The FSN split is therefore **best-effort and must be validated**, exactly as the
  drug pipeline already treats parsed strengths as `derived/unverified`.

Facet vocabulary present in the data (top values): specimen — Serum (135), Ser/Plas (80),
Blood (48), CSF (33), Bld/Tiss (33), Urine (27)…; scale — Ord (314), Qn (953), Nom (100),
SemiQn (44), OrdQn (25).

## Architecture: a parallel `labs` module

Lab tests are keyed by **LOINC code** under code system `http://loinc.org` — a different
identity space from the SNOMED SCTID drug concepts. They will **not** be forced into the
SNOMED `ConceptType` union or the 186k-row FNV-1a bucket/shard machinery. Instead labs get
a self-contained module with its own types, build step, data layer, routes, and components.
The existing drug code paths are not modified.

Rationale:

- **Isolation / clarity** — LOINC semantics never leak into SNOMED-centric code, and vice
  versa. Each module is understandable and testable on its own.
- **Right-sized** — 1,473 rows (~216 KB) fit comfortably in memory; the entire labs dataset
  loads once on the labs section and is searched/faceted client-side. No bucketing,
  no on-demand shard fetching, no SQLite.

Rejected alternatives:

- *Extend the SNOMED `ConceptType` union* — pollutes drug-centric code (`care.ts`,
  `data.ts`, `ConceptView.tsx`) with LOINC special cases; bucketing is overkill for 1.5k rows.
- *Single static filter-only table* — no permalinks, no "split" detail page; fails the brief.

## Data model

New file `src/lib/labs/types.ts`:

```ts
export const LOINC_SYSTEM = "http://loinc.org";

export type LoincAxisStatus = "parsed" | "unparsed";

/** The six LOINC axes, each split into the raw token + a plain-English gloss.
 *  `gloss` is undefined when the token is unknown to the glossary. */
export interface LoincAxis {
  raw: string;          // exact token from the FSN
  gloss?: string;       // human-readable expansion (from the glossary)
}

export interface LoincParts {
  component?: LoincAxis;  // what is measured (analyte)
  property?: LoincAxis;   // kind of quantity (MCnc, ACnc, PrThr…)
  time?: LoincAxis;       // timing (Pt, 24H…)
  system?: LoincAxis;     // specimen (Ser, Bld, Urine…)
  scale?: LoincAxis;      // Qn / Ord / Nom / SemiQn…
  method?: LoincAxis;     // optional measurement method
  status: LoincAxisStatus; // "unparsed" → show raw FSN, trust LCN only
}

export interface LabTest {
  code: string;            // LOINC code, the canonical id, e.g. "6025-1"
  name: string;            // General Name (primary display)
  longCommonName: string;  // authoritative readable display
  fsn: string;             // raw FSN string (source of truth for the split)
  parts: LoincParts;       // best-effort decomposition
  specimen?: string;       // normalized specimen facet value (display label)
  scale?: string;          // normalized scale facet value (display label)
  categories: string[];    // derived clinical disciplines (see below)
}

export interface LabsManifest {
  count: number;
  loincVersion: string;          // "2.82"
  sourceReleaseDate: string;
  builtAt: string;
  facets: {
    specimen: Record<string, number>;
    scale: Record<string, number>;
    category: Record<string, number>;
  };
  parse: { parsed: number; unparsed: number };  // FSN split coverage
}
```

## Build pipeline

- **Relocate source:** move the CSV + `README.txt` + `NOTICE.txt` into
  `data/source/clci/` (mirrors the drug `data/source/` layout). Delete the loose root
  folder `common-lab-codes-for-india-20260629/`.
- **New script `scripts/build-labs.ts`** — a standalone `main()` that does not import the
  drug pipeline. Wiring in `package.json`:
  ```jsonc
  "build:data:drugs": "tsx scripts/build-data.ts",
  "build:data:labs":  "tsx scripts/build-labs.ts",
  "build:data":       "npm run build:data:drugs && npm run build:data:labs",
  ```
- **Cleanup must be scoped per build (real bug to avoid).** The current drug build runs
  `rmSync("public/data", { recursive: true, force: true })` — deleting the *entire* shared
  output tree. That would wipe `public/data/labs/`. Fix: narrow the drug build's cleanup to
  the drug-owned paths only (`concepts/`, `generic-brands/`, `search/`, `manifest.json`),
  and have `build-labs.ts` clean only `public/data/labs/`. With scoped cleanup the two
  builds are order-independent; the `&&` chaining above is belt-and-suspenders. (The drug
  pipeline change is limited strictly to this cleanup-scoping — no logic changes.)
- **New helper `scripts/lib/loinc.ts`** holding pure functions: CSV parse, FSN parse +
  validation, specimen/scale normalization, and discipline derivation. Unit-testable in
  isolation.
- **Emitted artifacts** under `public/data/labs/` (already git-ignored — `.gitignore`
  covers `/public/data/`):
  - `tests.json` — `Record<string, LabTest>` keyed by LOINC code (full detail, one file,
    ~the whole dataset). This single file backs both browse and detail; the client builds
    its FlexSearch index directly from it (no separate search artifact — the dataset is
    only ~216 KB and is loaded in full anyway).
  - `manifest.json` — `LabsManifest` (counts, facet histograms, parse coverage).

### FSN parsing + validation (`scripts/lib/loinc.ts`)

1. If the FSN contains no `:` → `status = "unparsed"`, keep `fsn` raw, populate nothing
   else from the split (covers the 15 LCN-in-FSN rows).
2. Otherwise split on `:` into up to 6 segments mapped positionally to
   component/property/time/system/scale/method.
3. **Validate** `scale` ∈ known scale set `{Qn, Ord, Nom, SemiQn, OrdQn, Doc, Nar, Set}` and
   `property` ∈ the known property set. If either fails, the positional split has drifted
   (component contained a colon) → `status = "unparsed"`, fall back to raw FSN + LCN.
4. On success → `status = "parsed"`; attach `gloss` to each axis from the glossary
   (`gloss` undefined when a token is not in the glossary — the raw token still shows).
5. `specimen` facet = glossed/normalized `system` (e.g. `Ser` → "Serum"); `scale` facet =
   glossed `scale` (`Qn` → "Quantitative", `Ord`/`Nom`/`SemiQn`/`OrdQn` grouped as
   "Qualitative / ordinal" for the facet rail, with the precise label kept on the detail).

### LOINC abbreviation glossary (`src/lib/labs/glossary.ts`)

A curated, hand-authored map `Record<string, string>` per axis (shared by build + client):

- **Property** (~58 distinct, but a few dozen common ones cover the bulk): `MCnc` →
  "Mass concentration", `ACnc` → "Arbitrary concentration", `PrThr` → "Presence/threshold",
  `SCnc` → "Substance concentration", `NCnc` → "Number concentration", `Titr` → "Titre",
  `Prid` → "Presence/identity of an organism", `Susc` → "Susceptibility", etc.
- **Time:** `Pt` → "Point in time (random)", `24H` → "24-hour collection", `12H` → "12-hour".
- **Scale (full set — must cover every valid token):** `Qn` → "Quantitative",
  `Ord` → "Ordinal (e.g. positive/negative)", `Nom` → "Nominal",
  `SemiQn` → "Semi-quantitative", `OrdQn` → "Ordinal or quantitative",
  `Doc` → "Document", `Nar` → "Narrative", `Set` → "Set (panel)".
- **System/specimen:** `Ser` → "Serum", `Plas` → "Plasma", `Ser/Plas` → "Serum or plasma",
  `Bld` → "Blood", `CSF` → "Cerebrospinal fluid", `Urine`, `Stool`, `Sputum`, `Tiss` →
  "Tissue", etc.
- **Method:** common ones spelled out (`IA` → "Immunoassay", `Molgen` → "Molecular
  genetics", `Gram stain`, `Microscopy.light`, `Probe.amp.tar` → "Nucleic acid
  amplification (target)", etc.). Method tokens already mostly read as English; the glossary
  expands the abbreviated ones.

Unknown tokens render as the raw token with no gloss (graceful, never blank). The glossary
is intentionally curated, not exhaustive — it is improved incrementally.

### Discipline categories (`src/lib/labs/categories.ts` + override file)

Each test is assigned 0..n **clinical disciplines** for the category facet. Derived by a
transparent, ordered heuristic over FSN signals + component text:

- method `Molgen` / `Probe.amp.tar` / `FISH` → **Molecular**
- property `Susc` / `Prid`, or microbiology methods (`Culture`, `Gram stain`, acid-fast,
  stains) → **Microbiology**
- system `Urine`/`Urine sed` → **Urinalysis**
- component contains `Ab`/`Ag`/`IgE`/`IgG`/`IgM` → **Immunology / Serology**
- coagulation signals (`Coag`, component `aPTT`/`INR`/`Fibrinogen`/`D-dimer`) →
  **Coagulation**
- cell-count signals (`leukocytes`, `erythrocytes`, `Automated count`, `Manual count`,
  blood-film stains) → **Hematology**
- hormone components (`TSH`, `Cortisol`, `Insulin`, `Testosterone`…) → **Endocrinology**
- metals/drugs-of-abuse components → **Toxicology**
- fallback → **Chemistry**

A **curated override file** `data/source/clci/categories.json`
(`Record<loincCode, string[]>`) lets a reviewer correct/augment derived categories. The
build merges overrides over heuristic output (override replaces derived for that code). This
mirrors the existing "immutable source + reviewed overlay" model used for drug enrichments.
Categories are labelled **derived / best-effort** in the UI.

## Information architecture & routes

| Route | Status | Purpose |
|---|---|---|
| `/` | **reworked** | Hub home: "Clinical Codes Browser" wordmark + two peer entry panels (Drugs · SNOMED / Lab tests · LOINC), each with search-and-go + a stat line. |
| `/search`, `/concept` | unchanged | Existing drug search + drug concept detail. |
| `/labs` | **new** | Labs landing: instant client-side search + specimen/scale/category facet rails + results list. |
| `/lab?code=<loinc>` | **new** | Lab test detail permalink (the "split" page). |
| `/about` | updated | Add a CLCI/LOINC section + attribution. |

Chrome (`src/app/layout.tsx`):

- Header wordmark → "Clinical Codes Browser" with a small "India" pill; nav becomes
  **Drugs · Labs · About** (+ GitHub).
- Footer gains the **LOINC attribution** block (see Licensing).
- **`<head>` metadata** must be rebranded too: `layout.tsx` `metadata.title`/`description`
  (currently "CDCI Browser — India Drug Codes…") and `about/page.tsx` `metadata.title`
  (currently "About · CDCI Browser") become "Clinical Codes Browser" variants.

## Components (new, under `src/components/labs/`)

- `LabsBrowser.tsx` (client) — owns the `/labs` page: loads `tests.json` once, builds a
  FlexSearch index over General Name + Long Common Name + code, renders the search box,
  facet rails (specimen, scale, category — each a checkbox/chip list with counts from the
  manifest), and the filtered results list. All filtering in memory.
- `LabTestView.tsx` (client) — the detail page body. Sections:
  1. Identity hero: "Lab test · LOINC" badge + namespace pill, General Name as `h1`, LOINC
     code chip, **Copy LOINC code** + **Copy FHIR Coding** buttons (reusing `CopyButton`).
  2. Authoritative **Long Common Name** line.
  3. **"What this code means"** — the 6-axis split table (label · raw token · gloss). When
     `parts.status === "unparsed"`, replace the table with the raw FSN and a note that this
     code's structured breakdown isn't available, leaning on the Long Common Name.
  4. Sidebar: **Categories** chips, **Use** (copy buttons + "CARE export coming in v2"),
     **Related** tests sharing the same specimen (cheap: filter the loaded set).
- Reused as-is: `SearchBox` pattern, `CopyButton`. A new `labHref(code)` helper mirrors
  `conceptHref`.

## Data layer (`src/lib/labs/data.ts`, client)

- `getLabsManifest()` — memoized fetch of `labs/manifest.json`.
- `getAllLabTests()` — memoized fetch of `labs/tests.json` (the full keyed map); used by
  both the browser page and the detail page (detail just indexes by code).
- `ensureLabIndex()` — memoized FlexSearch index built from the already-loaded
  `getAllLabTests()` map (depends on it). Indexes General Name, Long Common Name, and code.
- `searchLabs(q)` — prefix search returning `LabTest[]` (resolve hits against the loaded
  map).
- `relatedBySpecimen(test, n)` — first `n` other tests with the same specimen facet. When
  `test.specimen` is `undefined` (an `unparsed` row has no derived specimen), returns `[]`
  and the detail page hides the "Related" section.

FHIR Coding copy is generated client-side: `{ system: LOINC_SYSTEM, code, display: name }`.
No pre-built export artifacts; no CARE resource in v1.

## Licensing & attribution (required)

LOINC's licence requires attribution. Add to **footer**, **/about**, `DATA_LICENSE.md`,
and `NOTICE`:

> Contains content from LOINC® (loinc.org), © Regenstrief Institute, Inc. and the LOINC
> Committee, used under the LOINC licence. LOINC® is a registered trademark of Regenstrief
> Institute, Inc. The CLCI subset was prepared by NRCeS/C-DAC; Regenstrief Institute and the
> LOINC Committee do not endorse this subset.

The existing CDCI/SNOMED attribution stays. `data/source/clci/NOTICE.txt` and `README.txt`
are kept verbatim from the release.

## Testing

- `scripts/lib/loinc.test.ts` (or a runnable `tsx` check) covering pure functions:
  - FSN with method (6 parts) → all axes parsed, glosses attached.
  - FSN without method (5 parts) → method axis absent, `status = "parsed"`.
  - FSN with no colon (the 15 LCN-in-FSN rows) → `status = "unparsed"`, raw kept.
  - FSN whose split yields an invalid scale/property token → `status = "unparsed"`.
  - Specimen/scale normalization maps known tokens; unknown tokens pass through.
  - Category derivation: a molecular, a microbiology, a urinalysis, a serology, and a
    fallback-chemistry example land in the expected disciplines; override file wins.
- Build assertion: `build-labs.ts` logs counts + parse coverage and exits non-zero if the
  emitted test count ≠ source row count (referential integrity, mirroring the drug build).
- Manual: `npm run build && npx serve out` — verify `/labs` search/facets, a parsed detail
  page, an `unparsed` detail page, copy buttons, and footer attribution.

## Out of scope (v1)

- CARE `ObservationDefinition`/equivalent export for labs (explicitly deferred to v2).
- Community enrichment overlay/PR flow for lab tests (drug enrichment is untouched and not
  extended here).
- Unified single search across drugs + labs (the hub keeps two section-scoped searches).
- Reference ranges, units of measure beyond what the LOINC name conveys, or mapping LOINC↔SNOMED.

## Build sequence (for the implementation plan)

1. Relocate source CSV/NOTICE/README into `data/source/clci/` (delete the loose root
   folder). `.gitignore` already covers `/public/data/`.
2. `src/lib/labs/types.ts` + `glossary.ts` + `categories.ts` (pure, shared).
3. `scripts/lib/loinc.ts` (parse/validate/normalize/derive) + its tests.
4. `scripts/build-labs.ts`; add `build:data:drugs`/`build:data:labs`/`build:data` to
   `package.json`; **narrow `build-data.ts` cleanup to drug-owned paths** (the only drug
   change).
5. `src/lib/labs/data.ts` (client loaders/search).
6. `src/components/labs/LabTestView.tsx` + `/lab` route.
7. `src/components/labs/LabsBrowser.tsx` + `/labs` route.
8. Rework `/` into the hub home; update `layout.tsx` chrome (wordmark, nav, footer
   attribution) **and its `<head>` metadata**; update `/about` (content + its
   `metadata.title`); update `DATA_LICENSE.md` + `NOTICE`.
9. Update `README.md` to describe the two-section hub.
10. Build, typecheck, run tests, manual verification.
```
