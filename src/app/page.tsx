"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchBox from "@/components/SearchBox";
import { getManifest } from "@/lib/data";
import { getLabsManifest } from "@/lib/labs/data";
import type { BuildManifest } from "@/lib/types";
import type { LabsManifest } from "@/lib/labs/types";

const DRUG_EXAMPLES = ["Paracetamol", "Amoxicillin", "Metformin", "Azithromycin"];
const LAB_EXAMPLES = ["Glucose", "Creatinine", "Culture", "Cholesterol"];

function fmt(n: number | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-IN");
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[13px] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)]"
    >
      {label}
    </Link>
  );
}

export default function Home() {
  const [m, setM] = useState<BuildManifest | null>(null);
  const [lm, setLm] = useState<LabsManifest | null>(null);
  const [labQ, setLabQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    getManifest().then(setM).catch(() => {});
    getLabsManifest().then(setLm).catch(() => {});
  }, []);

  const submitLab = (e: React.FormEvent) => {
    e.preventDefault();
    const q = labQ.trim();
    router.push(q ? `/labs/?q=${encodeURIComponent(q)}` : "/labs");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:pt-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-[12px] text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          NRCeS clinical terminologies · India
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          India&apos;s clinical codes,
          <br className="hidden sm:block" /> searchable and open.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-[var(--color-muted)]">
          Look up India&apos;s national drug codes (SNOMED&nbsp;CT) and lab test codes (LOINC) by name or code.
          Copy clean identifiers, decode every LOINC test into plain English, and export to CARE.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {/* Drugs */}
        <section className="card flex flex-col p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-accent)] text-[13px] font-bold text-white">Rx</span>
            <div>
              <div className="text-[15px] font-semibold leading-tight">Drug codes</div>
              <div className="text-[12px] text-[var(--color-muted)]">CDCI · SNOMED CT</div>
            </div>
          </div>
          <div className="mt-4">
            <SearchBox />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {DRUG_EXAMPLES.map((e) => (
              <Chip key={e} href={`/search/?q=${encodeURIComponent(e)}`} label={e} />
            ))}
          </div>
          <p className="mt-auto pt-4 text-[12px] text-[var(--color-faint)]">
            {fmt(m?.counts.generic)} generics · {fmt(m?.counts.brand)} brands · {fmt(m?.counts.substance)} substances
          </p>
        </section>

        {/* Labs */}
        <section className="card flex flex-col p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-accent)] text-white">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 3h6M10 3v6L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <div className="text-[15px] font-semibold leading-tight">Lab tests</div>
              <div className="text-[12px] text-[var(--color-muted)]">CLCI · LOINC</div>
            </div>
          </div>
          <form onSubmit={submitLab} className="mt-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-sm focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-wash)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-faint)]">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                value={labQ}
                onChange={(e) => setLabQ(e.target.value)}
                placeholder="Search a lab test or LOINC code…"
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-faint)]"
                aria-label="Search lab tests"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {LAB_EXAMPLES.map((e) => (
              <Chip key={e} href={`/labs/?q=${encodeURIComponent(e)}`} label={e} />
            ))}
          </div>
          <p className="mt-auto pt-4 text-[12px] text-[var(--color-faint)]">
            {fmt(lm?.count)} LOINC codes ·{" "}
            <Link href="/labs" className="text-[var(--color-accent-ink)] hover:underline">
              Browse all lab tests →
            </Link>
          </p>
        </section>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Search", d: "Fast prefix search across ~186k drug concepts and 1.5k LOINC lab tests." },
          { t: "Decode", d: "Every LOINC test split into plain English — component, specimen, scale and method." },
          { t: "Export to CARE", d: "Copy any drug as a CARE ProductKnowledge resource, or a lab as a LOINC FHIR Coding." },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <div className="text-sm font-semibold">{c.t}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">{c.d}</p>
          </div>
        ))}
      </div>

      {(m || lm) && (
        <p className="mt-10 text-center text-[12px] text-[var(--color-faint)]">
          {m && `CDCI release ${m.sourceReleaseDate}`}
          {m && lm && " · "}
          {lm && `CLCI · LOINC ${lm.loincVersion}`}
        </p>
      )}
    </div>
  );
}
