"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LabTestView from "@/components/labs/LabTestView";
import { getLabTest } from "@/lib/labs/data";
import type { LabTest } from "@/lib/labs/types";

type State = { status: "loading" } | { status: "ok"; test: LabTest } | { status: "missing" } | { status: "error" };

function LabResolver() {
  const code = useSearchParams().get("code")?.trim() ?? "";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    if (!code) {
      setState({ status: "missing" });
      return;
    }
    setState({ status: "loading" });
    getLabTest(code)
      .then((t) => alive && setState(t ? { status: "ok", test: t } : { status: "missing" }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [code]);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="h-6 w-28 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-4 h-9 w-2/3 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-3 h-7 w-40 animate-pulse rounded bg-[var(--color-line)]" />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-xl bg-[var(--color-line)] lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-xl bg-[var(--color-line)]" />
        </div>
      </div>
    );
  }

  if (state.status === "ok") return <LabTestView test={state.test} />;

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">
        {state.status === "missing" ? "Lab test not found" : "Couldn’t load this lab test"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {state.status === "missing"
          ? `No lab test matched ${code ? `“${code}”` : "this link"}. It may be outside the CLCI subset.`
          : "There was a problem loading the data. Check your connection and try again."}
      </p>
      <Link href="/labs" className="mt-6 inline-block rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">
        Browse lab tests
      </Link>
    </div>
  );
}

export default function LabPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-sm text-[var(--color-faint)]">Loading…</div>}>
      <LabResolver />
    </Suspense>
  );
}
