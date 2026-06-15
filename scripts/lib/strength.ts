import type { ParsedStrength, StrengthStatus } from "../../src/lib/types";

// Map source unit spellings → UCUM. Units NOT in this map are kept raw and the
// strength is flagged "review" (never silently presented as authoritative).
const UCUM: Record<string, string> = {
  mg: "mg",
  g: "g",
  gram: "g",
  kg: "kg",
  microgram: "ug",
  micrograms: "ug",
  mcg: "ug",
  ug: "ug",
  nanogram: "ng",
  ng: "ng",
  ml: "mL",
  millilitre: "mL",
  milliliter: "mL",
  litre: "L",
  liter: "L",
  l: "L",
  microlitre: "uL",
  microliter: "uL",
  mmol: "mmol",
  mol: "mol",
  meq: "meq",
  "%": "%",
  iu: "[iU]",
  unit: "U",
  units: "U",
};

// Units we recognise but that have no clean UCUM mapping → strength = "review".
const REVIEW_UNITS = new Set(["mbq", "gbq", "kbq", "million unit", "vial"]);

// Denominator (per-X) units that are containers/actuations rather than UCUM volume/mass.
const DENOM_NONUCUM = new Set(["vial", "actuation", "dose", "application", "patch", "sachet"]);

const UNIT_ALT =
  "%|MBq|GBq|kBq|million\\s+unit|micrograms?|microlitres?|microliters?|nanogram|mcg|ug|ng|mmol|mol|mEq|meq|IU|iu|units?|mg|kg|g|mL|ml|litres?|liters?|L";
const DENOM_ALT = "mL|ml|g|mg|L|litres?|liters?|vial|actuation|dose|application|patch|sachet|hour|h";

const TOKEN_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALT})` +
    `(?:\\s*/\\s*(\\d+(?:\\.\\d+)?)?\\s*(${DENOM_ALT}))?`,
  "gi",
);

function mapUnit(raw: string): { unit: string; review: boolean } {
  const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (REVIEW_UNITS.has(key)) return { unit: raw.trim(), review: true };
  const ucum = UCUM[key];
  if (ucum) return { unit: ucum, review: false };
  return { unit: raw.trim(), review: true };
}

/** Extract ordered strength tokens from a SNOMED FSN-style drug name.
 *  Returns one ParsedStrength per detected token (NOT per ingredient). */
export function parseStrengths(name: string): ParsedStrength[] {
  const out: ParsedStrength[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(name)) !== null) {
    const [raw, valStr, unitRaw, denomValStr, denomUnitRaw] = m;
    const value = Number(valStr);
    const { unit, review } = mapUnit(unitRaw);
    let denomValue: number | null | undefined;
    let denomUnit: string | null | undefined;
    let denomReview = false;
    if (denomUnitRaw) {
      const dkey = denomUnitRaw.toLowerCase();
      denomValue = denomValStr ? Number(denomValStr) : 1;
      if (DENOM_NONUCUM.has(dkey)) {
        denomUnit = denomUnitRaw;
        denomReview = true;
      } else {
        const dm = mapUnit(denomUnitRaw);
        denomUnit = dm.unit;
        denomReview = dm.review;
      }
    }
    const status: StrengthStatus = review || denomReview ? "review" : "parsed";
    out.push({
      raw: raw.trim(),
      value: Number.isFinite(value) ? value : null,
      unit,
      ...(denomUnit ? { denomValue, denomUnit } : {}),
      status,
    });
  }
  return out;
}

/** Worst-case status across a set of strengths (for a generic-level flag). */
export function worstStatus(strengths: ParsedStrength[], expectedCount: number): StrengthStatus {
  if (strengths.length === 0) return "unparsed";
  // count mismatch vs ingredient count is itself a "review" signal
  let status: StrengthStatus = "parsed";
  if (expectedCount > 0 && strengths.length !== expectedCount) status = "review";
  for (const s of strengths) {
    if (s.status === "unparsed") return "unparsed";
    if (s.status === "review") status = "review";
  }
  return status;
}
