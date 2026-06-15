"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureBrands, ensureCore, search, type Hit } from "@/lib/data";
import type { ConceptType } from "@/lib/types";

const TYPE_META: Record<string, { label: string; cls: string }> = {
  generic: { label: "Generic", cls: "bg-[var(--color-accent-wash)] text-[var(--color-accent-ink)]" },
  substance: { label: "Substance", cls: "bg-indigo-50 text-indigo-700" },
  brand: { label: "Brand", cls: "bg-[var(--color-amber-wash)] text-[var(--color-amber-ink)]" },
  product: { label: "Product", cls: "bg-stone-100 text-stone-600" },
};

export function conceptHref(type: ConceptType, id: string): string {
  return `/concept/?id=${encodeURIComponent(id)}&t=${type}`;
}

export default function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [brandsReady, setBrandsReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // warm the indexes
  useEffect(() => {
    ensureCore();
    ensureBrands().then(() => setBrandsReady(true));
  }, []);

  // global "/" to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback(
    async (value: string) => {
      const my = ++reqId.current;
      const res = await search(value, { includeBrands: true, limit: 24 });
      if (my === reqId.current) {
        setHits(res);
        setActive(0);
        setOpen(true);
      }
    },
    [],
  );

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => run(q), 60);
    return () => clearTimeout(t);
  }, [q, brandsReady, run]);

  const go = (h: Hit) => {
    setOpen(false);
    router.push(conceptHref(h.type, h.id));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) {
      if (e.key === "Enter" && /^\d{5,}$/.test(q.trim())) {
        router.push(`/concept/?id=${q.trim()}`); // pasted SCTID, type probed
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-sm transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_var(--color-accent-wash)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[var(--color-faint)]">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => hits.length && setOpen(true)}
          placeholder="Search a drug, brand, substance, or paste a SNOMED code…"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-faint)]"
          aria-label="Search drugs"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="hidden shrink-0 rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[11px] text-[var(--color-faint)] sm:block">
          /
        </kbd>
      </div>

      {open && hits.length > 0 && (
        <ul className="thin-scroll absolute z-20 mt-2 max-h-[60vh] w-full overflow-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 shadow-lg">
          {hits.map((h, i) => {
            const meta = TYPE_META[h.type] ?? TYPE_META.product;
            return (
              <li key={h.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                    i === active ? "bg-[var(--color-accent-wash)]/60" : ""
                  }`}
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                  <span className="flex-1 truncate">{h.name}</span>
                  <span className="code shrink-0 text-[11px] text-[var(--color-faint)]">{h.id}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
