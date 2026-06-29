// Best-effort clinical-discipline classification for lab tests. LOINC's CLCI
// subset doesn't label discipline directly, so we derive it from FSN signals +
// the test names via a transparent, ordered heuristic. A curated override file
// (data/source/clci/categories.json) can replace these per code at build time.
// Always shown in the UI as "derived / best-effort".
import type { LoincParts } from "./types";

export const ALL_CATEGORIES = [
  "Chemistry",
  "Hematology",
  "Coagulation",
  "Microbiology",
  "Immunology / serology",
  "Molecular",
  "Endocrinology",
  "Toxicology",
  "Urinalysis",
] as const;

export interface CategoryInput {
  name: string;
  longCommonName: string;
  parts: LoincParts;
}

/** Derive 0..n disciplines; falls back to "Chemistry" so every test has one. */
export function deriveCategories({ name, longCommonName, parts }: CategoryInput): string[] {
  const cats = new Set<string>();
  const method = parts.method?.raw ?? "";
  const property = parts.property?.raw ?? "";
  const system = parts.system?.raw ?? "";
  const text = `${parts.component?.raw ?? ""} ${longCommonName} ${name}`.toLowerCase();

  if (/molgen|probe\.amp|fish|sequencing|\bpcr\b/i.test(`${method} ${text}`)) {
    cats.add("Molecular");
  }
  if (
    property === "Susc" ||
    property === "Prid" ||
    /culture|gram stain|acid fast|ziehl|mycobacteria|\bstain\b|agar diffusion|\bmic\b/i.test(method) ||
    /\bculture\b|susceptib|colony/i.test(text)
  ) {
    cats.add("Microbiology");
  }
  if (/urine/i.test(system) || /\burine\b|urinalysis/i.test(text)) {
    cats.add("Urinalysis");
  }
  if (
    // \big[game]\b matches standalone IgG/IgA/IgM/IgE only — not substrings like "shiga"
    /\bab\b|\bag\b|\big[game]\b|antibod|antigen|serolog|immunoglobulin|complement|autoantibod/i.test(text)
  ) {
    cats.add("Immunology / serology");
  }
  if (
    /coag/i.test(method) ||
    /\baptt\b|\bptt\b|\binr\b|prothrombin|fibrinogen|d-dimer|platelet aggr|clotting|coagulation|thrombin|antithrombin|factor [ivx]+ activity/i.test(text)
  ) {
    cats.add("Coagulation");
  }
  if (
    /automated count|manual count|sudan black|myeloperoxidase|flow cytometry|westergren|blood film|thick film|thin film/i.test(method) ||
    /leukocyte|erythrocyte|hemoglobin|haemoglobin|hematocrit|platelet|reticulocyte|blood cell|peripheral smear|myelocyte|blast|neutrophil|lymphocyte|monocyte|eosinophil|basophil|sedimentation rate/i.test(text)
  ) {
    cats.add("Hematology");
  }
  if (
    /\btsh\b|cortisol|insulin|testosterone|estradiol|estrogen|oestr|progesterone|thyroxine|triiodothyronine|\bt3\b|\bt4\b|prolactin|\bfsh\b|\blh\b|parathyroid|\bpth\b|\bhormone\b|aldosterone|gonadotropin|growth hormone|\bacth\b|renin|dhea/i.test(text)
  ) {
    cats.add("Endocrinology");
  }
  if (
    /\blead\b|mercury|arsenic|cadmium|alumin[iu]+m|\bcopper\b|\bzinc\b|ethanol|methanol|cocaine|opiate|opioid|cannabin|amphetamine|benzodiazepine|barbiturate|salicylate|acetaminophen|paracetamol|drugs? of abuse|heavy metal/i.test(text)
  ) {
    cats.add("Toxicology");
  }

  if (cats.size === 0) cats.add("Chemistry");
  return [...cats];
}
