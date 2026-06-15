"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ConceptView from "@/components/concept/ConceptView";
import { getConcept, resolveConcept } from "@/lib/data";
import type { ConceptDoc } from "@/lib/types";

type State = { status: "loading" } | { status: "ok"; doc: ConceptDoc } | { status: "missing" } | { status: "error" };

function ConceptResolver() {
  const params = useSearchParams();
  const id = params.get("id")?.trim() ?? "";
  const tRaw = params.get("t");
  const t = tRaw === "substance" || tRaw === "generic" || tRaw === "brand" ? tRaw : null;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    if (!id) {
      setState({ status: "missing" });
      return;
    }
    setState({ status: "loading" });
    const p = t ? getConcept(t, id) : resolveConcept(id);
    p.then((doc) => alive && setState(doc ? { status: "ok", doc } : { status: "missing" })).catch(
      () => alive && setState({ status: "error" }),
    );
    return () => {
      alive = false;
    };
  }, [id, t]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-6 w-24 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-3 h-7 w-48 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-xl bg-[var(--color-line)] lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-xl bg-[var(--color-line)]" />
        </div>
      </div>
    );
  }

  if (state.status === "ok") return <ConceptView concept={state.doc} />;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">
        {state.status === "missing" ? "Concept not found" : "Couldn’t load this concept"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {state.status === "missing"
          ? `No concept matched ${id ? `“${id}”` : "this link"}. It may be outside the current release.`
          : "There was a problem loading the data. Check your connection and try again."}
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Back to search
      </Link>
    </div>
  );
}

export default function ConceptPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-sm text-[var(--color-faint)]">Loading…</div>}>
      <ConceptResolver />
    </Suspense>
  );
}
