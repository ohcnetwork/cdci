// Shared domain types for the CDCI Browser.
// These describe the bucketed JSON artifacts emitted by scripts/build-data.ts
// and consumed by the Next.js app. SNOMED CT SCTIDs are the canonical id everywhere.

export const SNOMED_SYSTEM = "http://snomed.info/sct";
export const UCUM_SYSTEM = "http://unitsofmeasure.org";

export type ConceptType =
  | "substance"
  | "generic"
  | "brand"
  | "product"
  | "supplier"
  | "doseform"
  | "route";

/** FHIR-style Coding, used directly in the CARE ProductKnowledge export. */
export interface Coding {
  system: string;
  code: string;
  display?: string;
}

/** A strength token parsed (best-effort) out of a SNOMED FSN-style name.
 *  `status` makes the provenance explicit — parsed strengths are DERIVED and
 *  must never be presented as authoritative without review. */
export type StrengthStatus = "parsed" | "review" | "unparsed";

export interface ParsedStrength {
  raw: string; // the exact token as found in the name
  value: number | null;
  unit: string | null; // UCUM where confidently mapped, else raw unit
  denomValue?: number | null; // for ratio strengths e.g. 20 mg / 1 mL
  denomUnit?: string | null;
  status: StrengthStatus;
}

export interface SubstanceRef {
  id: string;
  name: string;
  /** strength aligned to this ingredient, when alignment was unambiguous */
  strength?: ParsedStrength;
  isActive: boolean;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface BrandRef {
  id: string;
  name: string;
  tradeName?: string;
  supplierName?: string;
}

/** Provenance/review metadata for community-contributed enrichment. */
export interface EnrichmentMeta {
  reviewStatus: "draft" | "community_reviewed" | "expert_approved";
  sources?: string[];
  contributor?: string;
  evidenceType?: string;
  updatedAt?: string;
}

export type Namespace = "international" | "india";

export interface BaseConcept {
  type: ConceptType;
  id: string; // SCTID
  name: string;
  namespace: Namespace;
  lastUpdated?: string;
}

export interface SubstanceDoc extends BaseConcept {
  type: "substance";
  cas?: string;
  unii?: string;
  description?: string;
  toxicity?: string;
  molecularWeight?: string;
  smiles?: string;
  inchi?: string;
  iupac?: string;
  molecularFormula?: string;
  /** best-effort SNOMED→external bridge (CDSS foundation). May be empty. */
  bridge?: { rxcui?: string[]; atc?: string[] };
  genericIds: string[]; // reverse index: generics that contain this substance
  genericCount: number;
}

export interface GenericDoc extends BaseConcept {
  type: "generic";
  substances: SubstanceRef[]; // resolved combination ingredients (ordered)
  routes: NamedRef[];
  doseForm?: NamedRef;
  strengths: ParsedStrength[]; // derived/unverified, ordered as in the name
  strengthParseStatus: StrengthStatus; // worst-case across ingredients
  // clinical fields (from source TSV, merged with enrichment overlay)
  therapeuticRole?: string;
  indication?: string;
  contraIndication?: string;
  /** reference-only free text from source; NOT a clinical interaction checker */
  interactionText?: string;
  classification?: string;
  sourceRegulatory?: string;
  enrichment?: EnrichmentMeta;
  brandCount: number;
  brandsFirstPage: BrandRef[]; // first page embedded; rest in /generic-brands
}

export interface BrandDoc extends BaseConcept {
  type: "brand";
  tradeName?: string; // marketed name parsed from "<TradeName> (...)"
  genericId?: string;
  genericName?: string;
  supplier?: { id: string; name: string; country?: string };
  product?: { id: string; name: string };
  licenseNumber?: string;
  licenseStatus?: string;
  excipient?: string;
}

export type ConceptDoc = SubstanceDoc | GenericDoc | BrandDoc;

/** A compact record used to build the client-side FlexSearch index. */
export interface SearchRecord {
  id: string;
  t: "s" | "g" | "b" | "p"; // substance|generic|brand|product
  n: string; // display name
}

export interface BuildManifest {
  schemaVersion: number;
  builtAt: string; // ISO timestamp
  sourceReleaseDate: string; // from NRCeS release notes
  counts: Record<string, number>;
  bucketCounts: Record<"substance" | "generic" | "brand" | "genericBrands", number>;
  bridgeCoverage?: { substancesMapped: number; substancesTotal: number };
  strengthCoverage?: { parsed: number; review: number; unparsed: number };
  enrichmentsMerged?: number;
  validation: {
    errors: number;
    warnings: number;
    orphanBrandsNoGeneric: number;
    danglingGenericRefs: number;
  };
}

// ─── CARE ProductKnowledge export (FHIR MedicationKnowledge-aligned) ───────────

export type ProductType = "medication" | "nutritional_product" | "consumable";
export type ProductStatus = "draft" | "active" | "retired" | "unknown";
export type ProductNameType = "trade_name" | "alias" | "original_name" | "preferred";

export interface ProductName {
  name_type: ProductNameType;
  name: string;
}

export interface CareQuantity {
  value: number;
  unit?: Coding;
}

export interface CareStrength {
  // FHIR Ratio (numerator/denominator) and/or a presentation quantity
  ratio?: { numerator?: CareQuantity; denominator?: CareQuantity };
  quantity?: CareQuantity;
}

export interface CareIngredient {
  is_active: boolean;
  substance: Coding;
  strength?: CareStrength;
}

export interface CareProductDefinition {
  dosage_form?: Coding | null;
  intended_routes?: Coding[];
  ingredients?: CareIngredient[];
}

export interface CareProductKnowledge {
  alternate_identifier?: string | null;
  status: ProductStatus;
  product_type: ProductType;
  code?: Coding | null;
  name: string;
  names?: ProductName[];
  base_unit?: Coding | null;
  definitional?: CareProductDefinition | null;
  // CDCI provenance extension (not part of CARE core; carried for trust/audit)
  _cdci?: {
    sctidNamespace: Namespace;
    strengthDerived: boolean;
    reviewStatus: EnrichmentMeta["reviewStatus"];
    sourceReleaseDate: string;
  };
}
