"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import { getManifest } from "@/lib/data";
import type { BuildManifest } from "@/lib/types";

const EXAMPLES = [
  { label: "Paracetamol", q: "Paracetamol" },
  { label: "Amoxicillin", q: "Amoxicillin" },
  { label: "Metformin", q: "Metformin" },
  { label: "Azithromycin", q: "Azithromycin" },
];

function fmt(n: number | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-IN");
}

export default function Home() {
  const [m, setM] = useState<BuildManifest | null>(null);
  useEffect(() => {
    getManifest().then(setM).catch(() => {});
  }, []);

  const stats = [
    { k: "Substances", v: m?.counts.substance, href: undefined },
    { k: "Generics", v: m?.counts.generic },
    { k: "Brands", v: m?.counts.brand },
    { k: "Products", v: m?.counts.product },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:pt-20">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-[12px] text-[var(--color-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          NRCeS Common Drug Codes for India · SNOMED CT
        </span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          India&apos;s drug codes,
          <br className="hidden sm:block" /> searchable and open.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-[var(--color-muted)]">
          Look up substances, generics and branded medicines by name or SNOMED code. Copy clean
          identifiers, export to CARE, and help enrich the data.
        </p>
      </div>

      <div className="mt-8">
        <SearchBox autoFocus />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[13px] text-[var(--color-muted)]">
          <span>Try:</span>
          {EXAMPLES.map((e) => (
            <Link
              key={e.q}
              href={`/search/?q=${encodeURIComponent(e.q)}`}
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)]"
            >
              {e.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="card px-4 py-4 text-center">
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{fmt(s.v)}</div>
            <div className="mt-0.5 text-[12px] text-[var(--color-muted)]">{s.k}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          {
            t: "Browse",
            d: "Fast prefix search across ~186k concepts. Navigate substance → generic → brand with permalinks.",
          },
          {
            t: "Enrich",
            d: "Fill indications, contraindications and strengths. Suggest edits as reviewed GitHub pull requests.",
          },
          {
            t: "Export to CARE",
            d: "Copy any concept as a CARE ProductKnowledge resource, SNOMED-coded and ready to import.",
          },
        ].map((c) => (
          <div key={c.t} className="card p-4">
            <div className="text-sm font-semibold">{c.t}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">{c.d}</p>
          </div>
        ))}
      </div>

      {m && (
        <p className="mt-10 text-center text-[12px] text-[var(--color-faint)]">
          Source release {m.sourceReleaseDate} · built {new Date(m.builtAt).toISOString().slice(0, 10)} ·{" "}
          {m.strengthCoverage
            ? `${Math.round(
                (m.strengthCoverage.parsed / (m.counts.generic || 1)) * 100,
              )}% strengths parsed`
            : ""}
        </p>
      )}
    </div>
  );
}
