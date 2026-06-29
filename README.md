# Clinical Codes Browser

An open-source, **frontend-only** web app to search and browse India's NRCeS
([C-DAC, MoHFW](https://www.nrces.in/)) clinical terminologies, and export them for
[CARE](https://github.com/ohcnetwork/care). Two peer sections:

- **Drug codes** — **Common Drug Codes for India (CDCI)**, the SNOMED CT national drug
  terminology. Export as CARE `ProductKnowledge`.
- **Lab test codes** — **Common Lab Codes for India (CLCI)**, a curated subset of **LOINC v2.82**.
  Every test's cryptic LOINC Fully-Specified Name is decoded into plain English.

No backend: the whole thing is a static site built from the NRCeS releases.

```
NRCeS TSV (drugs)  ─┐
                    ├─▶  build pipeline  ──▶  JSON + search index + CARE export  ──▶  static site
NRCeS CSV (labs)   ─┘          ▲
                      community enrichment overlay (PR-reviewed, drugs)
```

## What it does

**Drugs (SNOMED CT)**

- **Search** ~186k concepts (substances, generics, brands, products) with sub-50 ms prefix typeahead.
- **Browse** the substance → generic → brand hierarchy with shareable permalinks (`/concept/?id=<sctid>`).
- **Copy** any concept as a SNOMED code, a FHIR `Coding`, or a CARE `ProductKnowledge` resource — generated
  client-side from the concept doc (no pre-built export artifacts).
- **Enrich** the sparse clinical fields (indication, contraindication, …) via in-app **Suggest edit** → GitHub PR.

**Labs (LOINC)**

- **Search** 1,473 lab tests by name, long common name, or LOINC code (`/labs`).
- **Decode** each test's LOINC FSN into its six axes — component, property, time, specimen, scale, method —
  with a curated plain-English glossary (`/lab/?code=<loinc>`).
- **Browse** by specimen, scale, and derived clinical discipline (Chemistry, Hematology, Microbiology, …).
- **Copy** the LOINC code or a FHIR `Coding`. A CARE observation export is planned for v2.

DDI / interaction checking is intentionally **out of scope** for v1 — see the plan. The build still
computes a SNOMED→RxNorm bridge seed so a future CDSS can be layered on.

## Data model (verified against the release)

| Master | Rows | Notes |
|---|---|---|
| Substance | 3,274 | SCTID + CAS/UNII/SMILES/InChI (sparse). SNOMED International. |
| Generic | 10,174 | SCTID, `+`-joined combo substances (20.7%), routes, dose form, clinical fields. |
| Brand | 93,019 | SCTID → generic/supplier/product. India extension. |
| Product / Supplier / Dose form / Route | 71,503 / 8,121 / 422 / 160 | lookups. |

Strengths are **parsed from the SNOMED names** (97.5% clean) and marked *derived/unverified*; the
original name is always the source of truth.

### Lab tests (CLCI · LOINC)

| Field | Notes |
|---|---|
| 1,473 lab tests | Keyed by **LOINC code** (`http://loinc.org`), a separate identity space from SNOMED — hence a self-contained module. |
| FSN split | `Component:Property:Time:System:Scale[:Method]` decomposed + **validated** (98.5% / 1,451 parse cleanly; 22 fall back to the Long Common Name). |
| Specimen / scale facets | Derived straight from the FSN. |
| Discipline categories | Derived by a transparent heuristic, correctable via `data/source/clci/categories.json`. Best-effort. |

The **Long Common Name** is always the authoritative display; the FSN breakdown is *derived*.

## Develop

```bash
npm install
npm run build:data          # drugs (TSV → bucketed JSON) + labs (CSV → JSON) into public/data/*
npm run dev                 # http://localhost:3000
npm run build               # build:data + static export to out/
npm run test:labs           # unit checks for the LOINC parse/derive helpers
npm run validate:enrichments
```

`build:data` chains `build:data:drugs` then `build:data:labs`; each scopes its cleanup to its own
output subtree. The NRCeS drug TSVs live in `data/source/`, the CLCI lab CSV in `data/source/clci/`.
Generated artifacts (`public/data/`) are git-ignored and produced by the build.

## Repo layout

```
data/source/        NRCeS drug TSV flat files (+ NOTICE/LICENSE)
data/source/clci/   NRCeS CLCI lab CSV (+ NOTICE/README) + categories.json overrides
enrichments/        community overlay, one JSON per drug concept keyed by SCTID
scripts/            build pipelines (build-data = drugs, build-labs = labs) + validators
src/lib/labs/       self-contained lab module: types, LOINC glossary, categories, data layer
src/components/labs/  LabsBrowser (search + facets) + LabTestView (the FSN "split")
src/                Next.js app (App Router) + shared drug types/data layer
.github/            CI: validate PRs, build & deploy
```

## Contributing & governance

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [GOVERNANCE.md](./GOVERNANCE.md). In short: enrichment
is kept strictly separate from the immutable source, every PR is schema-validated in CI, and
**safety-affecting fields require clinician/pharmacist sign-off** before they go live.

## Licence & attribution

Drug data © C-DAC / NRCeS under **CC BY 4.0**; contains SNOMED CT® content used under the SNOMED CT
Affiliate Licence (SNOMED CT® is a trademark of SNOMED International). Brand/trade names belong to their
owners. Lab data contains content from **LOINC®** (loinc.org), © Regenstrief Institute, Inc. and the LOINC
Committee, used under the LOINC licence (LOINC® is a registered trademark of Regenstrief Institute, Inc.);
Regenstrief and the LOINC Committee do not endorse the CLCI subset. Intended for Indian healthcare use.
See [DATA_LICENSE.md](./DATA_LICENSE.md) and [NOTICE](./NOTICE). App code is MIT; community enrichment is
contributed under CC BY 4.0.

> Not a clinical decision-support tool. Community content is shown with its review status and must not be
> relied on for prescribing.
