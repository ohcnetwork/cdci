"use client";
import { useState } from "react";

export default function CopyButton({
  text,
  label,
  className = "",
  title,
}: {
  text: string | (() => Promise<string> | string);
  label: string;
  className?: string;
  title?: string;
}) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    const value = typeof text === "function" ? await text() : text;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <button
      onClick={onClick}
      title={title ?? `Copy ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-ink)] ${className}`}
    >
      {done ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
