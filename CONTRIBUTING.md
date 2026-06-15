# Contributing

Thank you for helping enrich India's drug terminology. Contributions improve the **enrichment
overlay** — they never modify the immutable NRCeS source in `data/source/`.

## The easy way: Suggest edit (no git needed)

1. Open any concept and click **Suggest edit**.
2. GitHub opens a prefilled new file under `enrichments/<type>/<shard>/<sctid>.json`. If you don't
   have write access, GitHub creates the file on your fork.
3. Fill in the fields, replace the `<…>` placeholders, and **add at least one source URL**.
4. Commit → open a pull request. CI validates it; a reviewer takes it from there.

Spotted a plain error or typo? Use **Report issue** instead — it opens a prefilled GitHub issue.

## Enrichment file format

One JSON file per concept, named `<sctid>.json`, in the shard folder shown by *Suggest edit*
(`shard = FNV1a(sctid) % 64`). Example (`enrichments/generic/28/325533008.json`):

```json
{
  "sctid": "325533008",
  "type": "generic",
  "review_status": "draft",
  "contributor": "@your-handle",
  "sources": ["https://bnf.nice.org.uk/drugs/estradiol-valerate/"],
  "evidence_type": "regulatory",
  "indication": "Hormone replacement therapy for menopausal symptoms.",
  "contra_indication": "Known/suspected breast cancer; active VTE; severe hepatic impairment.",
  "therapeutic_role": "Estrogen (HRT)",
  "classification": "ATC G03C"
}
```

Fields by type:

- **generic** — `therapeutic_role`, `indication`, `contra_indication`, `classification`,
  `strength_corrections[]`, `base_unit_ucum`
- **substance** — `rxcui[]`, `atc[]`, `notes`
- **brand** — `notes`

Always required: `sctid`, `type`, `review_status`, `contributor`, and a real `sources[]` URL.

## Rules (enforced in CI — `npm run validate:enrichments`)

- `sctid` numeric; `type` matches the folder; filename is `<sctid>.json`; file is in the correct shard.
- `review_status` ∈ `draft | community_reviewed | expert_approved`.
- **Safety-affecting fields** (`indication`, `contra_indication`, `therapeutic_role`) require at least
  one source URL and clinician/pharmacist sign-off before merge (see [GOVERNANCE.md](./GOVERNANCE.md)).
- Cite persistent sources (prefer DOIs / PubMed / regulatory pages). No marketing claims, no
  unsourced clinical assertions.

## In scope / out of scope

**In:** clinical fields, strength/unit corrections (UCUM), code bridges (RxNorm/ATC), aliases, fixes
to dangling references. **Out:** drug–drug-interaction *checking* (deferred to the CDSS phase), pricing,
marketing copy, non-evidence-based content.

By submitting a PR you agree to license your enrichment under **CC BY 4.0**.
