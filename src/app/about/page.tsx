import Link from "next/link";

export const metadata = { title: "About · Clinical Codes Browser" };

export default function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-[15px] leading-relaxed">
      <h1 className="text-2xl font-semibold tracking-tight">About Clinical Codes Browser</h1>
      <p className="mt-4 text-[var(--color-muted)]">
        An open-source interface to India&apos;s NRCeS (C-DAC, MoHFW) clinical terminologies. It makes the
        flat-file releases searchable and easy to understand, and exports records for use in the OHC Network{" "}
        <strong>CARE</strong> EMR. Two terminologies are covered:
      </p>

      <h2 className="mt-8 text-lg font-semibold">Drug codes (CDCI · SNOMED CT)</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        The <strong>Common Drug Codes for India (CDCI)</strong> — India&apos;s SNOMED&nbsp;CT national drug
        terminology. Browse substances, generics and branded medicines, copy clean SNOMED identifiers, and export
        records as CARE <span className="code text-[13px]">ProductKnowledge</span>. The community can enrich the
        clinical detail via prefilled GitHub pull requests; enrichment is kept separate from the immutable source
        and safety-affecting fields require clinician/pharmacist sign-off before they go live.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Lab test codes (CLCI · LOINC)</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        The <strong>Common Lab Codes for India (CLCI)</strong> — a curated subset of <strong>LOINC v2.82</strong>{" "}
        covering commonly used lab tests in India. Each test&apos;s cryptic LOINC Fully-Specified Name is{" "}
        <strong>decoded into plain English</strong> — component, property, timing, specimen, scale and method —
        and tests can be browsed by specimen, scale and clinical discipline. Copy the LOINC code or a FHIR{" "}
        <span className="code text-[13px]">Coding</span>; a CARE observation export is planned for v2.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Data &amp; safety</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[var(--color-muted)]">
        <li>Drug strengths are derived from drug names and marked when unverified — confirm before relying on them.</li>
        <li>
          LOINC code breakdowns are derived from the Fully-Specified Name; the long common name is the
          authoritative display, and lab disciplines are best-effort.
        </li>
        <li>This is a reference tool, <strong>not</strong> a clinical decision-support or interaction-checking system.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Licence &amp; attribution</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        Drug data © C-DAC / NRCeS under{" "}
        <a className="underline decoration-dotted" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        ; contains SNOMED&nbsp;CT® content used under the SNOMED&nbsp;CT Affiliate Licence (SNOMED&nbsp;CT® is a
        registered trademark of SNOMED International). Brand and trade names belong to their respective owners.
      </p>
      <p className="mt-2 text-[var(--color-muted)]">
        Lab data contains content from{" "}
        <a className="underline decoration-dotted" href="https://loinc.org" target="_blank" rel="noreferrer">
          LOINC®
        </a>{" "}
        (loinc.org), © Regenstrief Institute, Inc. and the LOINC Committee, used under the LOINC licence.
        LOINC® is a registered trademark of Regenstrief Institute, Inc. The CLCI subset was prepared by
        NRCeS/C-DAC; Regenstrief Institute and the LOINC Committee do not endorse this subset. The datasets are
        intended for Indian healthcare use; community enrichment is contributed under CC&nbsp;BY&nbsp;4.0.
      </p>

      <p className="mt-8">
        <Link href="/" className="text-[var(--color-accent-ink)] hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
