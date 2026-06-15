"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SearchBox, { conceptHref } from "@/components/SearchBox";
import { ensureBrands, ensureCore, search, type Hit } from "@/lib/data";

const TYPE_META: Record<string, { label: string; cls: string }> = {
  generic: { label: "Generic", cls: "bg-[var(--color-accent-wash)] text-[var(--color-accent-ink)]" },
  substance: { label: "Substance", cls: "bg-indigo-50 text-indigo-700" },
  brand: { label: "Brand", cls: "bg-[var(--color-amber-wash)] text-[var(--color-amber-ink)]" },
  product: { label: "Product", cls: "bg-stone-100 text-stone-600" },
};

function Results() {
  const q = useSearchParams().get("q")?.trim() ?? "";
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([ensureCore(), ensureBrands()])
      .then(() => search(q, { includeBrands: true, limit: 100 }))
      .then((r) => alive && (setHits(r), setLoading(false)));
    return () => {
      alive = false;
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SearchBox />
      <p className="mt-4 text-sm text-[var(--color-muted)]">
        {loading ? "Searching…" : `${hits.length} result${hits.length === 1 ? "" : "s"} for "${q}"`}
      </p>
      <ul className="mt-3 divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        {hits.map((h) => {
          const meta = TYPE_META[h.type] ?? TYPE_META.product;
          return (
            <li key={h.id}>
              <Link href={conceptHref(h.type, h.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-accent-wash)]/40">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>
                <span className="flex-1 truncate text-sm">{h.name}</span>
                <span className="code shrink-0 text-[11px] text-[var(--color-faint)]">{h.id}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {!loading && hits.length === 0 && q && (
        <p className="mt-6 text-center text-sm text-[var(--color-faint)]">No matches. Try a generic name or a SNOMED code.</p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-sm text-[var(--color-faint)]">Loading…</div>}>
      <Results />
    </Suspense>
  );
}
