"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAllLabTests, getLabsManifest, labHref, searchLabs } from "@/lib/labs/data";
import type { LabsManifest, LabTest } from "@/lib/labs/types";

const RESULT_CAP = 200;
const SPECIMEN_COLLAPSED = 12;

function FacetChip({ label, count, on, toggle }: { label: string; count: number; on: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
        on
          ? "border-[var(--color-accent)] bg-[var(--color-accent-wash)] text-[var(--color-accent-ink)]"
          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)]"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums text-[10px] text-[var(--color-faint)]">{count.toLocaleString("en-IN")}</span>
    </button>
  );
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-faint)]">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function sortByCount(rec: Record<string, number>): [string, number][] {
  return Object.entries(rec).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function LabsBrowser({ initialQ = "", initialCategory = "", initialSpecimen = "" }: {
  initialQ?: string;
  initialCategory?: string;
  initialSpecimen?: string;
}) {
  const [manifest, setManifest] = useState<LabsManifest | null>(null);
  const [all, setAll] = useState<LabTest[]>([]);
  const [q, setQ] = useState(initialQ);
  const [hits, setHits] = useState<LabTest[] | null>(null); // null → use full set
  const [loading, setLoading] = useState(true);
  const [specimens, setSpecimens] = useState<Set<string>>(new Set(initialSpecimen ? [initialSpecimen] : []));
  const [scales, setScales] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Set<string>>(new Set(initialCategory ? [initialCategory] : []));
  const [showAllSpecimens, setShowAllSpecimens] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([getLabsManifest(), getAllLabTests()]).then(([m, map]) => {
      setManifest(m);
      setAll(Object.values(map));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setHits(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      searchLabs(query, 1000).then((r) => alive && setHits(r));
    }, 60);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) =>
    set((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });

  const results = useMemo(() => {
    const base = hits ?? all;
    return base.filter(
      (t) =>
        (specimens.size === 0 || (t.specimen != null && specimens.has(t.specimen))) &&
        (scales.size === 0 || (t.scale != null && scales.has(t.scale))) &&
        (categories.size === 0 || t.categories.some((c) => categories.has(c))),
    );
  }, [hits, all, specimens, scales, categories]);

  const activeFacetCount = specimens.size + scales.size + categories.size;
  const anyFacet = activeFacetCount > 0;
  const shown = results.slice(0, RESULT_CAP);
  const specimenEntries = manifest ? sortByCount(manifest.facets.specimen) : [];
  const visibleSpecimens = showAllSpecimens ? specimenEntries : specimenEntries.slice(0, SPECIMEN_COLLAPSED);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Lab tests</h1>
        {manifest && (
          <p className="text-[13px] text-[var(--color-faint)]">
            {manifest.count.toLocaleString("en-IN")} LOINC codes · CLCI subset (LOINC {manifest.loincVersion})
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-sm focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-wash)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-faint)]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a lab test by name, long name, or LOINC code…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-faint)]"
          aria-label="Search lab tests"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <button
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-[13px] text-[var(--color-muted)] lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {filtersOpen ? "Hide filters" : "Filters"}
        {activeFacetCount > 0 && <span className="rounded-full bg-[var(--color-accent-wash)] px-1.5 text-[11px] font-medium text-[var(--color-accent-ink)]">{activeFacetCount}</span>}
      </button>

      <div className="mt-3 grid gap-6 lg:mt-5 lg:grid-cols-[230px_1fr]">
        <aside className={`space-y-5 ${filtersOpen ? "block" : "hidden"} lg:block`}>
          {manifest && (
            <>
              <FacetGroup title="Discipline">
                {sortByCount(manifest.facets.category).map(([label, count]) => (
                  <FacetChip key={label} label={label} count={count} on={categories.has(label)} toggle={() => toggle(setCategories, label)} />
                ))}
              </FacetGroup>
              <FacetGroup title="Scale">
                {sortByCount(manifest.facets.scale).map(([label, count]) => (
                  <FacetChip key={label} label={label} count={count} on={scales.has(label)} toggle={() => toggle(setScales, label)} />
                ))}
              </FacetGroup>
              <FacetGroup title="Specimen">
                {visibleSpecimens.map(([label, count]) => (
                  <FacetChip key={label} label={label} count={count} on={specimens.has(label)} toggle={() => toggle(setSpecimens, label)} />
                ))}
                {specimenEntries.length > SPECIMEN_COLLAPSED && (
                  <button
                    onClick={() => setShowAllSpecimens((v) => !v)}
                    className="rounded-full px-2.5 py-1 text-[12px] font-medium text-[var(--color-accent-ink)] hover:underline"
                  >
                    {showAllSpecimens ? "Show fewer" : `+${specimenEntries.length - SPECIMEN_COLLAPSED} more`}
                  </button>
                )}
              </FacetGroup>
              {anyFacet && (
                <button
                  onClick={() => {
                    setSpecimens(new Set());
                    setScales(new Set());
                    setCategories(new Set());
                  }}
                  className="text-[12px] text-[var(--color-muted)] hover:text-[var(--color-accent-ink)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </>
          )}
        </aside>

        <div>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            {loading ? "Loading…" : `${results.length.toLocaleString("en-IN")} ${results.length === 1 ? "test" : "tests"}`}
            {!loading && results.length > RESULT_CAP && (
              <span className="text-[var(--color-faint)]"> · showing first {RESULT_CAP}, refine to narrow</span>
            )}
          </p>
          <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
            {shown.map((t) => (
              <li key={t.code}>
                <Link href={labHref(t.code)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-accent-wash)]/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{t.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--color-faint)]">{t.longCommonName}</span>
                  </span>
                  {t.specimen && (
                    <span className="hidden shrink-0 rounded bg-[var(--color-paper)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] sm:inline">
                      {t.specimen}
                    </span>
                  )}
                  <span className="code shrink-0 text-[11px] text-[var(--color-faint)]">{t.code}</span>
                </Link>
              </li>
            ))}
          </ul>
          {!loading && results.length === 0 && (
            <p className="mt-6 text-center text-sm text-[var(--color-faint)]">
              No lab tests match. Try a different term, or clear the filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
