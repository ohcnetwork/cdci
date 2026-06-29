import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PWA from "@/components/PWA";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clinical Codes Browser — India (SNOMED CT & LOINC)",
  description:
    "Search and browse India's NRCeS clinical terminologies: drug codes (CDCI · SNOMED CT) and lab test codes (CLCI · LOINC). Decode LOINC tests into plain English and export to CARE.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0d7d74",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <PWA />
        <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent)] text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 8 5 12l4 4M15 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>
                Clinical Codes<span className="hidden text-[var(--color-muted)] font-normal sm:inline"> Browser</span>
              </span>
            </Link>
            <span className="hidden rounded-full bg-[var(--color-accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-ink)] sm:inline">
              India · SNOMED CT &amp; LOINC
            </span>
            <nav className="ml-auto flex items-center gap-1 text-sm text-[var(--color-muted)]">
              <Link href="/search" className="rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60">
                Drugs
              </Link>
              <Link href="/labs" className="rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60">
                Labs
              </Link>
              <Link href="/about" className="rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60">
                About
              </Link>
              <a
                href="https://github.com/ohcnetwork/cdci"
                target="_blank"
                rel="noreferrer"
                className="hidden rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60 sm:block"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-6 text-[13px] leading-relaxed text-[var(--color-muted)]">
            <p>
              Drug codes: <strong>Common Drug Codes for India (CDCI)</strong> by NRCeS, C-DAC —{" "}
              <a className="underline decoration-dotted" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>
              . Contains SNOMED CT® content used under the SNOMED CT Affiliate Licence. SNOMED CT® is a
              registered trademark of SNOMED International. Brand/trade names are the property of their
              respective owners. Intended for Indian healthcare use.
            </p>
            <p className="mt-2">
              Lab codes: <strong>Common Lab Codes for India (CLCI)</strong> by NRCeS, C-DAC. Contains content from{" "}
              <a className="underline decoration-dotted" href="https://loinc.org" target="_blank" rel="noreferrer">
                LOINC®
              </a>{" "}
              (loinc.org), © Regenstrief Institute, Inc. and the LOINC Committee, used under the LOINC licence.
              LOINC® is a registered trademark of Regenstrief Institute, Inc. Regenstrief and the LOINC Committee
              do not endorse this subset.
            </p>
            <p className="mt-2 text-[var(--color-faint)]">
              Not a clinical decision-support tool. Community-contributed content is shown with its
              review status and must not be relied on for prescribing.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
