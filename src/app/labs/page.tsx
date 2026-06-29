"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import LabsBrowser from "@/components/labs/LabsBrowser";

function LabsRoute() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() ?? "";
  const specimen = params.get("specimen")?.trim() ?? "";
  // Key on the params so a same-route query change (deep link, Back/Forward)
  // remounts with fresh filter state rather than keeping stale useState seeds.
  return <LabsBrowser key={`${q}|${category}|${specimen}`} initialQ={q} initialCategory={category} initialSpecimen={specimen} />;
}

export default function LabsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-sm text-[var(--color-faint)]">Loading…</div>}>
      <LabsRoute />
    </Suspense>
  );
}
