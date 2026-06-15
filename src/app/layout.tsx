import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PWA from "@/components/PWA";
import "./globals.css";

export const metadata: Metadata = {
  title: "CDCI Browser — India Drug Codes (SNOMED CT)",
  description:
    "Search, browse and enrich India's NRCeS Common Drug Codes (SNOMED CT): substances, generics, brands. Export to CARE ProductKnowledge.",
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
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--color-accent)] text-[13px] font-bold text-white">
                Rx
              </span>
              <span>
                CDCI<span className="text-[var(--color-muted)] font-normal"> Browser</span>
              </span>
            </Link>
            <span className="hidden rounded-full bg-[var(--color-accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-accent-ink)] sm:inline">
              SNOMED CT · India
            </span>
            <nav className="ml-auto flex items-center gap-1 text-sm text-[var(--color-muted)]">
              <Link href="/about" className="rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60">
                About
              </Link>
              <a
                href="https://github.com/ohcnetwork/cdci"
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-2.5 py-1.5 hover:bg-[var(--color-line)]/60"
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
              Source data: <strong>Common Drug Codes for India (CDCI)</strong> by NRCeS, C-DAC —{" "}
              <a className="underline decoration-dotted" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
                CC BY 4.0
              </a>
              . Contains SNOMED CT® content used under the SNOMED CT Affiliate Licence. SNOMED CT® is a
              registered trademark of SNOMED International. Brand/trade names are the property of their
              respective owners. Intended for Indian healthcare use.
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
