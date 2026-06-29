// Runnable checks for the LOINC parse/derive helpers. Run: npx tsx scripts/lib/loinc.test.ts
// Exits non-zero on the first failed assertion so it can gate CI / the build.
import assert from "node:assert/strict";
import { parseCsv, parseFsn, buildLabTest, parseLabCsv } from "./loinc";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

console.log("loinc helpers:");

test("FSN with 6 parts (method) parses all axes + glosses", () => {
  const p = parseFsn("Aspergillus fumigatus Ab.IgE:ACnc:Pt:Ser:Qn:IA");
  assert.equal(p.status, "parsed");
  assert.equal(p.component?.raw, "Aspergillus fumigatus Ab.IgE");
  assert.equal(p.property?.gloss, "Arbitrary concentration");
  assert.equal(p.time?.gloss, "Point in time (single random specimen)");
  assert.equal(p.system?.gloss, "Serum");
  assert.equal(p.scale?.gloss, "Quantitative — reported as a number");
  assert.equal(p.method?.gloss, "Immunoassay");
});

test("FSN with 5 parts (no method) parses, method absent", () => {
  const p = parseFsn("Aspergillus fumigatus Ab.IgE:ACnc:Pt:Ser:Qn");
  assert.equal(p.status, "parsed");
  assert.equal(p.method, undefined);
  assert.equal(p.scale?.raw, "Qn");
});

test("FSN with no colon (LCN-in-FSN row) is unparsed", () => {
  const p = parseFsn("Grey Alder IgE Ab [Units/volume] in Serum");
  assert.equal(p.status, "unparsed");
  assert.equal(p.component, undefined);
});

test("drifted split (colon inside component) is unparsed via scale validation", () => {
  // Lysophosphatidylcholine(16:0):SCnc:Pt:Ser/Plas:Qn → split shifts, parts[4] = "Ser/Plas"
  const p = parseFsn("Lysophosphatidylcholine(16:0):SCnc:Pt:Ser/Plas:Qn");
  assert.equal(p.status, "unparsed");
});

test("valid Set / Nar / OrdQn scales are accepted", () => {
  assert.equal(parseFsn("X:Pn:Pt:Ser:Set").status, "parsed");
  assert.equal(parseFsn("X:Imp:Pt:Ser:Nar").status, "parsed");
  assert.equal(parseFsn("X:PrThr:Pt:Ser:OrdQn").status, "parsed");
});

test("specimen + scale facets derived; unknown specimen passes through", () => {
  const t = buildLabTest("Calcium, Urine", "6874-2", "Calcium:MRat:24H:Urine:Qn", "Calcium [Mass/time] in 24 hour Urine");
  assert.equal(t.specimen, "Urine");
  assert.equal(t.scale, "Quantitative");
  const u = buildLabTest("x", "1-1", "X:MCnc:Pt:Drool:Ord", "x");
  assert.equal(u.specimen, "Drool"); // unknown system token → raw label
  assert.equal(u.scale, "Qualitative / ordinal");
});

test("unparsed row has no specimen/scale facet but still gets categories from text", () => {
  const t = buildLabTest("Grey Alder allergy test", "15284-3", "Grey Alder IgE Ab [Units/volume] in Serum", "Grey Alder IgE Ab [Units/volume] in Serum");
  assert.equal(t.specimen, undefined);
  assert.equal(t.scale, undefined);
  assert.ok(t.categories.includes("Immunology / serology")); // from "IgE Ab"
});

test("category derivation: molecular, microbiology, urinalysis, chemistry fallback", () => {
  const molgen = buildLabTest("BCR-ABL1 transcript", "x", "BCR-ABL1 fusion transcript:ACnc:Pt:Bld:Qn:Molgen", "...");
  assert.ok(molgen.categories.includes("Molecular"));
  const micro = buildLabTest("Blood culture", "x", "Bacteria identified:Prid:Pt:Bld:Nom:Culture", "Bacteria identified in Blood by Culture");
  assert.ok(micro.categories.includes("Microbiology"));
  const urine = buildLabTest("Glucose, Urine", "x", "Glucose:MCnc:Pt:Urine:Qn", "Glucose in Urine");
  assert.ok(urine.categories.includes("Urinalysis"));
  const chem = buildLabTest("Sodium, Serum", "x", "Sodium:SCnc:Pt:Ser:Qn", "Sodium in Serum");
  assert.deepEqual(chem.categories, ["Chemistry"]); // no other signal
});

test("immunoglobulin tokens match only as whole words (no 'shiga' false positive)", () => {
  const shiga = buildLabTest("Escherichia coli shiga-like toxin, Stool", "21262-1", "Shiga-like toxin:PrThr:Pt:Stool:Ord", "Shiga-like toxin in Stool");
  assert.ok(!shiga.categories.includes("Immunology / serology"));
  const igg = buildLabTest("IgG, Serum", "x", "IgG:MCnc:Pt:Ser:Qn", "Immunoglobulin G in Serum");
  assert.ok(igg.categories.includes("Immunology / serology"));
});

test("specimen ^super-system qualifier collapses to the base specimen", () => {
  const ctrl = buildLabTest("x", "x", "X:PrThr:Pt:PPP^Control:Qn", "x");
  assert.equal(ctrl.specimen, "Platelet-poor plasma"); // PPP^Control → base PPP
  const donor = buildLabTest("y", "y", "Y:SCnc:Pt:Plas^Donor:Qn", "y");
  assert.equal(donor.specimen, "Plasma"); // Plas^Donor → base Plas
  const leading = buildLabTest("z", "z", "Z:Num:Pt:^Patient:Qn", "z");
  assert.equal(leading.specimen, "Patient"); // leading caret → super-system label
});

test("CSV parser handles quoted fields with embedded commas + escaped quotes", () => {
  const rows = parseCsv('"a","b,c","d""e"\n"f","g","h"');
  assert.deepEqual(rows[0], ["a", "b,c", 'd"e']);
  assert.deepEqual(rows[1], ["f", "g", "h"]);
});

test("parseLabCsv skips rows missing a LOINC code", () => {
  const { tests, skipped } = parseLabCsv('"General Name","LOINC Code","FSN","LCN"\n"x","","X:MCnc:Pt:Ser:Qn","x"\n"y","1-1","Y:MCnc:Pt:Ser:Qn","y"');
  assert.equal(tests.length, 1);
  assert.equal(tests[0].code, "1-1");
  assert.equal(skipped.length, 1);
});

console.log(`\n✓ ${passed} loinc checks passed`);
