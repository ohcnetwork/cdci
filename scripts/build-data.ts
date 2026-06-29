/**
 * CDCI Browser — data build pipeline.
 * TSV (NRCeS flat files) → validated → strength-parsed → joined → bucketed JSON
 * artifacts + client search records + manifest. (CARE ProductKnowledge JSON is
 * generated on demand in the UI from these artifacts — no pre-built export.)
 *
 * Run: npm run build:data   (tsx scripts/build-data.ts)
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readTsv, splitIds, nonEmpty } from "./lib/tsv";
import { parseStrengths, worstStatus } from "./lib/strength";
import { bucketOf } from "../src/lib/shard";
import { loadEnrichments } from "./lib/enrichment";
import type {
  BrandDoc,
  BrandRef,
  BuildManifest,
  GenericDoc,
  Namespace,
  NamedRef,
  ParsedStrength,
  SearchRecord,
  SubstanceDoc,
  SubstanceRef,
} from "../src/lib/types";

const SOURCE_RELEASE_DATE = "2026-06-15"; // NRCeS CDCI Flat File Package release
const SCHEMA_VERSION = 1;
const SRC = "data/source";
const OUT = "public/data";

const BUCKETS = { substance: 16, generic: 64, brand: 256, genericBrands: 64 } as const;
const BRAND_FIRST_PAGE = 24;
const INDIA_NS = "1000189"; // SNOMED CT India national extension namespace marker

function namespaceOf(id: string): Namespace {
  return id.includes(INDIA_NS) ? "india" : "international";
}

/** Parse a brand trade name: "<TradeName> (<ingredients>) <strength> <form>". */
function tradeNameOf(brandName: string): string | undefined {
  const i = brandName.indexOf(" (");
  if (i > 0) return brandName.slice(0, i).trim();
  return undefined;
}

type Issues = {
  errors: string[];
  warnings: string[];
  orphanBrandsNoGeneric: number;
  danglingGenericRefs: number;
};

function main() {
  const t0 = Date.now();
  console.log("→ reading TSV masters from", SRC);

  const substancesT = readTsv(join(SRC, "SubstanceMaster.txt"));
  const genericsT = readTsv(join(SRC, "GenericMaster.txt"));
  const brandsT = readTsv(join(SRC, "BrandMaster.txt"));
  const productsT = readTsv(join(SRC, "ProductMaster.txt"));
  const suppliersT = readTsv(join(SRC, "SupplierMaster.txt"));
  const formsT = readTsv(join(SRC, "DrugFormMaster.txt"));
  const routesT = readTsv(join(SRC, "RouteOfAdministrationMaster.txt"));

  const counts = {
    substance: substancesT.rows.length,
    generic: genericsT.rows.length,
    brand: brandsT.rows.length,
    product: productsT.rows.length,
    supplier: suppliersT.rows.length,
    doseForm: formsT.rows.length,
    route: routesT.rows.length,
  };
  console.log("  counts:", counts);

  const issues: Issues = { errors: [], warnings: [], orphanBrandsNoGeneric: 0, danglingGenericRefs: 0 };

  // community enrichment overlay (kept separate from immutable source)
  const enrichments = loadEnrichments("enrichments");
  let enrichmentsMerged = 0;
  if (enrichments.size) console.log(`  loaded ${enrichments.size} enrichment file(s)`);

  // ── lookup maps ────────────────────────────────────────────────────────────
  const substanceName = new Map<string, string>();
  const substanceRow = new Map<string, Record<string, string>>();
  for (const r of substancesT.rows) {
    const id = r["Identifier"];
    if (!id) continue;
    substanceName.set(id, r["Substance Name"] ?? "");
    substanceRow.set(id, r);
  }
  const formName = new Map<string, string>();
  for (const r of formsT.rows) formName.set(r["Identifier"], r["Dose Form"] ?? "");
  const routeName = new Map<string, string>();
  for (const r of routesT.rows) routeName.set(r["Identifier"], r["RouteOfAdministration"] ?? "");
  const supplier = new Map<string, { id: string; name: string; country?: string }>();
  for (const r of suppliersT.rows)
    supplier.set(r["Identifier"], {
      id: r["Identifier"],
      name: r["Supplier Name"] ?? "",
      country: nonEmpty(r["Country"]),
    });
  const productName = new Map<string, string>();
  for (const r of productsT.rows) productName.set(r["Identifier"], r["Product Name"] ?? "");

  // ── generics (first pass: no brands yet) ────────────────────────────────────
  const genericDocs = new Map<string, GenericDoc>();
  const substanceToGenerics = new Map<string, string[]>();
  const strengthCoverage = { parsed: 0, review: 0, unparsed: 0 };

  for (const r of genericsT.rows) {
    const id = r["Identifier"];
    if (!id) continue;
    const name = r["Generic Name"] ?? "";
    const substanceIds = splitIds(r["Substance Identifier"]);
    const routeIds = splitIds(r["Route of Administration"]);
    const doseFormId = nonEmpty(r["Dose Form"]);

    const strengths: ParsedStrength[] = parseStrengths(name);
    const aligned = strengths.length === substanceIds.length && substanceIds.length > 0;

    const substances: SubstanceRef[] = substanceIds.map((sid, idx) => {
      if (!substanceName.has(sid))
        issues.warnings.push(`generic ${id} → missing substance ${sid}`);
      return {
        id: sid,
        name: substanceName.get(sid) ?? sid,
        isActive: true,
        ...(aligned ? { strength: strengths[idx] } : {}),
      };
    });
    for (const sid of substanceIds) {
      const arr = substanceToGenerics.get(sid);
      if (arr) arr.push(id);
      else substanceToGenerics.set(sid, [id]);
    }

    const routes: NamedRef[] = routeIds.map((rid) => {
      if (!routeName.has(rid)) issues.warnings.push(`generic ${id} → missing route ${rid}`);
      return { id: rid, name: routeName.get(rid) ?? rid };
    });
    let doseForm: NamedRef | undefined;
    if (doseFormId) {
      if (!formName.has(doseFormId))
        issues.warnings.push(`generic ${id} → missing dose form ${doseFormId}`);
      doseForm = { id: doseFormId, name: formName.get(doseFormId) ?? doseFormId };
    }

    const status = worstStatus(strengths, substanceIds.length);
    strengthCoverage[status]++;

    const doc: GenericDoc = {
      type: "generic",
      id,
      name,
      namespace: namespaceOf(id),
      substances,
      routes,
      doseForm,
      strengths,
      strengthParseStatus: status,
      therapeuticRole: nonEmpty(r["Therapeutic Role"]),
      indication: nonEmpty(r["Indication"]),
      contraIndication: nonEmpty(r["Contra Indication"]),
      interactionText: nonEmpty(r["Interaction with Drugs"]),
      classification: nonEmpty(r["Classification of Drugs"]),
      sourceRegulatory: nonEmpty(r["Source/ Regulatory"]),
      lastUpdated: nonEmpty(r["last_updated_on"]),
      brandCount: 0,
      brandsFirstPage: [],
    };

    // overlay community enrichment (non-empty fields override source)
    const e = enrichments.get(id);
    if (e) {
      enrichmentsMerged++;
      if (e.therapeutic_role) doc.therapeuticRole = e.therapeutic_role;
      if (e.indication) doc.indication = e.indication;
      if (e.contra_indication) doc.contraIndication = e.contra_indication;
      if (e.classification) doc.classification = e.classification;
      doc.enrichment = {
        reviewStatus: e.review_status ?? "draft",
        sources: e.sources,
        contributor: e.contributor,
        evidenceType: e.evidence_type,
        updatedAt: e.updated_at,
      };
    }
    genericDocs.set(id, doc);
  }

  // ── brands ──────────────────────────────────────────────────────────────────
  const brandDocs = new Map<string, BrandDoc>();
  const genericToBrands = new Map<string, BrandRef[]>();

  for (const r of brandsT.rows) {
    const id = r["Identifier"];
    if (!id) continue;
    const name = r["Brand Name"] ?? "";
    let genericId = nonEmpty(r["Generic Identifier"]);
    const supplierId = nonEmpty(r["Supplier Identifier"]);
    const productId = nonEmpty(r["Product Identifier"]);
    const trade = tradeNameOf(name);

    // Source-data integrity (NRCeS): some brands reference a generic absent from
    // GenericMaster. Surface as a data-quality issue and drop the broken link so
    // the UI never navigates to a missing concept.
    if (!genericId) {
      issues.orphanBrandsNoGeneric++;
    } else if (!genericDocs.has(genericId)) {
      issues.danglingGenericRefs++;
      issues.warnings.push(`brand ${id} → dangling generic ${genericId}`);
      genericId = undefined;
    }
    if (supplierId && !supplier.has(supplierId))
      issues.warnings.push(`brand ${id} → missing supplier ${supplierId}`);
    if (productId && !productName.has(productId))
      issues.warnings.push(`brand ${id} → missing product ${productId}`);

    const sup = supplierId ? supplier.get(supplierId) : undefined;
    const doc: BrandDoc = {
      type: "brand",
      id,
      name,
      namespace: namespaceOf(id),
      tradeName: trade,
      genericId,
      genericName: genericId ? genericDocs.get(genericId)?.name : undefined,
      supplier: sup,
      product: productId ? { id: productId, name: productName.get(productId) ?? productId } : undefined,
      licenseNumber: nonEmpty(r["License Number"]),
      licenseStatus: nonEmpty(r["License Status"]),
      excipient: nonEmpty(r["Excipient"]),
      lastUpdated: nonEmpty(r["last_updated_on"]),
    };
    brandDocs.set(id, doc);

    if (genericId && genericDocs.has(genericId)) {
      const ref: BrandRef = { id, name, tradeName: trade, supplierName: sup?.name };
      const arr = genericToBrands.get(genericId);
      if (arr) arr.push(ref);
      else genericToBrands.set(genericId, [ref]);
    }
  }

  // attach brand counts + first page to generics
  for (const [gid, refs] of genericToBrands) {
    refs.sort((a, b) => (a.tradeName ?? a.name).localeCompare(b.tradeName ?? b.name));
    const g = genericDocs.get(gid)!;
    g.brandCount = refs.length;
    g.brandsFirstPage = refs.slice(0, BRAND_FIRST_PAGE);
  }

  // ── substances (with reverse index) ─────────────────────────────────────────
  const substanceDocs = new Map<string, SubstanceDoc>();
  let bridgeSeeds = 0;
  for (const r of substancesT.rows) {
    const id = r["Identifier"];
    if (!id) continue;
    const unii = nonEmpty(r["UNII"]);
    const cas = nonEmpty(r["CAS Number"]);
    if (unii || cas) bridgeSeeds++;
    const gids = substanceToGenerics.get(id) ?? [];
    const e = enrichments.get(id);
    let bridge = unii || cas ? { rxcui: [] as string[], atc: [] as string[] } : undefined;
    if (e && (e.rxcui?.length || e.atc?.length)) {
      enrichmentsMerged++;
      bridge = { rxcui: e.rxcui ?? [], atc: e.atc ?? [] };
    }
    substanceDocs.set(id, {
      type: "substance",
      id,
      name: r["Substance Name"] ?? "",
      namespace: namespaceOf(id),
      cas,
      unii,
      description: nonEmpty(r["Substance Description"]),
      toxicity: nonEmpty(r["Toxicity"]),
      molecularWeight: nonEmpty(r["Molecular Weight"]),
      smiles: nonEmpty(r["SMILE"]),
      inchi: nonEmpty(r["InChI"]),
      iupac: nonEmpty(r["IUPAC Name"]),
      molecularFormula: nonEmpty(r["Molecular Formula"]),
      bridge,
      genericIds: gids,
      genericCount: gids.length,
    });
  }

  // ── emit artifacts ──────────────────────────────────────────────────────────
  console.log("→ writing artifacts to", OUT);
  // Scoped cleanup: remove only the drug-owned paths, not the shared public/data
  // root — public/data/labs is produced by the separate labs build and must survive.
  for (const sub of ["concepts", "generic-brands", "search"]) rmSync(join(OUT, sub), { recursive: true, force: true });
  rmSync(join(OUT, "manifest.json"), { force: true });
  for (const sub of ["concepts/substance", "concepts/generic", "concepts/brand", "generic-brands", "search"])
    mkdirSync(join(OUT, sub), { recursive: true });

  writeBuckets(join(OUT, "concepts/substance"), substanceDocs, BUCKETS.substance);
  writeBuckets(join(OUT, "concepts/generic"), genericDocs, BUCKETS.generic);
  writeBuckets(join(OUT, "concepts/brand"), brandDocs, BUCKETS.brand);
  writeBuckets(join(OUT, "generic-brands"), genericToBrands, BUCKETS.genericBrands);

  // search records
  const core: SearchRecord[] = [];
  for (const s of substanceDocs.values()) core.push({ id: s.id, t: "s", n: s.name });
  for (const g of genericDocs.values()) core.push({ id: g.id, t: "g", n: g.name });
  writeFileSync(join(OUT, "search/core.json"), JSON.stringify(core));
  const brandSearch: SearchRecord[] = [...brandDocs.values()].map((b) => ({
    id: b.id,
    t: "b",
    n: b.tradeName ? `${b.tradeName} — ${b.name}` : b.name,
  }));
  writeFileSync(join(OUT, "search/brands.json"), JSON.stringify(brandSearch));

  // CARE ProductKnowledge is generated on demand in the UI (src/lib/care.ts) from the
  // concept docs — no pre-built export artifacts needed.

  // manifest
  const manifest: BuildManifest = {
    schemaVersion: SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    sourceReleaseDate: SOURCE_RELEASE_DATE,
    counts,
    bucketCounts: {
      substance: BUCKETS.substance,
      generic: BUCKETS.generic,
      brand: BUCKETS.brand,
      genericBrands: BUCKETS.genericBrands,
    },
    bridgeCoverage: { substancesMapped: bridgeSeeds, substancesTotal: counts.substance },
    strengthCoverage,
    enrichmentsMerged,
    validation: {
      errors: issues.errors.length,
      warnings: issues.warnings.length,
      orphanBrandsNoGeneric: issues.orphanBrandsNoGeneric,
      danglingGenericRefs: issues.danglingGenericRefs,
    },
  };
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  // ── report ──────────────────────────────────────────────────────────────────
  console.log("\n── build summary ───────────────────────────────");
  console.log("strength coverage:", strengthCoverage);
  console.log("bridge seeds (UNII/CAS present):", bridgeSeeds, "/", counts.substance);
  console.log("validation:", manifest.validation);
  if (issues.warnings.length) {
    console.log(`\n⚠ ${issues.warnings.length} data-quality warnings (first 5):`);
    for (const w of issues.warnings.slice(0, 5)) console.log("  -", w);
  }
  console.log(`\n✓ done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // fail loudly on referential integrity errors (orphan brands w/o generic are expected, ~6)
  if (issues.errors.length > 0) {
    console.error(`\n✗ ${issues.errors.length} referential-integrity errors (see above).`);
    process.exitCode = 1;
  }
}

function writeBuckets<T>(dir: string, items: Map<string, T>, nBuckets: number) {
  const buckets: Record<number, Record<string, T>> = {};
  for (const [id, doc] of items) {
    const b = bucketOf(id, nBuckets);
    (buckets[b] ??= {})[id] = doc;
  }
  for (let b = 0; b < nBuckets; b++) {
    writeFileSync(join(dir, `${b}.json`), JSON.stringify(buckets[b] ?? {}));
  }
}

main();
