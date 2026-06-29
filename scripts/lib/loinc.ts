// Pure helpers for the CLCI lab-codes build: CSV parsing, LOINC FSN
// decomposition + validation, and LabTest assembly. No filesystem access here —
// the caller (scripts/build-labs.ts) reads the file and writes artifacts. Kept
// pure so it is unit-testable in isolation (scripts/lib/loinc.test.ts).
import {
  KNOWN_SCALE,
  glossAxis,
  normalizeSpecimen,
  scaleFacet,
} from "../../src/lib/labs/glossary";
import { deriveCategories } from "../../src/lib/labs/categories";
import type { LabTest, LoincParts } from "../../src/lib/labs/types";

/** Minimal RFC-4180 CSV parser: handles quoted fields, embedded commas, and
 *  doubled "" escapes. The CLCI file double-quotes every field. */
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // skip blank lines produced by trailing newlines
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

/**
 * Decompose a LOINC FSN (Component:Property:Time:System:Scale[:Method]).
 *
 * Best-effort + validated: the split is trusted only when there are exactly 5
 * or 6 colon-separated parts AND the scale position holds a valid LOINC scale
 * token. This rejects (a) the rows whose FSN field actually contains a Long-
 * Common-Name string (no colons) and (b) the rows where the component itself
 * contains a colon (HLA alleles, lipids, newborn panels) and the split drifts.
 * Rejected rows are marked "unparsed" and the UI leans on the Long Common Name.
 */
export function parseFsn(fsn: string): LoincParts {
  const parts = fsn.split(":");
  const n = parts.length;
  const scaleOk = (n === 5 || n === 6) && KNOWN_SCALE.has(parts[4]);
  if (!scaleOk) return { status: "unparsed" };
  const out: LoincParts = {
    // The component token IS the analyte name; gloss describes the axis itself.
    component: { raw: parts[0], gloss: "The substance or analyte being measured" },
    property: glossAxis("property", parts[1]),
    time: glossAxis("time", parts[2]),
    system: glossAxis("system", parts[3]),
    scale: glossAxis("scale", parts[4]),
    status: "parsed",
  };
  if (n === 6 && parts[5]) out.method = glossAxis("method", parts[5]);
  return out;
}

/** Assemble a LabTest from the four CSV columns (categories = heuristic only;
 *  overrides are applied by the build step). */
export function buildLabTest(
  name: string,
  code: string,
  fsn: string,
  longCommonName: string,
): LabTest {
  const parts = parseFsn(fsn);
  const systemRaw = parts.system?.raw;
  const scaleRaw = parts.scale?.raw;
  return {
    code,
    name,
    longCommonName,
    fsn,
    parts,
    specimen: systemRaw ? normalizeSpecimen(systemRaw) : undefined,
    scale: scaleRaw ? scaleFacet(scaleRaw) : undefined,
    categories: deriveCategories({ name, longCommonName, parts }),
  };
}

export interface ParseResult {
  tests: LabTest[];
  skipped: { line: number; reason: string }[];
}

/** Parse the whole CLCI CSV into LabTest[]. Expects the documented 4 columns. */
export function parseLabCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  const tests: LabTest[] = [];
  const skipped: { line: number; reason: string }[] = [];
  if (rows.length === 0) return { tests, skipped };
  // header row: General Name, LOINC Code, Fully-Specified Name (FSN), Long Common Name
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const [name, code, fsn, lcn] = [r[0]?.trim(), r[1]?.trim(), r[2]?.trim(), r[3]?.trim()];
    if (!code) {
      skipped.push({ line: i + 1, reason: "missing LOINC code" });
      continue;
    }
    tests.push(buildLabTest(name ?? "", code, fsn ?? "", lcn ?? ""));
  }
  return { tests, skipped };
}
