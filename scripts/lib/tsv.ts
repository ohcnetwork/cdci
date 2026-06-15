import { readFileSync } from "node:fs";

export interface TsvTable {
  header: string[];
  rows: Record<string, string>[];
}

/** Read a SNOMED RF2-style tab-separated file (no field quoting; UTF-8). */
export function readTsv(path: string): TsvTable {
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const lines = text.split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  const header = lines[0].split("\t").map((h) => h.trim());
  const rows: Record<string, string>[] = new Array(Math.max(0, lines.length - 1));
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const rec: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) rec[header[c]] = (cols[c] ?? "").trim();
    rows[i - 1] = rec;
  }
  return { header, rows };
}

/** Split a "+"-joined SCTID list (used for combination substances / multiple routes). */
export function splitIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function nonEmpty(v: string | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t.length ? t : undefined;
}
