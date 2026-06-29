"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { getAllLabTests, labHref, loincCoding, relatedBySpecimen } from "@/lib/labs/data";
import { LOINC_SYSTEM, type LabTest, type LoincAxis } from "@/lib/labs/types";

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

const AXES: { key: keyof Omit<LabTest["parts"], "status">; label: string }[] = [
  { key: "component", label: "Component" },
  { key: "property", label: "Property" },
  { key: "time", label: "Time" },
  { key: "system", label: "Specimen" },
  { key: "scale", label: "Scale" },
  { key: "method", label: "Method" },
];

function AxisRow({ label, axis }: { label: string; axis?: LoincAxis }) {
  if (!axis) return null;
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 border-t border-[var(--color-line)] py-2.5 first:border-t-0 sm:grid-cols-[110px_140px_1fr]">
      <dt className="text-[13px] text-[var(--color-muted)]">{label}</dt>
      <dd className="code text-[13px] sm:order-none">
        <span className="rounded bg-[var(--color-paper)] px-1.5 py-0.5">{axis.raw}</span>
      </dd>
      <dd className="col-span-2 text-sm leading-snug sm:col-span-1">
        {axis.gloss ?? <span className="text-[var(--color-faint)]">—</span>}
      </dd>
    </div>
  );
}

function IdentityHero({ t }: { t: LabTest }) {
  const coding = loincCoding(t);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded bg-[var(--color-accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-ink)]">
          Lab test · LOINC
        </span>
        <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-[11px] text-[var(--color-muted)]">
          LOINC International
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-[28px]">{t.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="code rounded-md bg-[var(--color-ink)] px-2.5 py-1 text-sm text-white">{t.code}</span>
        <CopyButton text={t.code} label="Copy LOINC code" />
        <CopyButton text={JSON.stringify(coding, null, 2)} label="FHIR Coding" title="Copy as FHIR Coding JSON" />
      </div>
      <p className="mt-2 text-[12px] text-[var(--color-faint)]">
        LOINC identifier · system <span className="code">{LOINC_SYSTEM}</span>
      </p>
    </div>
  );
}

export default function LabTestView({ test }: { test: LabTest }) {
  const [related, setRelated] = useState<LabTest[]>([]);
  useEffect(() => {
    getAllLabTests().then((map) => setRelated(relatedBySpecimen(map, test)));
  }, [test]);

  const parsed = test.parts.status === "parsed";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <IdentityHero t={test} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Long common name">
            <p className="text-[15px] leading-relaxed">{test.longCommonName || <span className="text-[var(--color-faint)]">—</span>}</p>
            <p className="mt-2 text-[12px] text-[var(--color-faint)]">
              The fully spelled-out LOINC display name — the authoritative readable form.
            </p>
          </Section>

          <Section
            title="What this code means"
            action={
              parsed ? (
                <span className="rounded-full bg-[var(--color-amber-wash)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-amber-ink)]">
                  derived from FSN
                </span>
              ) : null
            }
          >
            {parsed ? (
              <>
                <p className="code mb-2 text-[12px] text-[var(--color-faint)]">{test.fsn}</p>
                <dl>
                  {AXES.map((a) => (
                    <AxisRow key={a.key} label={a.label} axis={test.parts[a.key] as LoincAxis | undefined} />
                  ))}
                </dl>
                <p className="mt-3 text-[12px] text-[var(--color-faint)]">
                  Breakdown of the LOINC Fully-Specified Name into its six axes. Derived from the code name —
                  the long common name above is the source of truth.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  A structured breakdown isn’t available for this code — its fully-specified name doesn’t follow
                  the standard six-axis form. Rely on the long common name above.
                </p>
                <p className="code mt-3 rounded-md bg-[var(--color-paper)] px-3 py-2 text-[12px]">{test.fsn}</p>
              </>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="Categories">
            <div className="flex flex-wrap gap-1.5">
              {test.categories.map((c) => (
                <Link
                  key={c}
                  href={`/labs/?category=${encodeURIComponent(c)}`}
                  className="rounded-full bg-[var(--color-accent-wash)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-accent-ink)] hover:underline"
                >
                  {c}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-faint)]">Disciplines are derived and best-effort.</p>
          </Section>

          <Section title="Use">
            <CopyButton text={test.code} label="Copy LOINC code" className="w-full justify-center" />
            <div className="mt-2">
              <CopyButton
                text={JSON.stringify(loincCoding(test), null, 2)}
                label="Copy FHIR Coding"
                className="w-full justify-center"
              />
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-faint)]">CARE observation export is coming in v2.</p>
          </Section>

          {related.length > 0 && (
            <Section
              title={`More ${test.specimen} tests`}
              action={
                <Link
                  href={`/labs/?specimen=${encodeURIComponent(test.specimen ?? "")}`}
                  className="text-[12px] font-medium text-[var(--color-accent-ink)] hover:underline"
                >
                  See all
                </Link>
              }
            >
              <ul className="space-y-0.5">
                {related.map((r) => (
                  <li key={r.code}>
                    <Link href={labHref(r.code)} className="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-accent-wash)]/50">
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
