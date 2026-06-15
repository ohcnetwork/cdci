import Link from "next/link";

export const metadata = { title: "About · CDCI Browser" };

export default function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-[15px] leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">About CDCI Browser</h1>
      <p className="mt-4 text-[var(--color-muted)]">
        An open-source interface to the <strong>Common Drug Codes for India (CDCI)</strong> — India&apos;s
        SNOMED&nbsp;CT national drug terminology published by NRCeS (C-DAC, MoHFW). It makes the flat-file
        release searchable, lets the community enrich the clinical detail, and exports records as CARE{" "}
        <span className="code text-[13px]">ProductKnowledge</span> for use in the OHC Network CARE EMR.
      </p>

      <h2 className="mt-8 text-lg font-semibold">How to contribute</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        Every concept page has <strong>Suggest edit</strong> (opens a prefilled GitHub pull request against an
        enrichment file) and <strong>Report issue</strong>. Enrichment is kept separate from the immutable
        source and merged at build time. Safety-affecting fields (contra-indications, interactions,
        therapeutic role, strengths) require clinician/pharmacist sign-off before they go live; every record
        shows its review status.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Data &amp; safety</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[var(--color-muted)]">
        <li>Strengths shown are derived from drug names and marked when unverified — confirm before relying on them.</li>
        <li>This is a reference tool, <strong>not</strong> a clinical decision-support or interaction-checking system.</li>
        <li>CARE exports default to <span className="code text-[13px]">draft</span> status until curated.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Licence &amp; attribution</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        Source data © C-DAC / NRCeS, released under{" "}
        <a className="underline decoration-dotted" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        . Contains SNOMED&nbsp;CT® content used under the SNOMED&nbsp;CT Affiliate Licence; SNOMED&nbsp;CT® is a
        registered trademark of SNOMED International. Brand and trade names belong to their respective owners.
        The dataset is intended for Indian healthcare use. Community enrichment is contributed under CC&nbsp;BY&nbsp;4.0.
      </p>

      <p className="mt-8">
        <Link href="/" className="text-[var(--color-accent-ink)] hover:underline">
          ← Back to search
        </Link>
      </p>
    </div>
  );
}
