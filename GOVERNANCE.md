# Governance

This dataset can feed clinical systems (CARE). Quality and safety come before contribution velocity.

## Roles

| Role | Who | Can |
|---|---|---|
| **Contributor** | anyone with a GitHub account | open enrichment PRs and issues |
| **Reviewer** | community members with a track record of merged PRs | approve non-safety enrichments, triage |
| **Curator** | registered pharmacists / clinicians (named in `CODEOWNERS`) | approve **safety-affecting** fields |
| **Maintainer** | OHC Network maintainers | merge, manage releases, resolve disputes |

## Review tiers

- **Non-safety fields** (aliases, notes, code bridges, dangling-reference fixes): one Reviewer approval.
- **Safety-affecting fields** (`indication`, `contra_indication`, `therapeutic_role`, strength
  corrections): require a **Curator** approval. Enforced via branch protection + `CODEOWNERS` on
  `enrichments/`. CI additionally requires a source URL on these fields.

`review_status` on each record reflects this: `draft` (unreviewed) → `community_reviewed` →
`expert_approved`. It is shown in the UI and carried into the CARE export. CARE exports default to
`status: draft` until a record is `expert_approved`.

## Provenance & audit

Every enrichment carries `contributor`, `sources[]`, `evidence_type`, and `updated_at`. Git history is
the audit trail. Contradictory contributions are kept as separate PRs; a Curator decides which to
promote — community contributions are never silently overwritten.

## Conflicts of interest

Contributors affiliated with a manufacturer must disclose it in the PR. PRs touching a product's own
claims get extra Curator scrutiny.

## Data freshness

The site rebuilds on every merge. The NRCeS source is re-synced on each release (currently monthly);
the build stamps `sourceReleaseDate` and `builtAt`, surfaced in the UI.

## Escalation

Disputes that Reviewers/Curators can't resolve go to the Maintainers, who have the final say. Urgent
safety corrections (e.g. a recall) are labelled `safety` and reviewed within 48 hours.
