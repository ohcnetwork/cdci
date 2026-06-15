import {
  SNOMED_SYSTEM,
  UCUM_SYSTEM,
  type BrandDoc,
  type CareIngredient,
  type CareProductDefinition,
  type CareProductKnowledge,
  type CareStrength,
  type Coding,
  type GenericDoc,
  type ParsedStrength,
} from "./types";

function snomed(code: string, display?: string): Coding {
  return { system: SNOMED_SYSTEM, code, ...(display ? { display } : {}) };
}

function ucum(unit: string): Coding {
  return { system: UCUM_SYSTEM, code: unit, display: unit };
}

/** Convert a derived ParsedStrength → CARE strength (ratio or quantity).
 *  Returns undefined for unparsed strengths (never emit a fabricated value). */
export function toCareStrength(s: ParsedStrength | undefined): CareStrength | undefined {
  if (!s || s.status === "unparsed" || s.value == null || !s.unit) return undefined;
  if (s.denomUnit) {
    return {
      ratio: {
        numerator: { value: s.value, unit: ucum(s.unit) },
        denominator: { value: s.denomValue ?? 1, unit: ucum(s.denomUnit) },
      },
    };
  }
  return { quantity: { value: s.value, unit: ucum(s.unit) } };
}

function definitionFromGeneric(g: GenericDoc): CareProductDefinition {
  const ingredients: CareIngredient[] = g.substances.map((sub) => ({
    is_active: sub.isActive,
    substance: snomed(sub.id, sub.name),
    ...(toCareStrength(sub.strength) ? { strength: toCareStrength(sub.strength) } : {}),
  }));
  return {
    dosage_form: g.doseForm ? snomed(g.doseForm.id, g.doseForm.name) : null,
    intended_routes: g.routes.map((r) => snomed(r.id, r.name)),
    ingredients,
  };
}

export function genericToCare(g: GenericDoc, sourceReleaseDate: string): CareProductKnowledge {
  const strengthDerived = g.substances.some((s) => s.strength && s.strength.status !== "unparsed");
  return {
    status: "draft", // trust control: nothing ships as "active" without curation
    product_type: "medication",
    code: snomed(g.id, g.name),
    name: g.name,
    names: [{ name_type: "preferred", name: g.name }],
    base_unit: null,
    definitional: definitionFromGeneric(g),
    _cdci: {
      sctidNamespace: g.namespace,
      strengthDerived,
      reviewStatus: g.enrichment?.reviewStatus ?? "draft",
      sourceReleaseDate,
    },
  };
}

export function brandToCare(
  b: BrandDoc,
  genericDef: CareProductDefinition | undefined,
  strengthDerived: boolean,
  sourceReleaseDate: string,
): CareProductKnowledge {
  const display = b.tradeName ?? b.name;
  const names = [
    { name_type: "trade_name" as const, name: display },
    { name_type: "original_name" as const, name: b.name },
  ];
  return {
    status: "draft",
    product_type: "medication",
    code: snomed(b.id, b.name),
    name: display,
    names,
    base_unit: null,
    definitional: genericDef ?? null,
    _cdci: {
      sctidNamespace: b.namespace,
      strengthDerived,
      reviewStatus: "draft",
      sourceReleaseDate,
    },
  };
}
