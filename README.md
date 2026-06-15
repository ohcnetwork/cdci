# CDCI Browser

An open-source, **frontend-only** web app to search, browse and enrich India's
**Common Drug Codes for India (CDCI)** — the SNOMED CT national drug terminology
published by [NRCeS](https://www.nrces.in/) (C-DAC, MoHFW) — and export it as
[CARE](https://github.com/ohcnetwork/care) `ProductKnowledge` resources.

SNOMED CT is the canonical identifier throughout. No backend: the whole thing is a
static site built from the NRCeS flat files plus a community-curated enrichment overlay.

```
NRCeS TSV  ──▶  build pipeline  ──▶  bucketed JSON + search index + CARE export  ──▶  static site
                     ▲
            community enrichment overlay (PR-reviewed)
```

## What it does

- **Search** ~186k concepts (substances, generics, brands, products) with sub-50 ms prefix typeahead.
- **Browse** the substance → generic → brand hierarchy with shareable permalinks (`/concept/?id=<sctid>`).
- **Copy** any concept as a SNOMED code, a FHIR `Coding`, or a CARE `ProductKnowledge` resource — generated
  client-side from the concept doc (no pre-built export artifacts).
- **Enrich** the sparse clinical fields (indication, contraindication, …) via in-app **Suggest edit** → GitHub PR.

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

## Develop

```bash
npm install
npm run build:data          # TSV → public/data/* (bucketed JSON + search index)
npm run dev                 # http://localhost:3000
npm run build               # build:data + static export to out/
npm run validate:enrichments
```

The NRCeS source TSVs live in `data/source/`. Generated artifacts (`public/data/`) are git-ignored
and produced by the build.

## Repo layout

```
data/source/      NRCeS TSV flat files (+ NOTICE/LICENSE)
enrichments/      community overlay, one JSON per concept keyed by SCTID
scripts/          build pipeline + validators
src/              Next.js app (App Router) + shared types/data layer
.github/          CI: validate PRs, build & deploy
```

## Contributing & governance

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [GOVERNANCE.md](./GOVERNANCE.md). In short: enrichment
is kept strictly separate from the immutable source, every PR is schema-validated in CI, and
**safety-affecting fields require clinician/pharmacist sign-off** before they go live.

## Licence & attribution

Source data © C-DAC / NRCeS under **CC BY 4.0**; contains SNOMED CT® content used under the SNOMED CT
Affiliate Licence (SNOMED CT® is a trademark of SNOMED International). Brand/trade names belong to their
owners. Intended for Indian healthcare use. See [DATA_LICENSE.md](./DATA_LICENSE.md) and [NOTICE](./NOTICE).
App code is MIT; community enrichment is contributed under CC BY 4.0.

> Not a clinical decision-support tool. Community content is shown with its review status and must not be
> relied on for prescribing.
