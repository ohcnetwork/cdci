"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { conceptHref } from "@/components/SearchBox";
import { getConcept, getGenericBrands, getManifest, resolveNames } from "@/lib/data";
import { brandToCare, genericToCare } from "@/lib/care";
import { reportIssueUrl, suggestEditUrl } from "@/lib/contribute";
import { SNOMED_SYSTEM, type BrandDoc, type BrandRef, type ConceptDoc, type GenericDoc, type SubstanceDoc } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  substance: "Substance",
  generic: "Generic · clinical drug",
  brand: "Branded medicine",
};

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-faint)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function KV({ k, v, mono }: { k: string; v?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <dt className="w-40 shrink-0 text-[var(--color-muted)]">{k}</dt>
      <dd className={`flex-1 break-words ${mono ? "code" : ""}`}>{v ?? <Missing />}</dd>
    </div>
  );
}

function Missing() {
  return <span className="text-[var(--color-faint)]">Not yet documented</span>;
}

function ReviewBadge({ e }: { e?: GenericDoc["enrichment"] }) {
  if (!e) return null;
  const map: Record<string, { label: string; cls: string }> = {
    expert_approved: { label: "Expert approved", cls: "bg-[var(--color-accent-wash)] text-[var(--color-accent-ink)]" },
    community_reviewed: { label: "Community reviewed", cls: "bg-[var(--color-amber-wash)] text-[var(--color-amber-ink)]" },
    draft: { label: "Draft enrichment", cls: "bg-stone-100 text-stone-600" },
  };
  const m = map[e.reviewStatus] ?? map.draft;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function NamespacePill({ ns }: { ns: ConceptDoc["namespace"] }) {
  return (
    <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
      {ns === "india" ? "India extension" : "SNOMED International"}
    </span>
  );
}

function IdentityHero({ c }: { c: ConceptDoc }) {
  const coding = { system: SNOMED_SYSTEM, code: c.id, display: c.name };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-ink)]">
          {TYPE_LABEL[c.type] ?? c.type}
        </span>
        <NamespacePill ns={c.namespace} />
      </div>
      <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-[28px]">{c.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="code rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-sm text-white">{c.id}</span>
        <CopyButton text={c.id} label="Copy SNOMED code" />
        <CopyButton text={JSON.stringify(coding, null, 2)} label="FHIR Coding" title="Copy as FHIR Coding JSON" />
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-faint)]">
        SNOMED CT identifier · system <span className="code">{SNOMED_SYSTEM}</span>
      </p>
    </div>
  );
}

function ContributeBar({ c }: { c: ConceptDoc }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={suggestEditUrl(c)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--color-accent-ink)]"
      >
        Suggest edit
      </a>
      <a
        href={reportIssueUrl(c)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] px-3 py-1.5 text-[13px] font-medium text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)]"
      >
        Report issue
      </a>
    </div>
  );
}

function StrengthTag({ status }: { status: string }) {
  if (status === "parsed") return null;
  return (
    <span className="ml-2 rounded bg-[var(--color-amber-wash)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-amber-ink)]">
      {status === "review" ? "derived · review" : "unparsed"}
    </span>
  );
}

function fmtStrength(s?: { value: number | null; unit: string | null; denomValue?: number | null; denomUnit?: string | null; raw: string }) {
  if (!s) return null;
  if (s.value == null) return s.raw;
  const base = `${s.value} ${s.unit ?? ""}`.trim();
  return s.denomUnit ? `${base} / ${s.denomValue ?? 1} ${s.denomUnit}` : base;
}

// ── Generic ──────────────────────────────────────────────────────────────────
function GenericView({ g }: { g: GenericDoc }) {
  const [brands, setBrands] = useState<BrandRef[]>(g.brandsFirstPage);
  const [allLoaded, setAllLoaded] = useState(g.brandCount <= g.brandsFirstPage.length);

  const loadAll = async () => {
    setBrands(await getGenericBrands(g.id));
    setAllLoaded(true);
  };

  const careJson = async () => {
    const m = await getManifest();
    return JSON.stringify(genericToCare(g, m.sourceReleaseDate), null, 2);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Composition">
          <ul className="divide-y divide-[var(--color-line)]">
            {g.substances.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link href={conceptHref("substance", s.id)} className="font-medium text-[var(--color-accent-ink)] hover:underline">
                  {s.name}
                </Link>
                <span className="text-right text-[var(--color-muted)]">
                  {fmtStrength(s.strength) ?? <span className="text-[var(--color-faint)]">—</span>}
                  {s.strength && <StrengthTag status={s.strength.status} />}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 border-t border-[var(--color-line)] pt-2">
            <KV k="Dose form" v={g.doseForm?.name} />
            <KV k="Routes" v={g.routes.length ? g.routes.map((r) => r.name).join(", ") : undefined} />
          </dl>
          {g.strengthParseStatus !== "parsed" && (
            <p className="mt-3 rounded-md bg-[var(--color-amber-wash)] px-3 py-2 text-[12px] text-[var(--color-amber-ink)]">
              Strengths here are derived from the drug name and not yet verified. Help confirm them via
              Suggest edit.
            </p>
          )}
        </Section>

        <Section title="Clinical information" action={<ReviewBadge e={g.enrichment} />}>
          <dl>
            <KV k="Therapeutic role" v={g.therapeuticRole} />
            <KV k="Indication" v={g.indication} />
            <KV k="Contra-indication" v={g.contraIndication} />
            <KV k="Classification" v={g.classification} />
            <KV
              k="Interactions (reference)"
              v={
                g.interactionText ? (
                  <span>
                    {g.interactionText}
                    <span className="mt-1 block text-[11px] text-[var(--color-faint)]">
                      Reference text from the source — not an interaction checker.
                    </span>
                  </span>
                ) : undefined
              }
            />
          </dl>
          {g.enrichment?.sources?.length ? (
            <p className="mt-3 border-t border-[var(--color-line)] pt-2 text-[11px] text-[var(--color-faint)]">
              Community-contributed{g.enrichment.contributor ? ` by ${g.enrichment.contributor}` : ""}. Sources:{" "}
              {g.enrichment.sources.map((s, i) => (
                <span key={s}>
                  {i > 0 && ", "}
                  <a href={s} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                    {new URL(s).hostname.replace("www.", "")}
                  </a>
                </span>
              ))}
            </p>
          ) : null}
        </Section>

        <Section
          title={`Brands (${g.brandCount.toLocaleString("en-IN")})`}
          action={
            !allLoaded ? (
              <button onClick={loadAll} className="text-[12px] font-medium text-[var(--color-accent-ink)] hover:underline">
                Show all
              </button>
            ) : null
          }
        >
          {g.brandCount === 0 ? (
            <p className="text-sm text-[var(--color-faint)]">No branded medicines reference this generic.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {brands.map((b) => (
                <li key={b.id}>
                  <Link
                    href={conceptHref("brand", b.id)}
                    className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-wash)]/50"
                  >
                    <span className="truncate font-medium">{b.tradeName ?? b.name}</span>
                    {b.supplierName && <span className="shrink-0 truncate text-[11px] text-[var(--color-faint)]">{b.supplierName}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <aside className="space-y-4">
        <Section title="Export to CARE">
          <p className="mb-3 text-[13px] leading-relaxed text-[var(--color-muted)]">
            CARE <span className="code text-[12px]">ProductKnowledge</span>, SNOMED-coded. Exported as{" "}
            <span className="code text-[12px]">draft</span> until curated.
          </p>
          <CopyButton text={careJson} label="Copy ProductKnowledge" className="w-full justify-center" />
        </Section>
        <Section title="Improve this record">
          <ContributeBar c={g} />
          {g.lastUpdated && <p className="mt-3 text-[11px] text-[var(--color-faint)]">Source updated {g.lastUpdated}</p>}
        </Section>
      </aside>
    </div>
  );
}

// ── Substance ────────────────────────────────────────────────────────────────
function SubstanceView({ s }: { s: SubstanceDoc }) {
  const [names, setNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    resolveNames(s.genericIds.slice(0, 200)).then(setNames);
  }, [s.genericIds]);

  const chem: [string, string | undefined][] = [
    ["CAS Number", s.cas],
    ["UNII", s.unii],
    ["Molecular formula", s.molecularFormula],
    ["Molecular weight", s.molecularWeight],
    ["IUPAC name", s.iupac],
    ["InChI", s.inchi],
    ["SMILES", s.smiles],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Chemistry & identifiers">
          <dl>
            {chem.map(([k, v]) => (
              <KV key={k} k={k} v={v} mono={k !== "IUPAC name"} />
            ))}
          </dl>
          {(s.cas || s.unii) && (
            <p className="mt-3 text-[12px] text-[var(--color-faint)]">
              UNII / CAS are the bridge to RxNorm &amp; interaction data — used to build CDSS mappings.
            </p>
          )}
        </Section>

        {(s.description || s.toxicity) && (
          <Section title="Notes">
            {s.description && <p className="text-sm leading-relaxed">{s.description}</p>}
            {s.toxicity && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-ink)]">Toxicity. </span>
                {s.toxicity}
              </p>
            )}
          </Section>
        )}

        <Section title={`Used in ${s.genericCount.toLocaleString("en-IN")} generic drug${s.genericCount === 1 ? "" : "s"}`}>
          {s.genericCount === 0 ? (
            <p className="text-sm text-[var(--color-faint)]">No generics reference this substance.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {s.genericIds.slice(0, 200).map((id) => (
                <li key={id}>
                  <Link href={conceptHref("generic", id)} className="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-wash)]/50">
                    {names.get(id) ?? <span className="code text-[12px] text-[var(--color-faint)]">{id}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <aside className="space-y-4">
        <Section title="Improve this record">
          <ContributeBar c={s} />
        </Section>
      </aside>
    </div>
  );
}

// ── Brand ────────────────────────────────────────────────────────────────────
function BrandView({ b }: { b: BrandDoc }) {
  const careJson = async () => {
    const m = await getManifest();
    let def;
    let derived = false;
    if (b.genericId) {
      const g = (await getConcept("generic", b.genericId)) as GenericDoc | null;
      if (g) {
        def = genericToCare(g, m.sourceReleaseDate).definitional ?? undefined;
        derived = g.substances.some((x) => x.strength && x.strength.status !== "unparsed");
      }
    }
    return JSON.stringify(brandToCare(b, def, derived, m.sourceReleaseDate), null, 2);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Branded medicine">
          <dl>
            <KV k="Trade name" v={b.tradeName} />
            <KV
              k="Generic"
              v={
                b.genericId ? (
                  <Link href={conceptHref("generic", b.genericId)} className="text-[var(--color-accent-ink)] hover:underline">
                    {b.genericName ?? b.genericId}
                  </Link>
                ) : undefined
              }
            />
            <KV k="Supplier" v={b.supplier ? `${b.supplier.name}${b.supplier.country ? ` · ${b.supplier.country}` : ""}` : undefined} />
            <KV k="Marketed product" v={b.product?.name} />
            <KV k="License status" v={b.licenseStatus && b.licenseStatus !== "UNKNOWN" ? b.licenseStatus : undefined} />
          </dl>
          <p className="mt-3 text-[12px] text-[var(--color-faint)]">
            Composition &amp; strengths come from the generic. Open the generic for ingredients and dosing.
          </p>
        </Section>
      </div>
      <aside className="space-y-4">
        <Section title="Export to CARE">
          <CopyButton text={careJson} label="Copy ProductKnowledge" className="w-full justify-center" />
        </Section>
        <Section title="Improve this record">
          <ContributeBar c={b} />
          {b.lastUpdated && <p className="mt-3 text-[11px] text-[var(--color-faint)]">Source updated {b.lastUpdated}</p>}
        </Section>
      </aside>
    </div>
  );
}

export default function ConceptView({ concept }: { concept: ConceptDoc }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <IdentityHero c={concept} />
      </div>
      {concept.type === "generic" && <GenericView g={concept} />}
      {concept.type === "substance" && <SubstanceView s={concept} />}
      {concept.type === "brand" && <BrandView b={concept} />}
    </div>
  );
}
